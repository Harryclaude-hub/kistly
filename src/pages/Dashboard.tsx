import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Boxes, LogIn, Plus, Users } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { InstallCard } from '../components/InstallCard'
import {
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
import { useAuth } from '../lib/auth'
import { ROLE_LABEL } from '../lib/types'
import { fmtDate, useAsync } from '../lib/util'

/** Fortschritt eines Umzugs. Der Balken ist bewusst dick, damit man ihn im
 *  Vorbeigehen erkennt, und die Prozentzahl steht gross daneben. */
function Progress({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div className="mt-4">
      <div className="flex items-end justify-between gap-3">
        <span className="t-sub min-w-0 truncate">
          {done} von {total} angekommen
        </span>
        <span className="shrink-0 text-2xl font-black leading-none tabular-nums">{pct}%</span>
      </div>
      <div
        className="mt-2 h-3 w-full overflow-hidden rounded-full bg-raised"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Angekommen"
      >
        <div className="h-full rounded-full bg-ok transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function ProjectCard({ row }: { row: ProjectWithStats }) {
  const { project, stats, role, members } = row
  return (
    <Link to={`/app/p/${project.id}`} className="block">
      <Card className="p-5 transition hover:border-ink/25 hover:shadow-sm active:scale-[0.99]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="t-name-lg break-words">{project.name}</h3>
            <p className="t-sub mt-1 break-words">
              {project.note ||
                (project.move_date ? `Umzug am ${fmtDate(project.move_date)}` : 'Kein Vermerk')}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-raised px-3 py-1 text-sm font-bold">
            {ROLE_LABEL[role]}
          </span>
        </div>

        <Progress done={stats.items_arrived} total={stats.items_total} />

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="inline-flex items-center gap-2 text-base font-bold">
            <Boxes size={19} className="text-muted" />
            {stats.items_total}
            <span className="font-semibold text-muted">Kisten</span>
          </span>
          <span className="inline-flex items-center gap-2 text-base font-bold">
            <Users size={19} className="text-muted" />
            {members}
            <span className="font-semibold text-muted">dabei</span>
          </span>
          {stats.items_transit > 0 ? (
            <span className="text-base font-bold text-warn">{stats.items_transit} unterwegs</span>
          ) : null}
        </div>
      </Card>
    </Link>
  )
}

export default function Dashboard() {
  const { profile } = useAuth()
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

  /** Beide Formulare teilen sich den Fehlertext. Er wird beim Oeffnen und
   *  Schliessen geleert, damit im zweiten Dialog nicht der Fehler des ersten
   *  stehen bleibt. */
  function openNew(v: boolean) {
    setFormError(null)
    setNewOpen(v)
  }

  function openJoin(v: boolean) {
    setFormError(null)
    setJoinOpen(v)
  }

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
      {/* Profil und Einstellungen sitzen bereits rechts in der Kopfzeile,
          darum steht hier kein zweites Zahnrad und kein zweiter Avatar. */}
      <AppHeader title={<Wordmark size={24} />} />

      <Page>
        <div className="mb-5">
          <h1 className="text-2xl font-black tracking-tight">
            Hallo{profile?.display_name ? `, ${profile.display_name}` : ''}
          </h1>
          <p className="t-sub mt-1">Deine Umzuege auf einen Blick.</p>

          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
            <Button size="lg" full className="sm:w-auto" onClick={() => openNew(true)}>
              <Plus size={20} /> Neuer Umzug
            </Button>
            <Button
              size="lg"
              variant="outline"
              full
              className="sm:w-auto"
              onClick={() => openJoin(true)}
            >
              <LogIn size={20} /> Code einloesen
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
              <Button size="lg" onClick={() => openNew(true)}>
                <Plus size={20} /> Ersten Umzug anlegen
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

        {/* Luft fuer die untere Navigationsleiste */}
        <div className="h-6" />
      </Page>

      <Modal
        open={newOpen}
        onClose={() => openNew(false)}
        title="Neuer Umzug"
        footer={
          <>
            <Button variant="ghost" onClick={() => openNew(false)}>
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
          {formError ? <ErrorBox error={formError} /> : null}
        </form>
      </Modal>

      <Modal
        open={joinOpen}
        onClose={() => openJoin(false)}
        title="Einem Umzug beitreten"
        footer={
          <>
            <Button variant="ghost" onClick={() => openJoin(false)}>
              Abbrechen
            </Button>
            <Button form="join-project" type="submit" loading={busy}>
              Beitreten
            </Button>
          </>
        }
      >
        <form id="join-project" onSubmit={onJoin} className="space-y-4">
          <Field
            label="Einladungscode"
            hint="Den Code bekommst du von der Person, die den Umzug angelegt hat."
          >
            <Input
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCD-2345"
              className="t-serial text-2xl tracking-widest"
            />
          </Field>
          {formError ? <ErrorBox error={formError} /> : null}
        </form>
      </Modal>
    </div>
  )
}
