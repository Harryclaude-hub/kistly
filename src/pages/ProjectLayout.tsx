import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useLocation, useParams } from 'react-router-dom'
import { Boxes, Home, MessageCircle, ScanLine, Users } from 'lucide-react'
import { BottomNav, NavTab } from '../components/AppShell'
import { CallProvider } from '../components/CallLayer'
import { Button, ErrorBox, Loading } from '../components/ui'
import { countUnread, getProject, listMembers, listTags } from '../lib/api'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { MemberRole, Project, ProjectMember, Tag } from '../lib/types'

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
  const loc = useLocation()

  const [project, setProject] = useState<Project | null>(null)
  const [tags, setTags] = useState<Tag[]>([])
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [unread, setUnread] = useState(0)
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
      })
      .catch((err: unknown) => {
        if (!alive) return
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [pid])

  const me = members.find((m) => m.user_id === user?.id)

  const refreshUnread = useCallback(async () => {
    if (!me) return
    setUnread(await countUnread(pid, me.last_read_at))
  }, [pid, me])

  useEffect(() => {
    void refreshUnread()
  }, [refreshUnread])

  // Neue Nachrichten zaehlen, solange man nicht im Chat ist.
  useEffect(() => {
    if (!pid || !user?.id) return
    const ch = supabase
      .channel(`unread-${pid}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `project_id=eq.${pid}` },
        (payload) => {
          const m = payload.new as { sender_id: string | null }
          if (m.sender_id === user.id) return
          if (loc.pathname.endsWith('/chat')) return
          setUnread((n) => n + 1)
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(ch)
    }
  }, [pid, user?.id, loc.pathname])

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
      unread,
      clearUnread: () => setUnread(0),
    }
  }, [project, tags, members, me, unread, reloadTags, reloadMembers])

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

  const base = `/app/p/${pid}`
  const path = loc.pathname
  const isItems = path.startsWith(`${base}/kisten`)

  return (
    <Ctx.Provider value={value}>
      <CallProvider projectId={pid} projectName={value.project.name} members={members}>
        <div className="flex min-h-screen flex-col bg-paper">
          <div className="flex-1">
            <Outlet />
          </div>

          <BottomNav>
            <NavTab to={base} icon={<Home size={19} />} label="Start" active={path === base} />
            <NavTab
              to={`${base}/kisten`}
              icon={<Boxes size={19} />}
              label="Kisten"
              active={isItems}
            />
            <NavTab
              to={`${base}/scan`}
              icon={<ScanLine size={19} />}
              label="Scannen"
              active={path === `${base}/scan`}
            />
            <NavTab
              to={`${base}/chat`}
              icon={<MessageCircle size={19} />}
              label="Chat"
              active={path === `${base}/chat`}
              badge={unread}
            />
            <NavTab
              to={`${base}/team`}
              icon={<Users size={19} />}
              label="Team"
              active={path === `${base}/team`}
            />
          </BottomNav>
        </div>
      </CallProvider>
    </Ctx.Provider>
  )
}
