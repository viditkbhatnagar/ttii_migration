import { LEGACY_ROLE_ID } from '@ttii/shared-types';
import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';

// Chat Support view model (TTII 2026-10-12, Naji's ChatSupportModule). Rows
// come from GET /admin/chat_support/conversations and /messages. A
// conversation's chat_id is the user who opened it (student app or centre /
// associate portal); messages from anyone else are admin replies.
//
// The old page grouped by role 5 = Students and 6 = Centres, ids no account
// has (students are 2, centres 7), so every chat landed under "Contact".

export type ChatCategory = 'students' | 'centres' | 'others';
export type ChatFilter = 'all' | ChatCategory;

export interface Conversation {
  chatId: string;
  name: string;
  email: string;
  photo: string;
  roleId: number | null;
  category: ChatCategory;
  messageCount: number;
  lastMessage: string;
  lastAt: string;
  firstAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  createdAt: string;
  isAdmin: boolean;
}

const ROLE_NAME: Record<number, string> = {
  [LEGACY_ROLE_ID.ADMIN]: 'Admin',
  [LEGACY_ROLE_ID.STUDENT]: 'Student',
  [LEGACY_ROLE_ID.INSTRUCTOR]: 'Instructor',
  [LEGACY_ROLE_ID.CENTRE]: 'Centre',
  [LEGACY_ROLE_ID.SUBADMIN]: 'Sub-admin',
  [LEGACY_ROLE_ID.COUNSELLOR]: 'Counsellor',
  [LEGACY_ROLE_ID.ASSOCIATE]: 'Associate',
};

export function roleName(roleId: number | null): string {
  return (roleId !== null && ROLE_NAME[roleId]) || 'User';
}

/** Students (role 2); centres and associates share the centre portal's support chat. */
export function categoryOf(roleId: number | null): ChatCategory {
  if (roleId === LEGACY_ROLE_ID.STUDENT) return 'students';
  if (roleId === LEGACY_ROLE_ID.CENTRE || roleId === LEGACY_ROLE_ID.ASSOCIATE) return 'centres';
  return 'others';
}

export function toConversation(r: Record<string, unknown>): Conversation {
  const roleId = asNumber(r.role_id) || null;
  return {
    chatId: asString(r.chat_id),
    name: asString(r.user_name) || 'Unknown',
    email: asString(r.user_email),
    photo: asString(r.user_photo),
    roleId,
    category: categoryOf(roleId),
    messageCount: asNumber(r.message_count),
    lastMessage: asString(r.last_message),
    lastAt: asString(r.last_message_at),
    firstAt: asString(r.first_message_at),
  };
}

export function toConversations(data: unknown): Conversation[] {
  return Array.isArray(data)
    ? data.filter((r): r is Record<string, unknown> => !!r && typeof r === 'object').map(toConversation).filter((c) => c.chatId)
    : [];
}

export function toChatMessages(data: unknown): ChatMessage[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
    .map((r) => ({
      id: asString(r.id),
      senderId: asString(r.sender_id),
      senderName: asString(r.sender_name),
      message: asString(r.message),
      createdAt: asString(r.created_at),
      isAdmin: r.is_admin === true,
    }));
}

export function filterConversations(rows: Conversation[], filter: ChatFilter, search: string): Conversation[] {
  const q = search.trim().toLowerCase();
  return rows.filter((c) => {
    if (filter !== 'all' && c.category !== filter) return false;
    if (!q) return true;
    return [c.name, c.email, c.lastMessage].some((v) => v.toLowerCase().includes(q));
  });
}

export function categoryCounts(rows: Conversation[]): Record<ChatFilter, number> {
  return {
    all: rows.length,
    students: rows.filter((c) => c.category === 'students').length,
    centres: rows.filter((c) => c.category === 'centres').length,
    others: rows.filter((c) => c.category === 'others').length,
  };
}

export function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => (w[0] ?? '').toUpperCase()).join('');
}

const IST_OFFSET_MS = 330 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The IST wall clock of an instant as UTC fields (read them with getUTC*). */
function istParts(iso: string): Date | null {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : new Date(ms + IST_OFFSET_MS);
}

/** "now", "5m", "3h", "2d", else dd/mm/yyyy (IST). */
export function timeAgo(iso: string, nowMs: number = Date.now()): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '';
  const min = Math.floor((nowMs - ms) / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return istDmy(iso);
}

/** dd/mm/yyyy of an instant in IST. */
export function istDmy(iso: string): string {
  const d = istParts(iso);
  if (!d) return '';
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

/** "7:30 PM" of an instant in IST. */
export function istClock(iso: string): string {
  const d = istParts(iso);
  if (!d) return '';
  const h = d.getUTCHours();
  return `${((h + 11) % 12) + 1}:${String(d.getUTCMinutes()).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

/** IST calendar day key YYYY-MM-DD. */
export function istDayKey(iso: string): string {
  const d = istParts(iso);
  return d ? d.toISOString().slice(0, 10) : '';
}

/** "Today", "Yesterday" or "12 Oct 2026" for a day key, relative to now in IST. */
export function dayLabel(dayKey: string, nowMs: number = Date.now()): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!m) return '';
  const today = new Date(nowMs + IST_OFFSET_MS).toISOString().slice(0, 10);
  const yesterday = new Date(nowMs + IST_OFFSET_MS - 86_400_000).toISOString().slice(0, 10);
  if (dayKey === today) return 'Today';
  if (dayKey === yesterday) return 'Yesterday';
  return `${m[3]} ${MONTHS[Number(m[2]) - 1] ?? ''} ${m[1]}`;
}

/** Messages split into IST days, in order, for the date separators. */
export function groupByDay(messages: ChatMessage[]): Array<{ day: string; messages: ChatMessage[] }> {
  const groups: Array<{ day: string; messages: ChatMessage[] }> = [];
  for (const msg of messages) {
    const day = istDayKey(msg.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.messages.push(msg);
    else groups.push({ day, messages: [msg] });
  }
  return groups;
}
