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
      await navigator.clipboard.writeText(inv.code).catch(() => {})
      toast(`Code ${inv.code} angelegt und kopiert`, 'ok')
      invites.reload()
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function share(code: string) {
    const text = `Komm zu meinem Umzug "${project.name}" bei Kistly. Code: ${code}\n${location.origin}/app`
    if (navigator.share) {
      await navigator.share({ title: 'Kistly Einladung', text }).catch(() => {})
      return
    }
    await navigator.clipboard.writeText(text)
    toast('Einladung kopiert', 'ok')
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
              <UserPlus size={16} /> Einladen
            </Button>
          ) : null
        }
      />

      <Page>
        <SectionTitle>Mitglieder</SectionTitle>
        <Card className="zebra mb-6 divide-y divide-line overflow-hidden">
          {members.map((m) => {
            const me = m.user_id === user?.id
            return (
              <div key={m.user_id} className="flex items-center gap-3 px-3 py-3">
                <Avatar name={displayNameOf(m.profile, 'Unbekannt')} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {displayNameOf(m.profile, 'Unbekannt')}
                    {me ? <span className="ml-1 text-xs text-muted">(du)</span> : null}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {m.profile?.email ?? 'ohne E-Mail'} . dabei seit {fmtDate(m.created_at)}
                  </p>
                </div>
                {isOwner && !me ? (
                  <Select
                    value={m.role}
                    className="w-auto py-1.5 text-xs"
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
                ) : (
                  <span className="shrink-0 rounded-full bg-raised px-2 py-1 text-[11px] font-bold">
                    {ROLE_LABEL[m.role]}
                  </span>
                )}
                {isOwner && !me ? (
                  <button
                    onClick={() => setKick(m.user_id)}
                    aria-label="Entfernen"
                    className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 size={16} />
                  </button>
                ) : null}
              </div>
            )
          })}
        </Card>

        <SectionTitle
          action={
            canEdit ? (
              <Button size="sm" variant="soft" loading={busy} onClick={() => void onCreateInvite()}>
                <Plus size={14} /> Neuer Code
              </Button>
            ) : null
          }
        >
          Einladungscodes
        </SectionTitle>

        {invites.loading ? (
          <Loading label="Codes" />
        ) : active.length === 0 ? (
          <Empty
            title="Kein Code offen"
            hint="Ein Code laesst andere diesem Umzug beitreten. Sie geben ihn unter Code einloesen ein."
            action={
              canEdit ? (
                <Button onClick={() => void onCreateInvite()}>
                  <UserPlus size={16} /> Code erstellen
                </Button>
              ) : null
            }
          />
        ) : (
          <Card className="zebra divide-y divide-line overflow-hidden">
            {active.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 px-3 py-3">
                <span className="font-mono text-lg font-black tracking-widest">{inv.code}</span>
                <span className="min-w-0 flex-1 text-xs text-muted">
                  {ROLE_LABEL[inv.role]} . {inv.uses}x benutzt
                </span>
                <button
                  onClick={() => {
                    void navigator.clipboard.writeText(inv.code)
                    toast('Code kopiert', 'ok')
                  }}
                  aria-label="Code kopieren"
                  className="rounded-lg p-2 text-muted hover:bg-raised hover:text-ink"
                >
                  <Copy size={16} />
                </button>
                <button
                  onClick={() => void share(inv.code)}
                  aria-label="Einladung teilen"
                  className="rounded-lg p-2 text-muted hover:bg-raised hover:text-ink"
                >
                  <Share2 size={16} />
                </button>
                {canEdit ? (
                  <button
                    onClick={async () => {
                      try {
                        await setInviteActive(inv.id, false)
                        invites.reload()
                        toast('Code deaktiviert', 'ok')
                      } catch (err) {
                        toast(err instanceof Error ? err.message : String(err), 'error')
                      }
                    }}
                    aria-label="Code deaktivieren"
                    className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 size={16} />
                  </button>
                ) : null}
              </div>
            ))}
          </Card>
        )}

        <div className="mt-8">
          <Button variant="outline" onClick={() => setLeaveOpen(true)}>
            <LogOut size={16} /> Diesen Umzug verlassen
          </Button>
          {role === 'owner' ? (
            <p className="mt-2 text-xs text-muted">
              Du bist Besitzer. Verlassen geht erst, wenn jemand anders Besitzer ist.
            </p>
          ) : null}
        </div>
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
