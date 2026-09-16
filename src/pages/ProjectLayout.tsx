import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useParams } from 'react-router-dom'
import { Button, ErrorBox, Loading } from '../components/ui'
import { CallProvider } from '../components/CallLayer'
import { getProject, listMembers, listTags } from '../lib/api'
import { useAuth } from '../lib/auth'
import type { MemberRole, Project, ProjectMember, Tag } from '../lib/types'
import { useAppShell } from './AppLayout'

interface ProjectCtxValue {
  project: Project
  setProject: (p: Project) => void
  tags: Tag[]
  rooms: Tag[]
  people: Tag[]
  tagById: (id: string | null | undefined) => Tag | undefined
  members: ProjectMember[]
  role: MemberRole
  canEdit: boolean
  isOwner: boolean
  reloadTags: () => Promise<void>
  reloadMembers: () => Promise<void>
  unread: number
  clearUnread: () => void
}

const Ctx = createContext<ProjectCtxValue | null>(null)

export function useProject(): ProjectCtxValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useProject ausserhalb von ProjectLayout')
  return v
}

export default function ProjectLayout() {
  const { pid = '' } = useParams()
  const { user } = useAuth()
  const shell = useAppShell()
  const remember = shell.rememberProject

  const [project, setProject] = useState<Project | null>(null)
  const [tags, setTags] = useState<Tag[]>([])
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const reloadTags = useCallback(async () => {
    setTags(await listTags(pid))
  }, [pid])

  const reloadMembers = useCallback(async () => {
    setMembers(await listMembers(pid))
  }, [pid])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    Promise.all([getProject(pid), listTags(pid), listMembers(pid)])
      .then(([p, t, m]) => {
        if (!alive) return
        setProject(p)
        setTags(t)
        setMembers(m)
        setLoading(false)
        // Damit die untere Leiste weiss, wohin Kisten und Chat fuehren.
        remember(p.id)
      })
      .catch((err: unknown) => {
        if (!alive) return
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [pid, remember])

  const me = members.find((m) => m.user_id === user?.id)
  // Absichtlich nur rememberProject in den Abhaengigkeiten. Das ganze
  // shell-Objekt wechselt bei jeder ungelesenen Nachricht, dann wuerde der
  // Umzug immer wieder neu geladen.

  const value = useMemo<ProjectCtxValue | null>(() => {
    if (!project) return null
    const role = me?.role ?? 'viewer'
    return {
      project,
      setProject,
      tags,
      rooms: tags.filter((t) => t.kind === 'room'),
      people: tags.filter((t) => t.kind === 'person'),
      tagById: (id) => (id ? tags.find((t) => t.id === id) : undefined),
      members,
      role,
      canEdit: role === 'owner' || role === 'editor',
      isOwner: role === 'owner',
      reloadTags,
      reloadMembers,
      unread: shell.unread,
      clearUnread: shell.clearUnread,
    }
  }, [project, tags, members, me, reloadTags, reloadMembers, shell.unread, shell.clearUnread])

  if (loading) return <Loading label="Umzug wird geladen" />
  if (error || !value)
    return (
      <div className="mx-auto max-w-lg p-6">
        <ErrorBox error={error ?? 'Unbekannter Fehler'} />
        <Link to="/app" className="mt-4 inline-block">
          <Button variant="outline">Zur Uebersicht</Button>
        </Link>
      </div>
    )

  return (
    <Ctx.Provider value={value}>
      <CallProvider projectId={pid} projectName={value.project.name} members={members}>
        <Outlet />
      </CallProvider>
    </Ctx.Provider>
  )
}
