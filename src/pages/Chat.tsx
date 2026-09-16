import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent as ReactClipboardEvent,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent,
} from 'react'
import { Link } from 'react-router-dom'
import {
  AtSign,
  CornerUpLeft,
  ImagePlus,
  MessageCircle,
  Mic,
  Paperclip,
  Phone,
  Send,
  SmilePlus,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react'
import { AppHeader } from '../components/AppShell'
import { VoiceBubble } from '../components/VoiceBubble'
import { useCalls } from '../components/CallLayer'
import {
  Avatar,
  Button,
  CodeChip,
  Empty,
  ErrorBox,
  IconButton,
  Input,
  Loading,
  Modal,
  useToast,
} from '../components/ui'
import { useProject } from './ProjectLayout'
import {
  deleteMessage,
  getItemsByIds,
  listItems,
  listMessages,
  loadMessageExtras,
  markRead,
  sendMessage,
  toggleReaction,
  type ChatMessage,
} from '../lib/api'
import { supabase } from '../lib/supabase'
import { notifyProject } from '../lib/push'
import { displayNameOf, useAuth } from '../lib/auth'
import { compressImage, extOf, signedUrls, uploadTo, VoiceRecorder } from '../lib/media'
import { STATUS_COLOR, STATUS_LABEL, type Item, type Message, type MessageReaction, type Tag } from '../lib/types'
import { chatDayLabel, contrastOn, cx, fmtDuration, fmtTime, uid } from '../lib/util'

const EMOJIS = ['👍', '❤️', '😂', '😮', '🙏', '✅']
const REF_RE = /\[\[(item|tag):([0-9a-fA-F-]{36})\|([^\]]*)\]\]/g
const MAX_UPLOAD = 25 * 1024 * 1024

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** Dateien aus einem Drop oder aus der Zwischenablage holen. Safari liefert
 *  eingefuegte Bilder nur ueber items, Chrome und Firefox ueber files. */
function filesFrom(dt: DataTransfer | null): File[] {
  if (!dt) return []
  const out = Array.from(dt.files ?? [])
  if (out.length > 0) return out
  for (const entry of Array.from(dt.items ?? [])) {
    if (entry.kind !== 'file') continue
    const f = entry.getAsFile()
    if (f) out.push(f)
  }
  return out
}

/** Haengt an dem, was gerade ueber dem Fenster schwebt, ueberhaupt eine Datei?
 *  Reiner Text soll die Ueberlagerung nicht ausloesen. */
function dragHasFiles(dt: DataTransfer | null): boolean {
  return Array.from(dt?.types ?? []).includes('Files')
}

/** Eine Datei, die noch nicht abgeschickt ist. */
interface Pending {
  id: string
  file: File
  name: string
  /** Objekt-URL fuer die Vorschau, nur bei Bildern. Wird beim Entfernen und
   *  nach dem Senden wieder freigegeben. */
  preview: string | null
}

/* -------------------------------------------------------- Textbausteine */

function MessageText({
  body,
  projectId,
  own,
}: {
  body: string
  projectId: string
  own: boolean
}) {
  const parts: Array<string | { type: 'item' | 'tag'; id: string; label: string }> = []
  let last = 0
  for (const m of body.matchAll(REF_RE)) {
    if (m.index! > last) parts.push(body.slice(last, m.index))
    parts.push({ type: m[1] as 'item' | 'tag', id: m[2], label: m[3] })
    last = m.index! + m[0].length
  }
  if (last < body.length) parts.push(body.slice(last))

  return (
    <span className="whitespace-pre-wrap break-words">
      {parts.map((p, i) =>
        typeof p === 'string' ? (
          <span key={i}>{p}</span>
        ) : (
          <Link
            key={i}
            to={
              p.type === 'item'
                ? `/app/p/${projectId}/kisten/${p.id}`
                : `/app/p/${projectId}/kisten?room=${p.id}&person=${p.id}`
            }
            className={cx(
              't-serial mx-0.5 inline-flex items-center rounded-md px-1.5 py-0.5 text-[1em] underline decoration-dotted',
              own ? 'bg-paper/20' : 'bg-ink/10',
            )}
          >
            {p.label}
          </Link>
        ),
      )}
    </span>
  )
}

/** Kompakte Karte unter der Nachricht: ein Tipp fuehrt direkt zur Kiste. */
function LinkPreview({
  item,
  projectId,
  color,
  roomName,
}: {
  item: Item
  projectId: string
  color: string
  roomName?: string
}) {
  return (
    <Link
      to={`/app/p/${projectId}/kisten/${item.id}`}
      className="mt-1 flex items-stretch overflow-hidden rounded-xl border border-line bg-surface text-ink transition hover:bg-raised"
    >
      <span className="w-1.5 shrink-0" style={{ background: color }} />
      <span className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2">
        <CodeChip code={item.code} size="md" />
        <span className="min-w-0 flex-1">
          <span className="t-name block truncate">{item.title || roomName || 'Kiste'}</span>
          <span className="block text-sm font-semibold" style={{ color: STATUS_COLOR[item.status] }}>
            {STATUS_LABEL[item.status]}
          </span>
        </span>
      </span>
    </Link>
  )
}

