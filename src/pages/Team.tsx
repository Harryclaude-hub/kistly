import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, LogOut, Plus, Share2, Trash2, UserPlus } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import {
  Avatar,
  Button,
  Card,
  ConfirmDialog,
  Empty,
  ErrorBox,
  IconButton,
  Loading,
  SectionTitle,
  Select,
  useToast,
} from '../components/ui'
import { useProject } from './ProjectLayout'
import {
  createInvite,
  listInvites,
  removeMember,
  setInviteActive,
  setMemberRole,
} from '../lib/api'
import { displayNameOf, useAuth } from '../lib/auth'
import { ROLE_LABEL, type MemberRole } from '../lib/types'
import { fmtDate, useAsync } from '../lib/util'

export default function Team() {
  const { project, members, role, isOwner, canEdit, reloadMembers } = useProject()
  const { user } = useAuth()
  const toast = useToast()
  const nav = useNavigate()
  const invites = useAsync(() => listInvites(project.id), [project.id])

  const [busy, setBusy] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [kick, setKick] = useState<string | null>(null)

  async function onCreateInvite() {
    setBusy(true)
    try {
      const inv = await createInvite(project.id, 'editor')
      invites.reload()
      // Die Zwischenablage kann fehlen oder gesperrt sein. Dann sagen wir das,
      // statt "kopiert" zu melden und den Nutzer im Glauben zu lassen.
      let copied = true
      try {
        await navigator.clipboard.writeText(inv.code)
      } catch {
        copied = false
      }
      toast(
        copied
          ? `Code ${inv.code} angelegt und kopiert`
          : `Code ${inv.code} angelegt. Kopieren ging nicht, schreib ihn bitte ab.`,
        copied ? 'ok' : 'info',
      )
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      toast('Code kopiert', 'ok')
    } catch {
      toast('Kopieren hat nicht geklappt. Schreib den Code bitte ab.', 'error')
    }
  }

  async function share(code: string) {
    const text = `Komm zu meinem Umzug "${project.name}" bei Kistly. Code: ${code}\n${location.origin}/app`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Kistly Einladung', text })
        return
      } catch (err) {
        // Abbrechen durch den Nutzer ist kein Fehlschlag. Alles andere faellt
        // auf Kopieren zurueck, statt wortlos nichts zu tun.
        if (err instanceof DOMException && err.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      toast('Einladung kopiert', 'ok')
    } catch {
      toast('Teilen hat nicht geklappt. Schreib den Code bitte ab.', 'error')
    }
  }

  const active = (invites.data ?? []).filter((i) => i.active)

  return (
    <>
      <AppHeader
        title="Team"
        subtitle={`${members.length} Mitglieder`}
        back={`/app/p/${project.id}`}
        actions={
          canEdit ? (
            <Button size="sm" loading={busy} onClick={() => void onCreateInvite()}>
              <UserPlus size={18} /> Einladen
            </Button>
          ) : null
        }
      />

      <Page>
        <SectionTitle>Mitglieder</SectionTitle>
        <Card className="zebra mb-6 divide-y divide-line overflow-hidden">
          {members.map((m) => {
            const me = m.user_id === user?.id
            const name = displayNameOf(m.profile, 'Unbekannt')
            return (
              <div key={m.user_id} className="px-3 py-3.5">
                <div className="flex items-center gap-3">
                  <Avatar name={name} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="t-name truncate">
                      {name}
                      {me ? <span className="t-sub font-normal"> (du)</span> : null}
                    </p>
                    <p className="t-sub truncate">{m.profile?.email ?? 'ohne E-Mail'}</p>
                    <p className="t-sub truncate">dabei seit {fmtDate(m.created_at)}</p>
                  </div>
                  {!(isOwner && !me) ? (
                    <span className="shrink-0 rounded-full bg-raised px-3 py-1 text-sm font-bold">
                      {ROLE_LABEL[m.role]}
                    </span>
                  ) : null}
                </div>

                {isOwner && !me ? (
                  <div className="mt-3 flex items-center gap-2">
                    <Select
                      value={m.role}
                      aria-label={`Rolle von ${name}`}
                      className="min-w-0 flex-1"
                      onChange={async (e) => {
                        try {
                          await setMemberRole(project.id, m.user_id, e.target.value as MemberRole)
                          await reloadMembers()
                          toast('Rolle geaendert', 'ok')
                        } catch (err) {
                          toast(err instanceof Error ? err.message : String(err), 'error')
                        }
                      }}
                    >
                      {(Object.keys(ROLE_LABEL) as MemberRole[]).map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </Select>
                    <IconButton
                      label={`${name} entfernen`}
                      tone="danger"
                      onClick={() => setKick(m.user_id)}
                    >
                      <Trash2 size={19} />
                    </IconButton>
                  </div>
                ) : null}
              </div>
            )
          })}
        </Card>

        <SectionTitle
          action={
            canEdit ? (
              <Button size="sm" variant="soft" loading={busy} onClick={() => void onCreateInvite()}>
                <Plus size={16} /> Neuer Code
              </Button>
            ) : null
          }
        >
          Einladungscodes
        </SectionTitle>

        {invites.loading ? (
          <Loading label="Codes werden geladen" />
        ) : invites.error ? (
          <ErrorBox error={invites.error} onRetry={invites.reload} />
        ) : active.length === 0 ? (
          <Empty
            title="Kein Code offen"
            hint="Ein Code laesst andere diesem Umzug beitreten. Sie geben ihn unter Code einloesen ein."
            action={
              canEdit ? (
                <Button size="lg" loading={busy} onClick={() => void onCreateInvite()}>
                  <UserPlus size={20} /> Code erstellen
                </Button>
              ) : null
            }
          />
        ) : (
          <Card className="zebra divide-y divide-line overflow-hidden">
            {active.map((inv) => (
              <div key={inv.id} className="px-3 py-4">
                <p className="t-serial break-all text-3xl leading-none">{inv.code}</p>
                <p className="t-sub mt-2">
                  {ROLE_LABEL[inv.role]}, {inv.uses}x benutzt
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Button variant="soft" size="sm" onClick={() => void copyCode(inv.code)}>
                    <Copy size={17} /> Kopieren
                  </Button>
                  <IconButton
                    label="Einladung teilen"
                    size="sm"
                    onClick={() => void share(inv.code)}
                  >
                    <Share2 size={18} />
                  </IconButton>
                  {canEdit ? (
                    <IconButton
                      label="Code deaktivieren"
                      tone="danger"
                      size="sm"
                      onClick={async () => {
                        try {
                          await setInviteActive(inv.id, false)
                          invites.reload()
                          toast('Code deaktiviert', 'ok')
                        } catch (err) {
                          toast(err instanceof Error ? err.message : String(err), 'error')
                        }
                      }}
                    >
                      <Trash2 size={18} />
                    </IconButton>
                  ) : null}
                </div>
              </div>
            ))}
          </Card>
        )}

        <div className="mt-8">
          <Button
            variant="outline"
            size="lg"
            full
            className="sm:w-auto"
            onClick={() => setLeaveOpen(true)}
          >
            <LogOut size={20} /> Diesen Umzug verlassen
          </Button>
          {role === 'owner' ? (
            <p className="t-sub mt-2">
              Du bist Besitzer. Verlassen geht erst, wenn jemand anders Besitzer ist.
            </p>
          ) : null}
        </div>

        {/* Luft fuer die untere Navigationsleiste */}
        <div className="h-6" />
      </Page>

      <ConfirmDialog
        open={leaveOpen}
        title="Umzug verlassen"
        confirmLabel="Verlassen"
        body="Du siehst diesen Umzug danach nicht mehr. Mit einem neuen Einladungscode kommst du wieder rein."
        onClose={() => setLeaveOpen(false)}
        onConfirm={async () => {
          if (!user) return
          try {
            await removeMember(project.id, user.id)
            toast('Umzug verlassen', 'ok')
            nav('/app')
          } catch (err) {
            toast(err instanceof Error ? err.message : String(err), 'error')
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(kick)}
        title="Mitglied entfernen"
        confirmLabel="Entfernen"
        body="Die Person verliert den Zugriff auf diesen Umzug. Ihre Kisten und Nachrichten bleiben erhalten."
        onClose={() => setKick(null)}
        onConfirm={async () => {
          if (!kick) return
          try {
            await removeMember(project.id, kick)
            await reloadMembers()
            toast('Mitglied entfernt', 'ok')
          } catch (err) {
            toast(err instanceof Error ? err.message : String(err), 'error')
          }
        }}
      />
    </>
  )
}
