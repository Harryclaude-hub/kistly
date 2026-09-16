import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
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
      <AppHeader title="Umzug einstellen" back={`/app/p/${project.id}`} />
      <Page>
        <SectionTitle>Grunddaten</SectionTitle>
        <Card className="mb-6 space-y-4 p-4">
          <Field label="Name">
            <Input
              disabled={!canEdit}
              defaultValue={project.name}
              onBlur={(e) => {
                const v = e.target.value.trim()
                if (v && v !== project.name) void save({ name: v })
              }}
            />
          </Field>
          <Field label="Vermerk">
            <Textarea
              rows={2}
              disabled={!canEdit}
              defaultValue={project.note ?? ''}
              onBlur={(e) => void save({ note: e.target.value.trim() || null })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
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
          <p className="text-xs text-muted">
            Angelegt am {fmtDateTime(project.created_at)}. Zuletzt geaendert{' '}
            {fmtDateTime(project.updated_at)}.
          </p>
        </Card>

        {isOwner ? (
          <>
            <SectionTitle>Gefahrenbereich</SectionTitle>
            <Card className="border-danger/30 p-4">
              <p className="font-bold text-danger">Umzug loeschen</p>
              <p className="mt-1 text-sm text-muted">
                Loescht Kisten, Bereiche, Fotos, Nachrichten und alle Mitgliedschaften.
                Das laesst sich nicht rueckgaengig machen.
              </p>
              <Button variant="danger" className="mt-3" onClick={() => setDelOpen(true)}>
                <Trash2 size={16} /> Loeschen
              </Button>
            </Card>
          </>
        ) : null}
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
        <p className="text-sm text-ink/80">
          Alles in diesem Umzug wird geloescht: Kisten, Bereiche, Fotos, Nachrichten und
          Mitgliedschaften. Tippe zur Sicherheit den Namen ein.
        </p>
        <Field label={`Name des Umzugs: ${project.name}`}>
          <Input
            autoFocus
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={project.name}
            className="mt-3"
          />
        </Field>
      </Modal>
    </>
  )
}