/* ------------------------------------------------------------ Verweise */

function RefPicker({
  open,
  onClose,
  onPick,
  projectId,
  tags,
}: {
  open: boolean
  onClose: () => void
  onPick: (kind: 'item' | 'tag', id: string, label: string) => void
  projectId: string
  tags: Tag[]
}) {
  const [q, setQ] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!open) return
    let alive = true
    setLoading(true)
    setError(null)
    const t = setTimeout(() => {
      void listItems(projectId, { search: q, limit: 25 })
        .then((r) => {
          if (alive) setItems(r.rows)
        })
        .catch((err: unknown) => {
          // Eine gescheiterte Suche darf nicht wie ein leeres Ergebnis aussehen.
          if (!alive) return
          setItems([])
          setError(errText(err))
        })
        .finally(() => {
          if (alive) setLoading(false)
        })
    }, 220)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [q, open, projectId, retry])

  const matchedTags = tags.filter(
    (t) =>
      !q ||
      t.name.toLowerCase().includes(q.toLowerCase()) ||
      t.short.toLowerCase().includes(q.toLowerCase()),
  )

  return (
    <Modal open={open} onClose={onClose} title="Kiste oder Bereich verlinken">
      <Input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Nummer, Titel oder Zimmer suchen"
      />
      <div className="mt-3 max-h-[50vh] space-y-1 overflow-y-auto">
        {error ? (
          <ErrorBox error={error} onRetry={() => setRetry((n) => n + 1)} />
        ) : null}
        {matchedTags.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              onPick('tag', t.id, t.name)
              onClose()
            }}
            className="flex w-full items-center gap-2 rounded-xl border border-line bg-surface px-2 py-2 text-left hover:bg-raised"
          >
            <span
              className="t-serial flex h-10 min-w-10 shrink-0 items-center justify-center rounded-lg px-1.5 text-base"
              style={{ background: t.color, color: contrastOn(t.color) }}
            >
              {t.short}
            </span>
            <span className="t-name min-w-0 flex-1 truncate">{t.name}</span>
            <span className="shrink-0 text-sm text-muted">
              {t.kind === 'room' ? 'Zimmer' : 'Person'}
            </span>
          </button>
        ))}
        {loading ? <Loading label="sucht" /> : null}
        {items.map((i) => (
          <button
            key={i.id}
            onClick={() => {
              onPick('item', i.id, i.code)
              onClose()
            }}
            className="flex w-full items-center gap-2 rounded-xl border border-line bg-surface px-2 py-2 text-left hover:bg-raised"
          >
            <CodeChip code={i.code} size="md" />
            <span className="t-name min-w-0 flex-1 truncate">{i.title || 'Kiste'}</span>
          </button>
        ))}
        {!loading && !error && items.length === 0 && matchedTags.length === 0 ? (
          <p className="py-6 text-center text-base text-muted">Nichts gefunden.</p>
        ) : null}
      </div>
    </Modal>
  )
}

/* ---------------------------------------------------------------- Seite */

