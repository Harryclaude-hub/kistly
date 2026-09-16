import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'
import { Link } from 'react-router-dom'
import {
  AtSign,
  CornerUpLeft,
  ImagePlus,
  Mic,
  Phone,
  Send,
  SmilePlus,
  Trash2,
  Video,
  X,
} from 'lucide-react'
import { AppHeader } from '../components/AppShell'
import { VoiceBubble } from '../components/VoiceBubble'
import { useCalls } from '../components/CallLayer'
import {
  Avatar,
  Button,
  Card,
  CodeChip,
  Input,
  Loading,
  Modal,
  useToast,
} from '../components/ui'
import { useProject } from './ProjectLayout'
import {
  deleteMessage,
  listItems,
  listMessages,
  loadMessageExtras,
  markRead,
  sendMessage,
  toggleReaction,
  type ChatMessage,
} from '../lib/api'
import { supabase } from '../lib/supabase'
import { displayNameOf, useAuth } from '../lib/auth'
import { compressImage, extOf, signedUrls, uploadTo, VoiceRecorder } from '../lib/media'
import type { Item, Message, MessageReaction, Tag } from '../lib/types'
import { chatDayLabel, contrastOn, cx, fmtDuration, fmtTime, uid } from '../lib/util'

const EMOJIS = ['👍', '❤️', '😂', '😮', '🙏', '✅']
const REF_RE = /\[\[(item|tag):([0-9a-fA-F-]{36})\|([^\]]*)\]\]/g

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
              'mx-0.5 inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[0.85em] font-bold underline decoration-dotted',
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

  useEffect(() => {
    if (!open) return
    let alive = true
    setLoading(true)
    const t = setTimeout(() => {
      void listItems(projectId, { search: q, limit: 25 })
        .then((r) => {
          if (alive) setItems(r.rows)
        })
        .catch(() => {
          if (alive) setItems([])
        })
        .finally(() => {
          if (alive) setLoading(false)
        })
    }, 220)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [q, open, projectId])

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
        {matchedTags.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              onPick('tag', t.id, t.name)
              onClose()
            }}
            className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left hover:bg-raised"
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded text-[10px] font-black"
              style={{ background: t.color, color: contrastOn(t.color) }}
            >
              {t.short}
            </span>
            <span className="flex-1 truncate text-sm font-semibold">{t.name}</span>
            <span className="text-[11px] text-muted">{t.kind === 'room' ? 'Zimmer' : 'Person'}</span>
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
            className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left hover:bg-raised"
          >
            <CodeChip code={i.code} size="sm" />
            <span className="flex-1 truncate text-sm">{i.title || 'Kiste'}</span>
          </button>
        ))}
        {!loading && items.length === 0 && matchedTags.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Nichts gefunden.</p>
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
  const [hasMore, setHasMore] = useState(true)
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recSeconds, setRecSeconds] = useState(0)
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map())
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [menuFor, setMenuFor] = useState<string | null>(null)

  const listRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const recorderRef = useRef<VoiceRecorder | null>(null)
  const pendingLinks = useRef<Array<{ target_type: 'item' | 'tag'; target_id: string; label: string }>>([])

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
  }, [project.id, loadImages, scrollDown])

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
          if (m.attachment_path) await loadImages([{ ...m, reactions: [], links: [] }])
          const extras = await loadMessageExtras([m.id])
          if (extras.links.length) {
            setMessages((prev) =>
              prev.map((x) => (x.id === m.id ? { ...x, links: extras.links } : x)),
            )
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
  }, [project.id, loadImages, scrollDown])

  /* ---------------------------------------------------------- senden */
  async function pushNotice(body: string) {
    const { notifyProject } = await import('../lib/push')
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

  async function onSend() {
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    const links = pendingLinks.current.filter((l) => body.includes(l.target_id))
    try {
      await sendMessage({
        project_id: project.id,
        body,
        kind: 'text',
        reply_to: replyTo?.id ?? null,
        links,
      })
      setText('')
      setReplyTo(null)
      pendingLinks.current = []
      void pushNotice(body.replace(REF_RE, '$3').slice(0, 120))
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setSending(false)
    }
  }

  async function onPickImages(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    e.target.value = ''
    if (!files?.length) return
    for (const file of Array.from(files)) {
      try {
        const isImage = file.type.startsWith('image/')
        const blob = isImage ? await compressImage(file, 1800, 0.85) : file
        const path = `${project.id}/${uid()}.${isImage ? 'jpg' : extOf(file)}`
        await uploadTo('chat-media', path, blob, isImage ? 'image/jpeg' : file.type)
        await sendMessage({
          project_id: project.id,
          kind: isImage ? 'image' : 'file',
          body: isImage ? null : file.name,
          attachment_path: path,
          attachment_meta: { size: blob.size, name: file.name, type: file.type },
          reply_to: replyTo?.id ?? null,
        })
        setReplyTo(null)
        void pushNotice(isImage ? 'Bild' : file.name)
      } catch (err) {
        toast(`${file.name}: ${err instanceof Error ? err.message : String(err)}`, 'error')
      }
    }
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
          : `Aufnahme nicht moeglich: ${err instanceof Error ? err.message : String(err)}`,
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
      await sendMessage({
        project_id: project.id,
        kind: 'voice',
        attachment_path: path,
        attachment_meta: { seconds: Math.round(seconds), type: mimeType, size: blob.size },
        reply_to: replyTo?.id ?? null,
      })
      setReplyTo(null)
      void pushNotice(`Sprachnachricht, ${fmtDuration(seconds)}`)
    } catch (err) {
      recorderRef.current = null
      toast(err instanceof Error ? err.message : String(err), 'error')
    }
  }

  async function loadOlder() {
    const first = messages[0]
    if (!first) return
    try {
      const older = await listMessages(project.id, first.created_at)
      if (older.length === 0) {
        setHasMore(false)
        return
      }
      setMessages((prev) => [...older, ...prev])
      await loadImages(older)
      setHasMore(older.length >= 40)
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
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
    <div className="flex h-screen flex-col">
      <AppHeader
        title={project.name}
        subtitle={`${members.length} Mitglieder`}
        back={`/app/p/${project.id}`}
        actions={
          <>
            <button
              onClick={() => void calls.start(false)}
              disabled={calls.busy || calls.inCall}
              aria-label="Anrufen"
              className="rounded-xl p-2 hover:bg-raised disabled:opacity-40"
            >
              <Phone size={19} />
            </button>
            <button
              onClick={() => void calls.start(true)}
              disabled={calls.busy || calls.inCall}
              aria-label="Videoanruf"
              className="rounded-xl p-2 hover:bg-raised disabled:opacity-40"
            >
              <Video size={19} />
            </button>
          </>
        }
      />

      {/* Verlauf */}
      <div ref={listRef} className="scrollbar-thin flex-1 overflow-y-auto px-3 py-3">
        <div className="mx-auto max-w-2xl">
          {loading ? <Loading label="Nachrichten" /> : null}
          {error ? (
            <Card className="p-4 text-sm text-danger">{error}</Card>
          ) : null}

          {!loading && messages.length === 0 ? (
            <Card className="mt-10 p-8 text-center">
              <p className="font-bold">Noch keine Nachricht</p>
              <p className="mt-1 text-sm text-muted">
                Hier besprecht ihr den Umzug. Du kannst Kisten und Zimmer direkt verlinken,
                dann kommt jeder mit einem Tipp zur richtigen Stelle.
              </p>
            </Card>
          ) : null}

          {hasMore && messages.length > 0 ? (
            <div className="mb-3 flex justify-center">
              <Button size="sm" variant="ghost" onClick={() => void loadOlder()}>
                Aeltere Nachrichten
              </Button>
            </div>
          ) : null}

          {grouped.map((group) => (
            <div key={group.day}>
              <div className="my-3 flex justify-center">
                <span className="rounded-full bg-raised px-3 py-1 text-[11px] font-bold text-muted">
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
                      <span className="rounded-full bg-raised px-3 py-1 text-[11px] text-muted">
                        {m.kind === 'call' ? '📞 ' : ''}
                        {m.body}
                      </span>
                    </div>
                  )
                }

                return (
                  <div
                    key={m.id}
                    className={cx('mb-2 flex gap-2', own ? 'justify-end' : 'justify-start')}
                  >
                    {!own ? (
                      <Avatar name={nameOf(m.sender_id)} size={28} />
                    ) : null}

                    <div className={cx('group relative max-w-[78%]', own && 'items-end')}>
                      {!own ? (
                        <p className="mb-0.5 px-1 text-[11px] font-bold text-muted">
                          {nameOf(m.sender_id)}
                        </p>
                      ) : null}

                      <div
                        className={cx(
                          'rounded-2xl px-3 py-2 text-[15px] shadow-sm',
                          own
                            ? 'rounded-br-md bg-ink text-paper'
                            : 'rounded-bl-md border border-line bg-surface text-ink',
                        )}
                      >
                        {replied ? (
                          <div
                            className={cx(
                              'mb-1.5 rounded-lg border-l-2 px-2 py-1 text-xs',
                              own ? 'border-paper/50 bg-paper/10' : 'border-ink/30 bg-raised',
                            )}
                          >
                            <span className="block font-bold opacity-80">
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
                            }}
                            className="block"
                          >
                            {imageUrls.get(m.attachment_path) ? (
                              <img
                                src={imageUrls.get(m.attachment_path)}
                                alt="Bild"
                                className="max-h-72 rounded-xl object-cover"
                              />
                            ) : (
                              <span className="block h-40 w-52 animate-pulse-soft rounded-xl bg-raised" />
                            )}
                          </button>
                        ) : m.kind === 'file' && m.attachment_path ? (
                          <a
                            href={imageUrls.get(m.attachment_path) ?? '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                          >
                            {m.body ?? 'Datei'}
                          </a>
                        ) : (
                          <MessageText body={m.body ?? ''} projectId={project.id} own={own} />
                        )}

                        <div
                          className={cx(
                            'mt-0.5 flex items-center justify-end gap-1 text-[10px]',
                            own ? 'text-paper/60' : 'text-muted',
                          )}
                        >
                          {m.edited_at ? <span>bearbeitet</span> : null}
                          {fmtTime(m.created_at)}
                        </div>
                      </div>

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
                                    toast(String(err), 'error'),
                                  )
                                }
                                className={cx(
                                  'rounded-full border px-1.5 py-0.5 text-[11px]',
                                  mine ? 'border-ink bg-raised' : 'border-line bg-surface',
                                )}
                              >
                                {emoji} {list.length}
                              </button>
                            )
                          })}
                        </div>
                      ) : null}

                      {/* Aktionen */}
                      {!m.deleted_at ? (
                        <div
                          className={cx(
                            'absolute -top-3 flex gap-0.5 rounded-full border border-line bg-surface p-0.5 opacity-0 shadow transition group-hover:opacity-100',
                            own ? 'left-0' : 'right-0',
                            menuFor === m.id && 'opacity-100',
                          )}
                        >
                          <button
                            onClick={() => setMenuFor(menuFor === m.id ? null : m.id)}
                            aria-label="Reagieren"
                            className="rounded-full p-1.5 hover:bg-raised"
                          >
                            <SmilePlus size={14} />
                          </button>
                          <button
                            onClick={() => setReplyTo(m)}
                            aria-label="Antworten"
                            className="rounded-full p-1.5 hover:bg-raised"
                          >
                            <CornerUpLeft size={14} />
                          </button>
                          {own ? (
                            <button
                              onClick={() => void deleteMessage(m.id)}
                              aria-label="Loeschen"
                              className="rounded-full p-1.5 text-danger hover:bg-danger/10"
                            >
                              <Trash2 size={14} />
                            </button>
                          ) : null}
                        </div>
                      ) : null}

                      {menuFor === m.id ? (
                        <div
                          className={cx(
                            'absolute z-10 mt-1 flex gap-1 rounded-2xl border border-line bg-surface p-1.5 shadow-lg',
                            own ? 'right-0' : 'left-0',
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
                                  toast(String(err), 'error'),
                                )
                                setMenuFor(null)
                              }}
                              className="rounded-lg px-1.5 py-1 text-lg hover:bg-raised"
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
        </div>
      </div>

      {/* Eingabe */}
      <div className="no-print safe-bottom border-t border-line bg-surface px-3 pt-2">
        <div className="mx-auto max-w-2xl">
          {replyTo ? (
            <div className="mb-2 flex items-start gap-2 rounded-xl border-l-2 border-ink bg-raised px-3 py-2 text-xs">
              <div className="min-w-0 flex-1">
                <p className="font-bold">Antwort an {nameOf(replyTo.sender_id)}</p>
                <p className="truncate text-muted">
                  {replyTo.body?.replace(REF_RE, '$3') ??
                    (replyTo.kind === 'voice' ? 'Sprachnachricht' : 'Bild')}
                </p>
              </div>
              <button onClick={() => setReplyTo(null)} aria-label="Antwort verwerfen">
                <X size={15} />
              </button>
            </div>
          ) : null}

          {recording ? (
            <div className="mb-2 flex items-center gap-3 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-danger" />
              <span className="flex-1 font-mono text-sm font-bold">{fmtDuration(recSeconds)}</span>
              <Button size="sm" variant="ghost" onClick={() => void stopRecording(false)}>
                Verwerfen
              </Button>
              <Button size="sm" onClick={() => void stopRecording(true)}>
                <Send size={14} /> Senden
              </Button>
            </div>
          ) : null}

          <div className="flex items-end gap-1.5 pb-2">
            <button
              onClick={() => fileRef.current?.click()}
              aria-label="Bild senden"
              className="rounded-xl p-2.5 text-muted hover:bg-raised hover:text-ink"
            >
              <ImagePlus size={20} />
            </button>
            <button
              onClick={() => setPickerOpen(true)}
              aria-label="Kiste verlinken"
              className="rounded-xl p-2.5 text-muted hover:bg-raised hover:text-ink"
            >
              <AtSign size={20} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              hidden
              onChange={(e) => void onPickImages(e)}
            />

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Nachricht"
              className="max-h-32 min-h-[42px] flex-1 resize-none rounded-2xl border border-line bg-paper px-3.5 py-2.5 text-[15px] outline-none focus:border-ink/40"
            />

            {text.trim() ? (
              <Button size="icon" loading={sending} onClick={() => void onSend()} aria-label="Senden">
                <Send size={18} />
              </Button>
            ) : (
              <button
                onPointerDown={() => void startRecording()}
                onPointerUp={() => void stopRecording(true)}
                onPointerLeave={() => recording && void stopRecording(true)}
                aria-label="Sprachnachricht aufnehmen, gedrueckt halten"
                className={cx(
                  'flex h-10 w-10 items-center justify-center rounded-xl transition',
                  recording ? 'scale-110 bg-danger text-white' : 'bg-ink text-paper',
                )}
              >
                <Mic size={18} />
              </button>
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
        </div>
      ) : null}
    </div>
  )
}
