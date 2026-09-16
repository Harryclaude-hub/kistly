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
import { useT } from '../lib/i18n'
import { fmtDateTime } from '../lib/util'

export default function ProjectSettings() {
  const { project, setProject, canEdit, isOwner } = useProject()
  const t = useT()
  const toast = useToast()
  const nav = useNavigate()
  const [delOpen, setDelOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmName, setConfirmName] = useState('')

  async function save(patch: Parameters<typeof updateProject>[1]) {
    try {
      setProject(await updateProject(project.id, patch))
      toast(t('team.gespeichert'), 'ok')
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
    }
  }

  return (
    <>
      <AppHeader
        title={t('team.einstellen_titel')}
        subtitle={project.name}
        back={`/app/p/${project.id}`}
      />
      <Page>
        <SectionTitle>{t('team.grunddaten')}</SectionTitle>
        <Card className="mb-6 space-y-5 p-5">
          <p className="t-sub">
            {canEdit ? t('team.speichert_beim_verlassen') : t('team.nur_lesen')}
          </p>

          <Field label={t('team.umzug_name')}>
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
          <Field label={t('team.vermerk')} hint={t('team.vermerk_hinweis')}>
            <Textarea
              rows={2}
              disabled={!canEdit}
              defaultValue={project.note ?? ''}
              onBlur={(e) => void save({ note: e.target.value.trim() || null })}
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t('team.alte_adresse')}>
              <Input
                disabled={!canEdit}
                defaultValue={project.from_address ?? ''}
                onBlur={(e) => void save({ from_address: e.target.value.trim() || null })}
              />
            </Field>
            <Field label={t('team.neue_adresse')}>
              <Input
                disabled={!canEdit}
                defaultValue={project.to_address ?? ''}
                onBlur={(e) => void save({ to_address: e.target.value.trim() || null })}
              />
            </Field>
          </div>
          <Field label={t('team.umzugstag')}>
            <Input
              type="date"
              disabled={!canEdit}
              defaultValue={project.move_date ?? ''}
              onChange={(e) => void save({ move_date: e.target.value || null })}
            />
          </Field>
          <p className="t-sub">
            {t('team.zeitstempel', {
              angelegt: fmtDateTime(project.created_at),
              geaendert: fmtDateTime(project.updated_at),
            })}
          </p>
        </Card>

        <SectionTitle>{t('begriff.mitglieder')}</SectionTitle>
        <Card className="mb-6 p-5">
          <p className="t-name">{t('team.karte_titel')}</p>
          <p className="t-sub mt-1.5">{t('team.karte_hinweis')}</p>
          <Link to={`/app/p/${project.id}/team`} className="mt-4 block sm:inline-block">
            <Button variant="soft" size="lg" full className="sm:w-auto">
              <Users size={20} /> {t('team.karte_knopf')}
            </Button>
          </Link>
        </Card>

        {isOwner ? (
          <>
            <SectionTitle>{t('team.gefahr_titel')}</SectionTitle>
            <Card className="border-danger/30 p-5">
              <p className="t-name text-danger">{t('team.umzug_loeschen')}</p>
              <p className="t-sub mt-1.5">{t('team.umzug_loeschen_hinweis')}</p>
              <Button
                variant="danger"
                size="lg"
                full
                className="mt-4 sm:w-auto"
                onClick={() => setDelOpen(true)}
              >
                <Trash2 size={20} /> {t('team.umzug_loeschen')}
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
        title={t('team.loeschen_titel')}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setDelOpen(false)
                setConfirmName('')
              }}
            >
              {t('aktion.abbrechen')}
            </Button>
            <Button
              variant="danger"
              disabled={confirmName.trim() !== project.name}
              loading={deleting}
              onClick={async () => {
                setDeleting(true)
                try {
                  await deleteProject(project.id)
                  toast(t('team.geloescht'), 'ok')
                  nav('/app')
                } catch (err) {
                  toast(err instanceof Error ? err.message : String(err), 'error')
                } finally {
                  setDeleting(false)
                }
              }}
            >
              {t('team.loeschen_ja')}
            </Button>
          </>
        }
      >
        <p className="text-base text-ink/80">{t('team.loeschen_text')}</p>
        {/* Der Name steht als eigene Zeile da und nicht in der Beschriftung des
            Feldes, damit ein langer Name umbrechen kann statt auszubrechen. */}
        <p className="t-name mt-4 break-words">{project.name}</p>
        <div className="mt-2">
          <Field label={t('team.umzug_name')} hint={t('team.loeschen_name_hinweis')}>
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
