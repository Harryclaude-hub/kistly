import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Boxes, LogIn, Plus, Settings as SettingsIcon, Users } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { InstallCard } from '../components/InstallCard'
import { ThemeToggle } from '../components/ThemeToggle'
import {
  Avatar,
  Button,
  Card,
  Empty,
  ErrorBox,
  Field,
  Input,
  Loading,
  Modal,
  Switch,
  Textarea,
  Wordmark,
  useToast,
} from '../components/ui'
import { createProject, joinProject, listProjects, type ProjectWithStats } from '../lib/api'
import { displayNameOf, useAuth } from '../lib/auth'
import { ROLE_LABEL } from '../lib/types'
import { fmtDate, useAsync } from '../lib/util'

function Progress({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div className="mt-3">
      <div className="h-2 w-full overflow-hidden rounded-full bg-raised">
        <div
          className="h-full rounded-full bg-ok transition-all"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-muted">
        <span>
          {done} von {total} angekommen
        </span>
        <span className="font-bold text-ink">{pct}%</span>
      </div>
    </div>
  )
}

function ProjectCard({ row }: { row: ProjectWithStats }) {
  const { project, stats, role, members } = row
  return (
    <Link to={`/app/p/${project.id}`} className="block">
      <Card className="p-4 transition hover:border-ink/25 hover:shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold">{project.name}</h3>
            <p className="mt-0.5 truncate text-sm text-muted">
              {project.note || (project.move_date ? `Umzug am ${fmtDate(project.move_date)}` : 'Kein Vermerk')}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-raised px-2 py-0.5 text-[11px] font-bold">
            {ROLE_LABEL[role]}
          </span>
        </div>

        <Progress done={stats.items_arrived} total={stats.items_total} />

        <div className="mt-3 flex items-center gap-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Boxes size={14} /> {stats.items_total} Kisten
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users size={14} /> {members}
          </span>
          {stats.items_transit > 0 ? (
            <span className="font-semibold text-warn">{stats.items_transit} unterwegs</span>
          ) : null}
        </div>
      </Card>
    </Link>
  )
}

export default function Dashboard() {
  const { profile, user } = useAuth()
  const nav = useNavigate()
  const toast = useToast()
  const list = useAsync(listProjects, [])

  const [newOpen, setNewOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [defaults, setDefaults] = useState(true)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    setBusy(true)
    try {
      const p = await createProject(name, note, defaults)
      toast('Umzug angelegt', 'ok')
      nav(`/app/p/${p.id}`)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function onJoin(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    setBusy(true)
    try {
      const p = await joinProject(code)
      toast(`Du bist jetzt bei ${p.name} dabei`, 'ok')
      nav(`/app/p/${p.id}`)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <AppHeader
        title={<Wordmark size={24} />}
        actions={
          <>
            <ThemeToggle />
            <Link to="/app/einstellungen" aria-label="Einstellungen" className="rounded-xl p-2 hover:bg-raised">
              <SettingsIcon size={20} />
            </Link>
            <Link to="/app/einstellungen">
              <Avatar name={displayNameOf(profile, user?.email ?? '?')} size={32} />
            </Link>
          </>
        }
      />

      <Page>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              Hallo{profile?.display_name ? `, ${profile.display_name}` : ''}
            </h1>
            <p className="text-sm text-muted">Deine Umzuege auf einen Blick.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setJoinOpen(true)}>
              <LogIn size={16} /> Code einloesen
            </Button>
            <Button onClick={() => setNewOpen(true)}>
              <Plus size={16} /> Neuer Umzug
            </Button>
          </div>
        </div>

        <div className="mb-5">
          <InstallCard compact />
        </div>

        {list.loading ? (
          <Loading label="Umzuege werden geladen" />
        ) : list.error ? (
          <ErrorBox error={list.error} onRetry={list.reload} />
        ) : (list.data ?? []).length === 0 ? (
          <Empty
            icon={<Boxes size={30} />}
            title="Noch kein Umzug angelegt"
            hint="Ein Umzug ist die Klammer um alles: Zimmer, Personen, Kisten, Etiketten und den Chat."
            action={
              <Button onClick={() => setNewOpen(true)}>
                <Plus size={16} /> Ersten Umzug anlegen
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {(list.data ?? []).map((row) => (
              <ProjectCard key={row.project.id} row={row} />
            ))}
          </div>
        )}
      </Page>

      <Modal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="Neuer Umzug"
        footer={
          <>
            <Button variant="ghost" onClick={() => setNewOpen(false)}>
              Abbrechen
            </Button>
            <Button form="new-project" type="submit" loading={busy}>
              Anlegen
            </Button>
          </>
        }
      >
        <form id="new-project" onSubmit={onCreate} className="space-y-4">
          <Field label="Name" required>
            <Input
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Umzug Salzburg 2026"
            />
          </Field>
          <Field label="Vermerk" hint="Optional, zum Beispiel die neue Adresse.">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </Field>
          <Switch
            checked={defaults}
            onChange={setDefaults}
            label="Standardzimmer anlegen"
            hint="Wohnzimmer, Kueche, Schlafzimmer, Kinderzimmer, Bad, Flur, Keller. Kannst du danach aendern."
          />
          {formError ? <p className="text-sm text-danger">{formError}</p> : null}
        </form>
      </Modal>

      <Modal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        title="Einem Umzug beitreten"
        footer={
          <>
            <Button variant="ghost" onClick={() => setJoinOpen(false)}>
              Abbrechen
            </Button>
            <Button form="join-project" type="submit" loading={busy}>
              Beitreten
            </Button>
          </>
        }
      >
        <form id="join-project" onSubmit={onJoin} className="space-y-4">
          <Field label="Einladungscode" hint="Den Code bekommst du von der Person, die den Umzug angelegt hat.">
            <Input
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCD-2345"
              className="font-mono text-lg tracking-widest"
            />
          </Field>
          {formError ? <p className="text-sm text-danger">{formError}</p> : null}
        </form>
      </Modal>
    </div>
  )
}