export default function Chat() {
  const { project, tags, members, clearUnread } = useProject()
  const { user, profile } = useAuth()
  const toast = useToast()
  const calls = useCalls()
  const uidSelf = user?.id ?? ''

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [olderBusy, setOlderBusy] = useState(false)
  const [attachments, setAttachments] = useState<Pending[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recSeconds, setRecSeconds] = useState(0)
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map())
  const [linkedItems, setLinkedItems] = useState<Map<string, Item>>(new Map())
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [menuFor, setMenuFor] = useState<string | null>(null)

  const listRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const recorderRef = useRef<VoiceRecorder | null>(null)
  const pendingLinks = useRef<Array<{ target_type: 'item' | 'tag'; target_id: string; label: string }>>([])
  /* Ziehen ueber ein Kindelement loest erneut dragenter aus. Ohne Zaehler
   * flackert die Ueberlagerung, darum wird mitgezaehlt statt geraten. */
  const dragDepth = useRef(0)
  const attachRef = useRef<Pending[]>([])

  const nameOf = useCallback(
    (id: string | null) => displayNameOf(members.find((m) => m.user_id === id)?.profile, 'Jemand'),
    [members],
  )

  const scrollDown = useCallback((smooth = false) => {
    const el = listRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
    })
  }, [])

  /* ------------------------------------------------------------ Anhaenge */

  /** Der einzige Weg, auf dem Dateien in den Chat kommen. Bildknopf, Ziehen
   *  und Einfuegen landen alle hier, damit es nur eine Fassung gibt. */
  const addFiles = useCallback(
    (list: File[]) => {
      const taken: Pending[] = []
      for (const file of list) {
        const name = file.name || (file.type.startsWith('image/') ? 'Bild.png' : 'Datei')
        if (file.size > MAX_UPLOAD) {
          toast(`${name} ist zu gross. Hoechstens 25 MB.`, 'error')
          continue
        }
        taken.push({
          id: uid(),
          file,
          name,
          preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        })
      }
      if (taken.length === 0) return
      setAttachments((prev) => [...prev, ...taken])
    },
    [toast],
  )

  const dropAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const hit = prev.find((a) => a.id === id)
      if (hit?.preview) URL.revokeObjectURL(hit.preview)
      return prev.filter((a) => a.id !== id)
    })
  }, [])

  useEffect(() => {
    attachRef.current = attachments
  }, [attachments])

  useEffect(
    () => () => {
      for (const a of attachRef.current) if (a.preview) URL.revokeObjectURL(a.preview)
    },
    [],
  )

  /* Einfuegen ausserhalb des Eingabefeldes, damit ein Bildschirmfoto auch
   * dann ankommt, wenn der Schreibbalken nicht im Fokus ist. */
  useEffect(() => {
    function onDocPaste(e: ClipboardEvent) {
      if (e.defaultPrevented) return
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.isContentEditable)) return
      const files = filesFrom(e.clipboardData)
      if (files.length === 0) return
      e.preventDefault()
      addFiles(files)
    }
    document.addEventListener('paste', onDocPaste)
    return () => document.removeEventListener('paste', onDocPaste)
  }, [addFiles])

  function onPasteInput(e: ReactClipboardEvent<HTMLTextAreaElement>) {
    const files = filesFrom(e.clipboardData)
    if (files.length === 0) return
    // Ein Bild in der Zwischenablage soll ein Bild bleiben, kein Text werden.
    e.preventDefault()
    addFiles(files)
  }

  function onDragEnter(e: ReactDragEvent<HTMLDivElement>) {
    if (!dragHasFiles(e.dataTransfer)) return
    dragDepth.current += 1
    setDragOver(true)
  }

  function onDragOver(e: ReactDragEvent<HTMLDivElement>) {
    if (!dragHasFiles(e.dataTransfer)) return
    // Ohne preventDefault laesst der Browser gar nichts fallen.
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  function onDragLeave(e: ReactDragEvent<HTMLDivElement>) {
    if (!dragHasFiles(e.dataTransfer)) return
    dragDepth.current -= 1
    if (dragDepth.current <= 0) {
      dragDepth.current = 0
      setDragOver(false)
    }
  }

  function onDrop(e: ReactDragEvent<HTMLDivElement>) {
    // Erst aufraeumen, sonst bleibt die Ueberlagerung nach einem Textwurf stehen.
    const hadFiles = dragHasFiles(e.dataTransfer)
    dragDepth.current = 0
    setDragOver(false)
    // Gezogener Text darf weiter ganz normal im Schreibfeld landen.
    if (!hadFiles) return
    e.preventDefault()
    const files = filesFrom(e.dataTransfer)
    if (files.length === 0) {
      toast('Da war keine Datei dabei.', 'error')
      return
    }
    addFiles(files)
  }

  const loadLinked = useCallback(async (list: ChatMessage[]) => {
    const ids = list.flatMap((m) => m.links.filter((l) => l.target_type === 'item').map((l) => l.target_id))
    if (ids.length === 0) return
    const found = await getItemsByIds(ids)
    if (found.size) setLinkedItems((prev) => new Map([...prev, ...found]))
  }, [])

  const loadImages = useCallback(async (list: ChatMessage[]) => {
    const paths = list
      .filter((m) => (m.kind === 'image' || m.kind === 'file') && m.attachment_path)
      .map((m) => m.attachment_path!)
    if (paths.length === 0) return
    const urls = await signedUrls('chat-media', paths)
    setImageUrls((prev) => new Map([...prev, ...urls]))
  }, [])

  /* ------------------------------------------------------------ laden */
  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    void listMessages(project.id)
      .then(async (list) => {
        if (!alive) return
        setMessages(list)
        setHasMore(list.length >= 40)
        await loadImages(list)
        await loadLinked(list)
        scrollDown()
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [project.id, reloadKey, loadImages, loadLinked, scrollDown])

  useEffect(() => {
    if (!uidSelf) return
    clearUnread()
    void markRead(project.id, uidSelf)
  }, [project.id, uidSelf, messages.length, clearUnread])

  /* --------------------------------------------------------- Realtime */
  useEffect(() => {
    const ch = supabase
      .channel(`chat-${project.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `project_id=eq.${project.id}` },
        async (payload) => {
          const m = payload.new as Message
          setMessages((prev) =>
            prev.some((x) => x.id === m.id) ? prev : [...prev, { ...m, reactions: [], links: [] }],
          )
          // Das Nachladen von Bild und Verweis darf nicht stumm scheitern,
          // sonst steht eine leere Blase da und niemand weiss warum.
          try {
            if (m.attachment_path) await loadImages([{ ...m, reactions: [], links: [] }])
            const extras = await loadMessageExtras([m.id])
            if (extras.links.length) {
              setMessages((prev) =>
                prev.map((x) => (x.id === m.id ? { ...x, links: extras.links } : x)),
              )
              await loadLinked([{ ...m, reactions: [], links: extras.links }])
            }
          } catch (err) {
            toast(`Neue Nachricht nur teilweise geladen: ${errText(err)}`, 'error')
          }
          scrollDown(true)
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `project_id=eq.${project.id}` },
        (payload) => {
          const m = payload.new as Message
          setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...m } : x)))
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reactions', filter: `project_id=eq.${project.id}` },
        (payload) => {
          const row = (payload.new ?? payload.old) as MessageReaction
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== row.message_id) return m
              if (payload.eventType === 'INSERT') {
                const exists = m.reactions.some(
                  (r) => r.user_id === row.user_id && r.emoji === row.emoji,
                )
                return exists ? m : { ...m, reactions: [...m.reactions, row] }
              }
              return {
                ...m,
                reactions: m.reactions.filter(
                  (r) => !(r.user_id === row.user_id && r.emoji === row.emoji),
                ),
              }
            }),
          )
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(ch)
    }
  }, [project.id, loadImages, loadLinked, scrollDown, toast])

  /* ---------------------------------------------------------- senden */
  async function pushNotice(body: string) {
    await notifyProject(
      project.id,
      {
        title: `${displayNameOf(profile, 'Neue Nachricht')} . ${project.name}`,
        body,
        type: 'chat',
        tag: `chat-${project.id}`,
        url: `/app/p/${project.id}/chat`,
      },
      members.map((m) => m.user_id).filter((id) => id !== uidSelf),
    )
  }

  /* Die eigene Nachricht sofort anzeigen, statt auf den Rueckweg ueber
   * Realtime zu warten. Kommt sie von dort noch einmal, faengt die Pruefung
   * auf die Kennung das ab. Ohne das wirkt der Chat traege, und bei
   * gestoerter Verbindung erscheint die eigene Nachricht gar nicht. */
  const appendOwn = useCallback(
    async (m: Message) => {
      const frisch: ChatMessage = { ...m, reactions: [], links: [] }
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, frisch]))
      scrollDown(true)
      if (m.attachment_path) await loadImages([frisch])
      const extras = await loadMessageExtras([m.id])
      if (extras.links.length) {
        const mitLinks: ChatMessage = { ...frisch, links: extras.links }
        setMessages((prev) => prev.map((x) => (x.id === m.id ? mitLinks : x)))
        await loadLinked([mitLinks])
      }
    },
    [scrollDown, loadImages, loadLinked],
  )

  /** Hochladen und abschicken. Eine Stelle fuer jede Datei, egal woher sie
   *  kommt. */
  async function sendOneFile(a: Pending, replyId: string | null) {
    const isImage = a.file.type.startsWith('image/')
    const blob = isImage ? await compressImage(a.file, 1800, 0.85) : a.file
    const path = `${project.id}/${uid()}.${isImage ? 'jpg' : extOf({ name: a.name, type: a.file.type })}`
    await uploadTo('chat-media', path, blob, isImage ? 'image/jpeg' : a.file.type)
    const gesendet = await sendMessage({
      project_id: project.id,
      kind: isImage ? 'image' : 'file',
      body: isImage ? null : a.name,
      attachment_path: path,
      attachment_meta: { size: blob.size, name: a.name, type: a.file.type },
      reply_to: replyId,
    })
    await appendOwn(gesendet)
    void pushNotice(isImage ? 'Bild' : a.name)
  }

  async function onSend() {
    const body = text.trim()
    const queue = attachments
    if (sending || (!body && queue.length === 0)) return
    setSending(true)
    // Die Antwort haengt an der ersten Nachricht, sonst waere sie mehrfach da.
    let replyId = replyTo?.id ?? null
    let clean = true

    for (const a of queue) {
      try {
        await sendOneFile(a, replyId)
        replyId = null
        dropAttachment(a.id)
      } catch (err) {
        clean = false
        toast(`${a.name}: ${errText(err)}`, 'error')
      }
    }

    if (body) {
      const links = pendingLinks.current.filter((l) => body.includes(l.target_id))
      try {
        const gesendet = await sendMessage({
          project_id: project.id,
          body,
          kind: 'text',
          reply_to: replyId,
          links,
        })
        await appendOwn(gesendet)
        setText('')
        pendingLinks.current = []
        void pushNotice(body.replace(REF_RE, '$3').slice(0, 120))
      } catch (err) {
        clean = false
        toast(errText(err), 'error')
      }
    }

    if (clean) setReplyTo(null)
    setSending(false)
  }

  function onPickFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    e.target.value = ''
    if (files?.length) addFiles(Array.from(files))
  }

  function onDelete(id: string) {
    void deleteMessage(id).catch((err) => toast(errText(err), 'error'))
  }

  async function startRecording() {
    if (!VoiceRecorder.supported()) {
      toast('Dieser Browser kann keine Sprachnachrichten aufnehmen.', 'error')
      return
    }
    const rec = new VoiceRecorder()
    recorderRef.current = rec
    try {
      await rec.start()
      setRecording(true)
      setRecSeconds(0)
    } catch (err) {
      recorderRef.current = null
      toast(
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Zugriff auf das Mikrofon wurde abgelehnt.'
          : `Aufnahme nicht moeglich: ${errText(err)}`,
        'error',
      )
    }
  }

  useEffect(() => {
    if (!recording) return
    const t = setInterval(() => setRecSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [recording])

  async function stopRecording(send: boolean) {
    const rec = recorderRef.current
    if (!rec) return
    setRecording(false)
    if (!send) {
      rec.cancel()
      recorderRef.current = null
      return
    }
    try {
      const { blob, seconds, mimeType } = await rec.stop()
      recorderRef.current = null
      if (seconds < 0.7) {
        toast('Zu kurz. Halte den Knopf gedrueckt, solange du sprichst.', 'info')
        return
      }
      const path = `${project.id}/${uid()}.${extOf({ type: mimeType }, 'webm')}`
      await uploadTo('chat-media', path, blob, mimeType)
      const gesendet = await sendMessage({
        project_id: project.id,
        kind: 'voice',
        attachment_path: path,
        attachment_meta: { seconds: Math.round(seconds), type: mimeType, size: blob.size },
        reply_to: replyTo?.id ?? null,
      })
      await appendOwn(gesendet)
      setReplyTo(null)
      void pushNotice(`Sprachnachricht, ${fmtDuration(seconds)}`)
    } catch (err) {
      recorderRef.current = null
      toast(errText(err), 'error')
    }
  }

  async function loadOlder() {
    const first = messages[0]
    if (!first || olderBusy) return
    setOlderBusy(true)
    try {
      const older = await listMessages(project.id, first.created_at)
      if (older.length === 0) {
        setHasMore(false)
        return
      }
      setMessages((prev) => [...older, ...prev])
      await loadImages(older)
      await loadLinked(older)
      setHasMore(older.length >= 40)
    } catch (err) {
      toast(errText(err), 'error')
    } finally {
      setOlderBusy(false)
    }
  }

  function insertRef(kind: 'item' | 'tag', id: string, label: string) {
    pendingLinks.current.push({ target_type: kind, target_id: id, label })
    setText((t) => `${t}${t && !t.endsWith(' ') ? ' ' : ''}[[${kind}:${id}|${label}]] `)
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) {
      e.preventDefault()
      void onSend()
    }
  }

  const grouped = useMemo(() => {
    const out: Array<{ day: string; items: ChatMessage[] }> = []
    for (const m of messages) {
      const day = chatDayLabel(m.created_at)
      const last = out[out.length - 1]
      if (last && last.day === day) last.items.push(m)
      else out.push({ day, items: [m] })
    }
    return out
  }, [messages])

  return (
    /* Die Hoehe laesst der unteren Navigationsleiste ihren Platz, sonst
     * verschwindet die Eingabezeile dahinter. */
    <div
      className="relative flex h-[calc(100dvh-5.5rem)] flex-col"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <AppHeader
        title={project.name}
        subtitle={`${members.length} Mitglieder`}
        back={`/app/p/${project.id}`}
        actions={
          <>
            <IconButton
              label="Anrufen"
              size="sm"
              onClick={() => void calls.start(false)}
              disabled={calls.busy || calls.inCall}
            >
              <Phone size={20} />
            </IconButton>
            <IconButton
              label="Videoanruf"
              size="sm"
              onClick={() => void calls.start(true)}
              disabled={calls.busy || calls.inCall}
            >
              <Video size={20} />
            </IconButton>
          </>
        }
      />

      {/* Ueberlagerung, solange etwas ueber dem Fenster haengt. Sie nimmt
          keine Zeigerereignisse an, sonst gingen die Zaehler durcheinander. */}
      {dragOver ? (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-ink/75 p-6 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-3xl border-4 border-dashed border-paper/70 px-8 py-10 text-center text-paper">
            <Upload size={48} />
            <p className="t-name-lg">Loslassen zum Senden</p>
            <p className="text-base text-paper/80">Bilder und Dateien einfach hier fallen lassen.</p>
          </div>
        </div>
      ) : null}

      {/* Verlauf */}
      <div ref={listRef} className="scrollbar-thin flex-1 overflow-y-auto px-3 py-3">
        <div className="mx-auto max-w-2xl">
          {loading ? <Loading label="Nachrichten" /> : null}

          {error ? (
            <ErrorBox error={error} onRetry={() => setReloadKey((k) => k + 1)} />
          ) : null}

          {!loading && !error && messages.length === 0 ? (
            <div className="mt-10">
              <Empty
                icon={<MessageCircle size={40} />}
                title="Noch keine Nachricht"
                hint="Hier besprecht ihr den Umzug. Du kannst Kisten und Zimmer verlinken, Bilder hereinziehen oder einfach einfuegen."
              />
            </div>
          ) : null}

          {hasMore && messages.length > 0 ? (
            <div className="mb-3 flex justify-center">
              <Button
                size="sm"
                variant="outline"
                loading={olderBusy}
                onClick={() => void loadOlder()}
              >
                Aeltere Nachrichten
              </Button>
            </div>
          ) : null}

          {grouped.map((group) => (
            <div key={group.day}>
              <div className="my-3 flex justify-center">
                <span className="rounded-full bg-raised px-3 py-1 text-sm font-bold text-muted">
                  {group.day}
                </span>
              </div>

              {group.items.map((m) => {
                const own = m.sender_id === uidSelf
                const replied = m.reply_to ? messages.find((x) => x.id === m.reply_to) : null
                const grouping = m.reactions.reduce<Record<string, MessageReaction[]>>((acc, r) => {
                  ;(acc[r.emoji] ??= []).push(r)
                  return acc
                }, {})

                if (m.kind === 'system' || m.kind === 'call') {
                  return (
                    <div key={m.id} className="my-2 flex justify-center">
                      <span className="max-w-full break-words rounded-full bg-raised px-3 py-1.5 text-center text-base text-muted">
                        {m.kind === 'call' ? '📞 ' : ''}
                        {m.body}
                      </span>
                    </div>
                  )
                }

                return (
                  <div
                    key={m.id}
                    className={cx('mb-3 flex gap-2', own ? 'justify-end' : 'justify-start')}
                  >
                    {!own ? <Avatar name={nameOf(m.sender_id)} size={32} /> : null}

                    <div className="min-w-0 max-w-[85%]">
                      {!own ? (
                        <p className="t-name mb-1 truncate px-1 text-ink">{nameOf(m.sender_id)}</p>
                      ) : null}

                      <div
                        className={cx(
                          'rounded-2xl px-3.5 py-2.5 text-base shadow-sm',
                          own
                            ? 'rounded-br-md bg-ink text-paper'
                            : 'rounded-bl-md border border-line bg-surface text-ink',
                        )}
                      >
                        {replied ? (
                          <div
                            className={cx(
                              'mb-2 rounded-lg border-l-2 px-2 py-1.5 text-sm',
                              own ? 'border-paper/50 bg-paper/10' : 'border-ink/30 bg-raised',
                            )}
                          >
                            <span className="block truncate text-base font-bold opacity-80">
                              {nameOf(replied.sender_id)}
                            </span>
                            <span className="line-clamp-2 opacity-70">
                              {replied.deleted_at
                                ? 'geloescht'
                                : (replied.body?.replace(REF_RE, '$3') ??
                                  (replied.kind === 'voice'
                                    ? 'Sprachnachricht'
                                    : replied.kind === 'image'
                                      ? 'Bild'
                                      : ''))}
                            </span>
                          </div>
                        ) : null}

                        {m.deleted_at ? (
                          <span className="italic opacity-60">Nachricht geloescht</span>
                        ) : m.kind === 'voice' && m.attachment_path ? (
                          <VoiceBubble
                            path={m.attachment_path}
                            seconds={Number(m.attachment_meta?.seconds ?? 0)}
                            own={own}
                          />
                        ) : m.kind === 'image' && m.attachment_path ? (
                          <button
                            onClick={() => {
                              const u = imageUrls.get(m.attachment_path!)
                              if (u) setLightbox(u)
                              else toast('Das Bild ist gerade nicht erreichbar.', 'error')
                            }}
                            aria-label="Bild gross anzeigen"
                            title="Bild gross anzeigen"
                            className="block overflow-hidden rounded-xl"
                          >
                            {imageUrls.get(m.attachment_path) ? (
                              <img
                                src={imageUrls.get(m.attachment_path)}
                                alt="Bild"
                                className="max-h-72 w-full rounded-xl object-cover"
                              />
                            ) : (
                              <span className="block h-40 w-52 animate-pulse-soft rounded-xl bg-raised" />
                            )}
                          </button>
                        ) : m.kind === 'file' && m.attachment_path ? (
                          <Button
                            variant={own ? 'soft' : 'outline'}
                            size="sm"
                            className="max-w-full"
                            onClick={() => {
                              const u = imageUrls.get(m.attachment_path!)
                              if (!u) {
                                toast('Die Datei ist gerade nicht erreichbar.', 'error')
                                return
                              }
                              window.open(u, '_blank', 'noopener')
                            }}
                          >
                            <Paperclip size={16} className="shrink-0" />
                            <span className="min-w-0 truncate">{m.body ?? 'Datei'}</span>
                          </Button>
                        ) : (
                          <MessageText body={m.body ?? ''} projectId={project.id} own={own} />
                        )}

                        <div
                          className={cx(
                            'mt-1 flex items-center justify-end gap-1.5 text-sm',
                            own ? 'text-paper/70' : 'text-muted',
                          )}
                        >
                          {m.edited_at ? <span>bearbeitet</span> : null}
                          {fmtTime(m.created_at)}
                        </div>
                      </div>

                      {/* Verlinkte Kisten als antippbare Karte */}
                      {m.links
                        .filter((l) => l.target_type === 'item' && linkedItems.has(l.target_id))
                        .slice(0, 3)
                        .map((l) => {
                          const it = linkedItems.get(l.target_id)!
                          const room = tags.find((t) => t.id === it.room_id)
                          const person = tags.find((t) => t.id === it.person_id)
                          return (
                            <LinkPreview
                              key={l.id}
                              item={it}
                              projectId={project.id}
                              color={room?.color ?? person?.color ?? '#94a3b8'}
                              roomName={room?.name ?? person?.name}
                            />
                          )
                        })}

                      {/* Reaktionen */}
                      {Object.keys(grouping).length > 0 ? (
                        <div className={cx('mt-1 flex flex-wrap gap-1', own && 'justify-end')}>
                          {Object.entries(grouping).map(([emoji, list]) => {
                            const mine = list.some((r) => r.user_id === uidSelf)
                            return (
                              <button
                                key={emoji}
                                onClick={() =>
                                  void toggleReaction(project.id, m.id, emoji, !mine).catch((err) =>
                                    toast(errText(err), 'error'),
                                  )
                                }
                                aria-label={`${emoji} ${list.length}, antippen zum Aendern`}
                                className={cx(
                                  'rounded-full border-2 px-2.5 py-1 text-sm font-bold transition active:scale-95',
                                  mine
                                    ? 'border-ink bg-raised text-ink'
                                    : 'border-line bg-surface text-ink hover:border-ink/35',
                                )}
                              >
                                {emoji} {list.length}
                              </button>
                            )
                          })}
                        </div>
                      ) : null}

                      {/* Aktionen. Stehen fest in der Reihe, damit sie auch am
                          Telefon ohne Zeiger erreichbar bleiben. */}
                      {!m.deleted_at ? (
                        <div className={cx('mt-1.5 flex gap-1.5', own && 'justify-end')}>
                          <IconButton
                            label="Reagieren"
                            size="sm"
                            onClick={() => setMenuFor(menuFor === m.id ? null : m.id)}
                          >
                            <SmilePlus size={18} />
                          </IconButton>
                          <IconButton label="Antworten" size="sm" onClick={() => setReplyTo(m)}>
                            <CornerUpLeft size={18} />
                          </IconButton>
                          {own ? (
                            <IconButton
                              label="Nachricht loeschen"
                              tone="danger"
                              size="sm"
                              onClick={() => onDelete(m.id)}
                            >
                              <Trash2 size={18} />
                            </IconButton>
                          ) : null}
                        </div>
                      ) : null}

                      {menuFor === m.id ? (
                        <div
                          className={cx(
                            'mt-1.5 flex flex-wrap gap-1.5 rounded-2xl border border-line bg-surface p-2 shadow-lg',
                            own && 'justify-end',
                          )}
                        >
                          {EMOJIS.map((e) => (
                            <button
                              key={e}
                              onClick={() => {
                                const mine = m.reactions.some(
                                  (r) => r.user_id === uidSelf && r.emoji === e,
                                )
                                void toggleReaction(project.id, m.id, e, !mine).catch((err) =>
                                  toast(errText(err), 'error'),
                                )
                                setMenuFor(null)
                              }}
                              aria-label={`Mit ${e} reagieren`}
                              title={`Mit ${e} reagieren`}
                              className="rounded-xl border-2 border-line bg-paper px-2.5 py-1.5 text-xl transition hover:border-ink/35 hover:bg-raised active:scale-95"
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}

          {/* Luft nach unten, damit die letzte Nachricht nicht an der
              Eingabezeile klebt. */}
          <div className="h-6" />
        </div>
      </div>

      {/* Eingabe */}
      <div className="no-print border-t border-line bg-surface px-3 pt-2">
        <div className="mx-auto max-w-2xl">
          {replyTo ? (
            <div className="mb-2 flex items-center gap-2 rounded-xl border-l-4 border-ink bg-raised px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold">
                  Antwort an {nameOf(replyTo.sender_id)}
                </p>
                <p className="truncate text-sm text-muted">
                  {replyTo.body?.replace(REF_RE, '$3') ??
                    (replyTo.kind === 'voice' ? 'Sprachnachricht' : 'Bild')}
                </p>
              </div>
              <IconButton label="Antwort verwerfen" size="sm" onClick={() => setReplyTo(null)}>
                <X size={18} />
              </IconButton>
            </div>
          ) : null}

          {/* Vorschau der Anhaenge, damit niemand versehentlich das falsche
              Bild abschickt. */}
          {attachments.length > 0 ? (
            <div className="mb-2 rounded-2xl border border-line bg-raised p-2">
              <p className="px-1 pb-1.5 text-sm font-bold text-muted">
                {attachments.length === 1
                  ? '1 Anhang, noch nicht gesendet'
                  : `${attachments.length} Anhaenge, noch nicht gesendet`}
              </p>
              <div className="max-h-44 space-y-1.5 overflow-y-auto">
                {attachments.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-2 rounded-xl border border-line bg-surface p-1.5"
                  >
                    {a.preview ? (
                      <img
                        src={a.preview}
                        alt={a.name}
                        className="h-14 w-14 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-raised text-muted">
                        <Paperclip size={22} />
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-base font-semibold">{a.name}</span>
                    <IconButton
                      label={`${a.name} entfernen`}
                      tone="danger"
                      size="sm"
                      onClick={() => dropAttachment(a.id)}
                    >
                      <X size={18} />
                    </IconButton>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {recording ? (
            <div className="mb-2 flex items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2">
              <span className="h-3 w-3 shrink-0 animate-pulse rounded-full bg-danger" />
              <span className="t-serial flex-1">{fmtDuration(recSeconds)}</span>
              <Button size="sm" variant="outline" onClick={() => void stopRecording(false)}>
                Verwerfen
              </Button>
              <Button size="sm" onClick={() => void stopRecording(true)}>
                <Send size={16} /> Senden
              </Button>
            </div>
          ) : null}

          <div className="flex items-end gap-1.5 pb-3">
            <IconButton
              label="Bild oder Datei senden"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus size={20} />
            </IconButton>
            <IconButton
              label="Kiste oder Zimmer verlinken"
              size="sm"
              onClick={() => setPickerOpen(true)}
            >
              <AtSign size={20} />
            </IconButton>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              hidden
              onChange={onPickFiles}
            />

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              onPaste={onPasteInput}
              rows={1}
              placeholder="Nachricht"
              className="max-h-32 min-h-[2.75rem] min-w-0 flex-1 resize-none rounded-2xl border border-line bg-paper px-3.5 py-2.5 text-base outline-none focus:border-ink/40"
            />

            {text.trim() || attachments.length > 0 ? (
              <Button
                size="icon"
                className="shrink-0"
                loading={sending}
                onClick={() => void onSend()}
                aria-label="Senden"
                title="Senden"
              >
                <Send size={20} />
              </Button>
            ) : (
              /* Gedrueckt halten statt antippen, darum Zeigerereignisse
                 statt onClick. Rot, solange aufgenommen wird. */
              <Button
                size="icon"
                variant={recording ? 'danger' : 'primary'}
                className={cx('shrink-0', recording && 'scale-110')}
                onPointerDown={() => void startRecording()}
                onPointerUp={() => void stopRecording(true)}
                onPointerLeave={() => recording && void stopRecording(true)}
                aria-label="Sprachnachricht aufnehmen, gedrueckt halten"
                title="Sprachnachricht aufnehmen, gedrueckt halten"
              >
                <Mic size={20} />
              </Button>
            )}
          </div>
        </div>
      </div>

      <RefPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={insertRef}
        projectId={project.id}
        tags={tags}
      />

      {lightbox ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Bild" className="max-h-full max-w-full rounded-xl object-contain" />
          <div className="safe-top absolute right-3 top-3">
            <IconButton label="Bild schliessen" onClick={() => setLightbox(null)}>
              <X size={22} />
            </IconButton>
          </div>
        </div>
      ) : null}
    </div>
  )
}
