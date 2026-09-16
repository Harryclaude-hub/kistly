import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { Button, CodeChip, ErrorBox, Input, Loading, Modal, useToast } from './ui'
import { listItems, moveContent } from '../lib/api'
import { useSprache } from '../lib/i18n'
import type { Item, ItemContent } from '../lib/types'
import { useDebounced } from '../lib/util'

/* Einen einzelnen Inhalt in eine andere Kiste umhaengen.
 *
 * Das ist der Fall, den man beim Packen staendig hat: das Buch liegt in
 * der falschen Kiste. Die Kiste bleibt, wo sie ist, nur der Eintrag
 * wandert.
 *
 * Gesucht wird ueber api.ts mit Begrenzung, nicht alles auf einmal. Ein
 * Umzug mit zweitausend Kisten wuerde die Antwort sonst sprengen.
 */
export function InhaltVerschieben({
  offen,
  projectId,
  quelleId,
  inhalt,
  onClose,
  onFertig,
}: {
  offen: boolean
  projectId: string
  /** Die Kiste, in der der Eintrag gerade liegt. Sie faellt aus der Liste. */
  quelleId: string
  inhalt: ItemContent | null
  onClose: () => void
  onFertig: (inhaltId: string) => void
}) {
  const { t } = useSprache()
  const toast = useToast()
  const [suche, setSuche] = useState('')
  const gebremst = useDebounced(suche, 300)
  const [treffer, setTreffer] = useState<Item[]>([])
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (!offen) return
    let alive = true
    setLaedt(true)
    setFehler(null)
    void listItems(projectId, { search: gebremst, limit: 25, sort: 'code' })
      .then((seite) => {
        if (!alive) return
        setTreffer(seite.rows.filter((i) => i.id !== quelleId))
        setLaedt(false)
      })
      .catch((err: unknown) => {
        if (!alive) return
        setFehler(err instanceof Error ? err.message : String(err))
        setLaedt(false)
      })
    return () => {
      alive = false
    }
  }, [offen, projectId, quelleId, gebremst])

  // Bei jedem Oeffnen frisch anfangen, sonst steht die Suche von vorhin da.
  useEffect(() => {
    if (offen) setSuche('')
  }, [offen])

  return (
    <Modal
      open={offen}
      onClose={onClose}
      title={t('inhalt.ziel_waehlen')}
      footer={
        <Button variant="ghost" onClick={onClose}>
          {t('aktion.abbrechen')}
        </Button>
      }
    >
      {inhalt ? <p className="t-name mb-3 break-words">{inhalt.text}</p> : null}

      <div className="relative mb-3">
        <Search size={19} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
        <Input
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          placeholder={t('inhalt.suche')}
          className="ps-10"
          autoFocus
        />
      </div>

      {laedt ? (
        <Loading label={t('kisten.laedt')} />
      ) : fehler ? (
        <ErrorBox error={fehler} />
      ) : treffer.length === 0 ? (
        <p className="py-6 text-center text-base text-muted">{t('inhalt.keine_kisten')}</p>
      ) : (
        <ul className="zebra divide-y divide-line overflow-hidden rounded-xl border border-line">
          {treffer.map((ziel) => (
            <li key={ziel.id}>
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => {
                  if (!inhalt) return
                  setBusyId(ziel.id)
                  void moveContent(inhalt.id, ziel.id, projectId)
                    .then(() => {
                      toast(
                        t('inhalt.verschoben', { text: inhalt.text, code: ziel.code }),
                        'ok',
                      )
                      onFertig(inhalt.id)
                      onClose()
                    })
                    .catch((err: unknown) => {
                      toast(err instanceof Error ? err.message : String(err), 'error')
                    })
                    .finally(() => setBusyId(null))
                }}
                className="flex w-full items-center gap-3 px-3 py-3 text-start transition hover:bg-raised disabled:opacity-50"
              >
                <CodeChip code={ziel.code} size="sm" />
                <span className="min-w-0 flex-1 truncate">
                  {ziel.title || t(`art.${ziel.kind}`)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
