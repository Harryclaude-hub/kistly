/* Merkt sich, in welchem Umzug man zuletzt war.
 * Damit springt die untere Leiste direkt in den richtigen Chat, und die App
 * oeffnet nach dem Start dort, wo man aufgehoert hat.
 * Genau eine Stelle, an der dieser Wert gelesen und geschrieben wird.
 */
const KEY = 'kistly.lastProject'

export function setLastProject(id: string | null): void {
  try {
    if (id) localStorage.setItem(KEY, id)
    else localStorage.removeItem(KEY)
  } catch {
    /* privater Modus oder voller Speicher, die App laeuft trotzdem weiter */
  }
}

export function getLastProject(): string | null {
  try {
    const v = localStorage.getItem(KEY)
    return v && /^[0-9a-f-]{36}$/i.test(v) ? v : null
  } catch {
    return null
  }
}

/** Ziel fuer die untere Leiste. Ohne bekannten Umzug geht es zur Uebersicht. */
export function projectPath(suffix: string): string {
  const id = getLastProject()
  return id ? `/app/p/${id}${suffix}` : '/app'
}
