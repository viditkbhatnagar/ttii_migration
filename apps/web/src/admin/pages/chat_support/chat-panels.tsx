import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Mail, MessageSquare, RefreshCw, Search, Send, Smile, UserRound, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  dayLabel,
  groupByDay,
  initials,
  istClock,
  istDmy,
  roleName,
  timeAgo,
  type ChatFilter,
  type ChatMessage,
  type Conversation,
} from './chat-model.js';

// The three panes of Chat Support: conversation list, chat window, profile.

const FILTERS: Array<{ id: ChatFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'students', label: 'Students' },
  { id: 'centres', label: 'Centres' },
  { id: 'others', label: 'Others' },
];

const QUICK_EMOJIS = ['👍', '🙏', '😊', '✅', '🎉', '👀'];

function Avatar({ conversation, size }: { conversation: Conversation; size: string }) {
  if (conversation.photo) {
    return <img src={conversation.photo} alt="" className={cn('shrink-0 rounded-full object-cover', size)} />;
  }
  return (
    <span aria-hidden="true" className={cn('grid shrink-0 place-items-center rounded-full bg-primary/10 font-semibold text-primary', size)}>
      {initials(conversation.name) || '?'}
    </span>
  );
}

export function ConversationList({
  className, conversations, counts, filter, onFilter, search, onSearch, selectedId, onSelect,
}: {
  className: string;
  conversations: Conversation[];
  counts: Record<ChatFilter, number>;
  filter: ChatFilter;
  onFilter: (f: ChatFilter) => void;
  search: string;
  onSearch: (s: string) => void;
  selectedId: string | null;
  onSelect: (chatId: string) => void;
}) {
  return (
    <aside className={cn('min-h-0 min-w-0 flex-col border-r border-border/70 bg-card', className)} aria-label="Conversations">
      <div className="border-b border-border/70 p-4">
        <div className="relative">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search conversations" placeholder="Search conversations…" value={search} onChange={(e) => onSearch(e.target.value)} className="pl-9" />
        </div>
        <div role="group" aria-label="Filter conversations" className="mt-3 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => onFilter(f.id)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                filter === f.id ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label} <span className="tabular-nums opacity-70">{counts[f.id]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No conversations</p>
        ) : conversations.map((c) => (
          <button
            key={c.chatId}
            type="button"
            aria-current={selectedId === c.chatId ? 'true' : undefined}
            onClick={() => onSelect(c.chatId)}
            className={cn(
              'flex w-full items-start gap-3 border-b border-border/50 px-4 py-3 text-left transition hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none',
              selectedId === c.chatId && 'bg-primary/5 hover:bg-primary/5',
            )}
          >
            <Avatar conversation={c} size="size-11 text-sm" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-foreground">{c.name}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(c.lastAt)}</span>
              </span>
              <span className="mt-0.5 flex items-center justify-between gap-2">
                <span className="truncate text-xs text-muted-foreground">{c.lastMessage || 'No messages'}</span>
                {c.messageCount > 0 ? (
                  <span title={`${c.messageCount} messages`} className="grid h-4 min-w-4 shrink-0 place-items-center rounded-full bg-muted px-1 text-[10px] font-semibold text-muted-foreground">
                    {c.messageCount}
                  </span>
                ) : null}
              </span>
              <span className="mt-1 block text-[10px] uppercase tracking-wide text-muted-foreground/80">{roleName(c.roleId)}</span>
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const mine = message.isAdmin;
  return (
    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <div className="max-w-[75%]">
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2.5 text-sm shadow-[var(--shadow-soft)]',
            mine ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm bg-card text-foreground',
          )}
        >
          <p className="whitespace-pre-wrap break-words leading-relaxed">{message.message}</p>
        </div>
        <p className={cn('mt-1 px-1 text-[10px] text-muted-foreground', mine && 'text-right')}>
          {mine && message.senderName ? `${message.senderName} · ` : ''}{istClock(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

export function ConversationThread({
  className, conversation, messages, loading, error, draft, onDraft, sending, onSend, onRefresh, onBack, profileOpen, onToggleProfile,
}: {
  className: string;
  conversation: Conversation | null;
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  draft: string;
  onDraft: (s: string) => void;
  sending: boolean;
  onSend: () => void;
  onRefresh: () => void;
  onBack: () => void;
  profileOpen: boolean;
  onToggleProfile: () => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const [showEmoji, setShowEmoji] = useState(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  if (!conversation) {
    return (
      <section className={cn('min-h-0 min-w-0 flex-col items-center justify-center gap-2 bg-muted/30 p-8 text-center', className)}>
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MessageSquare aria-hidden="true" className="size-6" />
        </span>
        <p className="text-sm font-medium text-foreground">Select a conversation</p>
        <p className="text-sm text-muted-foreground">Choose a chat from the left panel to start messaging</p>
      </section>
    );
  }

  const canSend = draft.trim() !== '' && !sending;

  return (
    <section className={cn('min-h-0 min-w-0 flex-col overflow-hidden bg-muted/30', className)} aria-label={`Chat with ${conversation.name}`}>
      <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-card px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button size="icon" variant="ghost" className="size-8 lg:hidden" aria-label="Back to conversations" onClick={onBack}>
            <ArrowLeft aria-hidden="true" className="size-4" />
          </Button>
          <Avatar conversation={conversation} size="size-10 text-sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{conversation.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">{roleName(conversation.roleId)}{conversation.email ? ` · ${conversation.email}` : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="size-8" aria-label="Refresh messages" onClick={onRefresh}>
            <RefreshCw aria-hidden="true" className={cn('size-4', loading && 'animate-spin')} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="hidden size-8 lg:inline-flex"
            aria-label={profileOpen ? 'Hide profile' : 'Show profile'}
            aria-pressed={profileOpen}
            onClick={onToggleProfile}
          >
            <Users aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5" aria-live="polite">
        {loading && messages.length === 0 ? (
          <div className="flex flex-col items-center gap-2 pt-8">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-8 w-40" />
          </div>
        ) : error ? (
          <p role="alert" className="mt-8 text-center text-sm text-destructive">{error}</p>
        ) : messages.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">No messages yet</p>
        ) : groupByDay(messages).map((g) => (
          <div key={g.day || 'undated'} className="space-y-3">
            {g.day ? (
              <div className="flex justify-center">
                <span className="rounded-full bg-muted px-3 py-1 text-[10px] font-medium text-muted-foreground">{dayLabel(g.day)}</span>
              </div>
            ) : null}
            {g.messages.map((m) => <Bubble key={m.id} message={m} />)}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="border-t border-border/70 bg-card px-4 py-3">
        {showEmoji ? (
          <div className="mb-2 flex flex-wrap gap-1 rounded-xl border border-border bg-popover p-2 shadow-[var(--shadow-soft)]">
            {QUICK_EMOJIS.map((e) => (
              <button key={e} type="button" aria-label={`Insert ${e}`} onClick={() => onDraft(draft + e)} className="rounded-md px-1.5 py-1 text-lg hover:bg-muted">{e}</button>
            ))}
          </div>
        ) : null}
        <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (canSend) onSend(); }}>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className={cn('size-9 shrink-0', showEmoji && 'bg-muted')}
            aria-label="Emoji"
            aria-pressed={showEmoji}
            onClick={() => setShowEmoji((v) => !v)}
          >
            <Smile aria-hidden="true" className="size-4" />
          </Button>
          <Input
            aria-label="Message"
            placeholder={`Message ${conversation.name}…`}
            value={draft}
            onChange={(e) => onDraft(e.target.value)}
            className="h-10 flex-1 rounded-full border-transparent bg-muted/60 focus-visible:bg-card"
          />
          <Button type="submit" size="icon" className="size-10 shrink-0 rounded-full" aria-label="Send message" disabled={!canSend}>
            <Send aria-hidden="true" className="size-4" />
          </Button>
        </form>
      </div>
    </section>
  );
}

export function ConversationProfile({ conversation, onClose }: { conversation: Conversation; onClose: () => void }) {
  return (
    <aside className="hidden min-h-0 min-w-0 flex-col border-l border-border/70 bg-card lg:flex" aria-label="Profile">
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
        <p className="text-sm font-semibold">Profile</p>
        <Button size="icon" variant="ghost" className="size-7" aria-label="Close profile" onClick={onClose}>
          <X aria-hidden="true" className="size-4" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
        <div className="flex flex-col items-center text-center">
          <Avatar conversation={conversation} size="size-16 text-lg" />
          <p className="mt-3 text-base font-semibold">{conversation.name}</p>
          <p className="text-xs text-muted-foreground">{roleName(conversation.roleId)}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border/70 p-3 text-center">
            <p className="text-lg font-bold tabular-nums">{conversation.messageCount}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Messages</p>
          </div>
          <div className="rounded-xl border border-border/70 p-3 text-center">
            <p className="text-sm font-bold">{istDmy(conversation.firstAt) || '—'}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">First message</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Contact</p>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2"><UserRound aria-hidden="true" className="size-3.5 text-muted-foreground" /> {conversation.name}</div>
            <div className="flex items-center gap-2">
              <Mail aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{conversation.email || '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare aria-hidden="true" className="size-3.5 text-muted-foreground" />
              Last message {istDmy(conversation.lastAt) || '—'}{conversation.lastAt ? `, ${istClock(conversation.lastAt)}` : ''}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
