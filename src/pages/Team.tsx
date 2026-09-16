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
import { useSprache } from '../lib/i18n'
import { type MemberRole } from '../lib/types'
import { appUrl, fmtDate, useAsync } from '../lib/util'

/* Reihenfolge der Rollen in der Auswahl. Die Beschriftungen stehen im
 * Woerterbuch unter rolle.owner, rolle.editor und rolle.viewer. */
const ROLLEN: MemberRole[] = ['owner', 'editor', 'viewer']

export default function Team() {
  const { project, members, role, isOwner, canEdit, reloadMembers } = useProject()
  const { user } = useAuth()
  const { t, tn } = useSprache()
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
          ? t('team.code_angelegt_kopiert', { code: inv.code })
          : t('team.code_angelegt_ohne_kopie', { code: inv.code }),
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
      toast(t('team.code_kopiert'), 'ok')
    } catch {
      toast(t('team.kopieren_fehler'), 'error')
    }
  }

  async function share(code: string) {
    // Nachricht an einen Menschen, also uebersetzt. Der Name des Umzugs und
    // der Code bleiben unveraendert.
    const text = `${t('team.teilen_text', { name: project.name, code })}\n${appUrl('app')}`
    if (navigator.share) {
      try {
        await navigator.share({ title: t('team.teilen_titel'), text })
        return
      } catch (err) {
        // Abbrechen durch den Nutzer ist kein Fehlschlag. Alles andere faellt
        // auf Kopieren zurueck, statt wortlos nichts zu tun.
        if (err instanceof DOMException && err.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      toast(t('team.einladung_kopiert'), 'ok')
    } catch {
      toast(t('team.teilen_fehler'), 'error')
    }
  }

  const active = (invites.data ?? []).filter((i) => i.active)

  return (
    <>
      <AppHeader
        title={t('team.titel')}
        subtitle={tn('begriff.mitglieder_anzahl', members.length)}
        back={`/app/p/${project.id}`}
        actions={
          canEdit ? (
            <Button size="sm" loading={busy} onClick={() => void onCreateInvite()}>
              <UserPlus size={18} /> {t('team.einladen')}
            </Button>
          ) : null
        }
      />

      <Page>
        <SectionTitle>{t('begriff.mitglieder')}</SectionTitle>
        <Card className="zebra mb-6 divide-y divide-line overflow-hidden">
          {members.map((m) => {
            const me = m.user_id === user?.id
            const name = displayNameOf(m.profile, t('team.unbekannt'))
            return (
              <div key={m.user_id} className="px-3 py-3.5">
                <div className="flex items-center gap-3">
                  <Avatar name={name} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="t-name truncate">
                      {name}
                      {me ? <span className="t-sub font-normal"> {t('team.du')}</span> : null}
                    </p>
                    <p className="t-sub truncate">{m.profile?.email ?? t('team.ohne_email')}</p>
                    <p className="t-sub truncate">
                      {t('team.dabei_seit', { datum: fmtDate(m.created_at) })}
                    </p>
                  </div>
                  {!(isOwner && !me) ? (
                    <span className="shrink-0 rounded-full bg-raised px-3 py-1 text-sm font-bold">
                      {t(`rolle.${m.role}`)}
                    </span>
                  ) : null}
                </div>

                {isOwner && !me ? (
                  <div className="mt-3 flex items-center gap-2">
                    <Select
                      value={m.role}
                      aria-label={t('team.rolle_von', { name })}
                      className="min-w-0 flex-1"
                      onChange={async (e) => {
                        try {
                          await setMemberRole(project.id, m.user_id, e.target.value as MemberRole)
                          await reloadMembers()
                          toast(t('team.rolle_geaendert'), 'ok')
                        } catch (err) {
                          toast(err instanceof Error ? err.message : String(err), 'error')
                        }
                      }}
                    >
                      {ROLLEN.map((r) => (
                        <option key={r} value={r}>
                          {t(`rolle.${r}`)}
                        </option>
                      ))}
                    </Select>
                    <IconButton
                      label={t('team.entfernen_label', { name })}
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
                <Plus size={16} /> {t('team.neuer_code')}
              </Button>
            ) : null
          }
        >
          {t('team.codes_titel')}
        </SectionTitle>

        {invites.loading ? (
          <Loading label={t('team.codes_laden')} />
        ) : invites.error ? (
          <ErrorBox error={invites.error} onRetry={invites.reload} />
        ) : active.length === 0 ? (
          <Empty
            title={t('team.kein_code_titel')}
            hint={t('team.kein_code_hinweis')}
            action={
              canEdit ? (
                <Button size="lg" loading={busy} onClick={() => void onCreateInvite()}>
                  <UserPlus size={20} /> {t('team.code_erstellen')}
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
                  {t('team.code_zeile', { rolle: t(`rolle.${inv.role}`), n: inv.uses })}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Button variant="soft" size="sm" onClick={() => void copyCode(inv.code)}>
                    <Copy size={17} /> {t('aktion.kopieren')}
                  </Button>
                  <IconButton
                    label={t('team.einladung_teilen')}
                    size="sm"
                    onClick={() => void share(inv.code)}
                  >
                    <Share2 size={18} />
                  </IconButton>
                  {canEdit ? (
                    <IconButton
                      label={t('team.code_deaktivieren')}
                      tone="danger"
                      size="sm"
                      onClick={async () => {
                        try {
                          await setInviteActive(inv.id, false)
                          invites.reload()
                          toast(t('team.code_deaktiviert'), 'ok')
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
            <LogOut size={20} className="spiegeln" /> {t('team.verlassen_knopf')}
          </Button>
          {role === 'owner' ? (
            <p className="t-sub mt-2">{t('team.verlassen_besitzer')}</p>
          ) : null}
        </div>

        {/* Luft fuer die untere Navigationsleiste */}
        <div className="h-6" />
      </Page>

      <ConfirmDialog
        open={leaveOpen}
        title={t('team.verlassen_titel')}
        confirmLabel={t('team.verlassen_bestaetigen')}
        body={t('team.verlassen_text')}
        onClose={() => setLeaveOpen(false)}
        onConfirm={async () => {
          if (!user) return
          try {
            await removeMember(project.id, user.id)
            toast(t('team.verlassen_ok'), 'ok')
            nav('/app')
          } catch (err) {
            toast(err instanceof Error ? err.message : String(err), 'error')
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(kick)}
        title={t('team.entfernen_titel')}
        confirmLabel={t('aktion.entfernen')}
        body={t('team.entfernen_text')}
        onClose={() => setKick(null)}
        onConfirm={async () => {
          if (!kick) return
          try {
            await removeMember(project.id, kick)
            await reloadMembers()
            toast(t('team.entfernt'), 'ok')
          } catch (err) {
            toast(err instanceof Error ? err.message : String(err), 'error')
          }
        }}
      />
    </>
  )
}
