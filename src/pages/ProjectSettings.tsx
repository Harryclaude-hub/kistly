import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Trash2, Users } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import {
  Button,
  Card,
  Field,
  Input,
  Modal,
  SectionTitle,
  Textarea,
  useToast,
} from '../components/ui'
import { useProject } from './ProjectLayout'
import { deleteProject, updateProject } from '../lib/api'
import { fmtDateTime } from '../lib/util'

export default function ProjectSettings() {
  const { project, setProject, canEdit, isOwner } = useProject()
  const toast = useToast()
  const nav = useNavigate()
  const [delOpen, setDelOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmName, setConfirmName] = useState('')

  async function save(patch: Parameters<typeof updateProject>[1]) {
    try {
      setProject(await updateProject(project.id, patch))
      toast('Gespeichert', 'ok')
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
    }
  }

  return (
    <>
      <AppHeader title="Umzug einstellen" subtitle={project.name} back={`/app/p/${project.id}`} />
      <Page>
        <SectionTitle>Grunddaten</SectionTitle>
        <Card className="mb-6 space-y-5 p-5">
          <p className="t-sub">
            {canEdit
              ? 'Aenderungen werden gespeichert, sobald du das Feld verlaesst.'
              : 'Du kannst hier nur lesen. Zum Aendern brauchst du die Rolle Bearbeiter.'}
          </p>

          <Field label="Name des Umzugs">
            <Input
              disabled={!canEdit}
              defaultValue={project.name}
              className="t-name"
              onBlur={(e) => {
                const v = e.target.value.trim()
                if (v && v !== project.name) void save({ name: v })
              }}
            />
          </Field>
          <Field label="Vermerk" hint="Steht auf der Uebersicht unter dem Namen.">
            <Textarea
              rows={2}
              disabled={!canEdit}
              defaultValue={project.note ?? ''}
              onBlur={(e) => void save({ note: e.target.value.trim() || null })}
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Alte Adresse">
              <Input
                disabled={!canEdit}
                defaultValue={project.from_address ?? ''}
                onBlur={(e) => void save({ from_address: e.target.value.trim() || null })}
              />
            </Field>
            <Field label="Neue Adresse">
              <Input
                disabled={!canEdit}
                defaultValue={project.to_address ?? ''}
                onBlur={(e) => void save({ to_address: e.target.value.trim() || null })}
              />
            </Field>
          </div>
          <Field label="Umzugstag">
            <Input
              type="date"
              disabled={!canEdit}
              defaultValue={project.move_date ?? ''}
              onChange={(e) => void save({ move_date: e.target.value || null })}
            />
          </Field>
          <p className="t-sub">
            Angelegt am {fmtDateTime(project.created_at)}. Zuletzt geaendert{' '}
            {fmtDateTime(project.updated_at)}.
          </p>
        </Card>

        <SectionTitle>Mitglieder</SectionTitle>
        <Card className="mb-6 p-5">
          <p className="t-name">Team und Einladungscodes</p>
          <p className="t-sub mt-1.5">
            Wer darf mit, wer darf nur lesen, und welcher Code ist offen.
          </p>
          <Link to={`/app/p/${project.id}/team`} className="mt-4 block sm:inline-block">
            <Button variant="soft" size="lg" full className="sm:w-auto">
              <Users size={20} /> Team oeffnen
            </Button>
          </Link>
        </Card>

        {isOwner ? (
          <>
            <SectionTitle>Gefahrenbereich</SectionTitle>
            <Card className="border-danger/30 p-5">
              <p className="t-name text-danger">Umzug loeschen</p>
              <p className="t-sub mt-1.5">
                Loescht Kisten, Bereiche, Fotos, Nachrichten und alle Mitgliedschaften. Das laesst
                sich nicht rueckgaengig machen.
              </p>
              <Button
                variant="danger"
                size="lg"
                full
                className="mt-4 sm:w-auto"
                onClick={() => setDelOpen(true)}
              >
                <Trash2 size={20} /> Umzug loeschen
              </Button>
            </Card>
          </>
        ) : null}

        {/* Luft fuer die untere Navigationsleiste */}
        <div className="h-6" />
      </Page>

      <Modal
        open={delOpen}
        onClose={() => {
          setDelOpen(false)
          setConfirmName('')
        }}
        title="Umzug endgueltig loeschen"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setDelOpen(false)
                setConfirmName('')
              }}
            >
              Abbrechen
            </Button>
            <Button
              variant="danger"
              disabled={confirmName.trim() !== project.name}
              loading={deleting}
              onClick={async () => {
                setDeleting(true)
                try {
                  await deleteProject(project.id)
                  toast('Umzug geloescht', 'ok')
                  nav('/app')
                } catch (err) {
                  toast(err instanceof Error ? err.message : String(err), 'error')
                } finally {
                  setDeleting(false)
                }
              }}
            >
              Ja, loeschen
            </Button>
          </>
        }
      >
        <p className="text-base text-ink/80">
          Alles in diesem Umzug wird geloescht: Kisten, Bereiche, Fotos, Nachrichten und
          Mitgliedschaften. Tippe zur Sicherheit den Namen ein.
        </p>
        {/* Der Name steht als eigene Zeile da und nicht in der Beschriftung des
            Feldes, damit ein langer Name umbrechen kann statt auszubrechen. */}
        <p className="t-name mt-4 break-words">{project.name}</p>
        <div className="mt-2">
          <Field label="Name des Umzugs" hint="Muss Zeichen fuer Zeichen stimmen.">
            <Input
              autoFocus
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={project.name}
              className="t-name"
            />
          </Field>
        </div>
      </Modal>
    </>
  )
}
