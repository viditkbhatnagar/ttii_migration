import { describe, expect, test } from 'vitest';

import {
  categoryCounts,
  categoryOf,
  dayLabel,
  filterConversations,
  groupByDay,
  initials,
  istClock,
  istDmy,
  roleName,
  timeAgo,
  toChatMessages,
  toConversations,
} from '../src/admin/pages/chat_support/chat-model';

const conversations = toConversations([
  { chat_id: 101, user_name: 'Asha Menon', user_email: 'asha@example.com', role_id: 2, message_count: 4, last_message: 'When is my exam?', last_message_at: '2026-10-12T05:00:00.000Z', first_message_at: '2026-10-01T05:00:00.000Z' },
  { chat_id: 7, user_name: 'TTC Bepur svk', user_email: 'ttc@example.com', role_id: 7, message_count: 2, last_message: 'Fund request sent', last_message_at: '2026-10-11T05:00:00.000Z' },
  { chat_id: 55, user_name: 'Associate One', role_id: 10, message_count: 1, last_message: 'Hello' },
  { chat_id: 9, user_name: null, role_id: null, message_count: 0 },
  { user_name: 'no chat id — dropped' },
]);

describe('conversations', () => {
  test('students are role 2, centres role 7 (and associates 10), the rest are others', () => {
    expect(categoryOf(2)).toBe('students');
    expect(categoryOf(7)).toBe('centres');
    expect(categoryOf(10)).toBe('centres');
    expect(categoryOf(5)).toBe('others');
    expect(categoryOf(null)).toBe('others');
    expect(conversations).toHaveLength(4);
    expect(conversations[3]?.name).toBe('Unknown');
    expect(categoryCounts(conversations)).toEqual({ all: 4, students: 1, centres: 2, others: 1 });
  });

  test('filters by category and searches name, email and last message', () => {
    expect(filterConversations(conversations, 'centres', '').map((c) => c.chatId)).toEqual(['7', '55']);
    expect(filterConversations(conversations, 'all', 'my exam').map((c) => c.chatId)).toEqual(['101']);
    expect(filterConversations(conversations, 'students', 'ttc')).toHaveLength(0);
  });

  test('role names and initials', () => {
    expect(roleName(7)).toBe('Centre');
    expect(roleName(2)).toBe('Student');
    expect(roleName(42)).toBe('User');
    expect(roleName(null)).toBe('User');
    expect(initials('TTC Bepur svk')).toBe('TB');
  });
});

describe('message times are IST', () => {
  const now = Date.parse('2026-10-12T06:00:00.000Z'); // 11:30 IST

  test('relative times, then a dd/mm/yyyy date', () => {
    expect(timeAgo('2026-10-12T05:59:40.000Z', now)).toBe('now');
    expect(timeAgo('2026-10-12T05:00:00.000Z', now)).toBe('1h');
    expect(timeAgo('2026-10-10T06:00:00.000Z', now)).toBe('2d');
    expect(timeAgo('2026-09-01T20:00:00.000Z', now)).toBe('02/09/2026');
    expect(timeAgo('', now)).toBe('');
  });

  test('clock and day are read on the IST wall clock', () => {
    expect(istClock('2026-10-11T19:00:00.000Z')).toBe('12:30 AM');
    expect(istDmy('2026-10-11T19:00:00.000Z')).toBe('12/10/2026');
    expect(dayLabel('2026-10-12', now)).toBe('Today');
    expect(dayLabel('2026-10-11', now)).toBe('Yesterday');
    expect(dayLabel('2026-09-02', now)).toBe('02 Sep 2026');
  });

  test('messages split into IST days in order', () => {
    const messages = toChatMessages([
      { id: 1, sender_id: 101, sender_name: 'Asha', message: 'Hi', created_at: '2026-10-11T18:00:00.000Z', is_admin: false },
      { id: 2, sender_id: 1, sender_name: 'Admin', message: 'Hello', created_at: '2026-10-11T19:00:00.000Z', is_admin: true },
      { id: 3, sender_id: 101, sender_name: 'Asha', message: 'Thanks', created_at: '2026-10-12T05:00:00.000Z', is_admin: 'true' },
    ]);
    expect(messages[2]?.isAdmin).toBe(false);
    const groups = groupByDay(messages);
    expect(groups.map((g) => g.day)).toEqual(['2026-10-11', '2026-10-12']);
    expect(groups[1]?.messages.map((m) => m.id)).toEqual(['2', '3']);
  });
});
