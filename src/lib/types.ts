/* Datenmodell, passend zu supabase/migrations.
 * Wenn sich eine Migration aendert, aendert sich diese Datei im selben
 * Arbeitsgang. Zwei Fassungen, die auseinanderlaufen, sind der teuerste
 * Fehler in diesem Projekt.
 */

export type MemberRole = 'owner' | 'editor' | 'viewer'
export type TagKind = 'room' | 'person'
export type ItemKind = 'box' | 'furniture' | 'bag' | 'other'
export type ItemStatus = 'open' | 'transit' | 'arrived'
export type MessageKind = 'text' | 'image' | 'voice' | 'file' | 'system' | 'call'
export type CallStatus = 'ringing' | 'active' | 'ended' | 'missed' | 'declined'

export interface Profile {
  id: string
  display_name: string | null
  email: string | null
  avatar_path: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  note: string | null
  from_address: string | null
  to_address: string | null
  move_date: string | null
  owner_id: string
  archived: boolean
  created_at: string
  updated_at: string
}

export interface ProjectMember {
  project_id: string
  user_id: string
  role: MemberRole
  last_read_at: string
  created_at: string
  profile?: Profile | null
}

export interface ProjectInvite {
  id: string
  project_id: string
  code: string
  role: MemberRole
  created_by: string | null
  expires_at: string | null
  max_uses: number | null
  uses: number
  active: boolean
  created_at: string
}

export interface Tag {
  id: string
  project_id: string
  kind: TagKind
  name: string
  short: string
  color: string
  note: string | null
  sort: number
  created_at: string
}

export interface Item {
  id: string
  project_id: string
  kind: ItemKind
  title: string | null
  room_id: string | null
  person_id: string | null
  code_source: TagKind
  prefix: string
  size: number
  seq: number
  code: string
  status: ItemStatus
  note: string | null
  fragile: boolean
  target_room: string | null
  arrived_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ItemContent {
  id: string
  item_id: string
  project_id: string
  text: string
  qty: number
  checked: boolean
  sort: number
  created_at: string
}

export interface ItemPhoto {
  id: string
  item_id: string
  project_id: string
  path: string
  caption: string | null
  created_by: string | null
  created_at: string
}

export interface ItemEvent {
  id: number
  project_id: string
  item_id: string | null
  user_id: string | null
  type: string
  data: Record<string, unknown>
  created_at: string
}

export interface Message {
  id: string
  project_id: string
  sender_id: string | null
  kind: MessageKind
  body: string | null
  attachment_path: string | null
  attachment_meta: Record<string, unknown>
  reply_to: string | null
  call_id: string | null
  edited_at: string | null
  deleted_at: string | null
  created_at: string
}

export interface MessageReaction {
  message_id: string
  user_id: string
  emoji: string
  project_id: string
  created_at: string
}

export interface MessageLink {
  id: string
  message_id: string
  project_id: string
  target_type: 'item' | 'tag'
  target_id: string
  label: string | null
}

export interface Call {
  id: string
  project_id: string
  created_by: string | null
  video: boolean
  status: CallStatus
  started_at: string | null
  ended_at: string | null
  created_at: string
}

export interface CallParticipant {
  call_id: string
  user_id: string
  state: 'invited' | 'joined' | 'left' | 'declined' | 'missed'
  joined_at: string | null
  left_at: string | null
}

export interface NotificationPrefs {
  user_id: string
  chat: boolean
  calls: boolean
  items: boolean
}

export interface ProjectStats {
  project_id: string
  items_total: number
  items_arrived: number
  items_transit: number
  items_open: number
}

/* --------------------------------------------------------- Anzeigehilfen */

export const STATUS_LABEL: Record<ItemStatus, string> = {
  open: 'Alte Wohnung',
  transit: 'Unterwegs',
  arrived: 'Angekommen',
}

export const STATUS_COLOR: Record<ItemStatus, string> = {
  open: '#ef4444',
  transit: '#f59e0b',
  arrived: '#16a34a',
}

export const KIND_LABEL: Record<ItemKind, string> = {
  box: 'Kiste',
  furniture: 'Moebelstueck',
  bag: 'Tasche',
  other: 'Sonstiges',
}

export const SIZE_LABEL: Record<number, string> = {
  1: 'winzig',
  2: 'sehr klein',
  3: 'klein',
  4: 'eher klein',
  5: 'mittel',
  6: 'eher gross',
  7: 'gross',
  8: 'sehr gross',
  9: 'riesig',
  10: 'sperrig',
}

export const ROLE_LABEL: Record<MemberRole, string> = {
  owner: 'Besitzer',
  editor: 'Bearbeiter',
  viewer: 'Nur lesen',
}

export const TAG_COLORS = [
  '#2563EB',
  '#0EA5E9',
  '#14B8A6',
  '#16A34A',
  '#84CC16',
  '#F59E0B',
  '#F97316',
  '#EF4444',
  '#EC4899',
  '#A855F7',
  '#7C3AED',
  '#64748B',
  '#A16207',
  '#0F766E',
]
