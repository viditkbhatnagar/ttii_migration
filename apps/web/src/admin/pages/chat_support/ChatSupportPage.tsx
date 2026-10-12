import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import { cn } from '@/lib/utils';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString } from '../../shared/utils/admin-data-utils.js';
import { PageTitle } from '../../shared/components/ui-kit.js';
import {
  categoryCounts,
  filterConversations,
  toChatMessages,
  toConversations,
  type ChatFilter,
  type ChatMessage,
} from './chat-model.js';
import { ConversationList, ConversationProfile, ConversationThread } from './chat-panels.js';

// Chat Support (TTII 2026-10-12), rebuilt after Naji's ChatSupportModule:
// conversation list (search + filter pills) | chat window | profile panel.
// Same endpoints as before — conversations, messages, send { chat_id, message }
// — and the same refresh. The prototype's reactions, read receipts, typing
// indicator, attachments, star / archive / close and broadcast have no backend
// and are left out.

export default function ChatSupportPage({ api, session }: AdminPageProps) {
  const [filter, setFilter] = useState<ChatFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [showProfile, setShowProfile] = useState(true);

  const { data, loading, error, reload } = useAdminPageData(
    async () => toConversations(await api.loadChatConversations(session.token)),
    [],
    'admin:chat:conversations',
  );
  const conversations = useMemo(() => data ?? [], [data]);
  const counts = useMemo(() => categoryCounts(conversations), [conversations]);
  const visible = useMemo(() => filterConversations(conversations, filter, search), [conversations, filter, search]);
  const selected = useMemo(() => conversations.find((c) => c.chatId === selectedId) ?? null, [conversations, selectedId]);

  const loadMessages = useCallback(async (chatId: string) => {
    setMessagesLoading(true);
    setMessagesError(null);
    try {
      setMessages(toChatMessages(await api.loadChatMessages(session.token, chatId)));
    } catch (err) {
      setMessages([]);
      setMessagesError(err instanceof Error ? err.message : 'Could not load messages.');
    } finally {
      setMessagesLoading(false);
    }
  }, [api, session.token]);

  useEffect(() => {
    if (selectedId) void loadMessages(selectedId);
  }, [selectedId, loadMessages]);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || !selectedId || sending) return;
    setSending(true);
    try {
      const res = await api.sendChatMessage(session.token, selectedId, text);
      if (res.status === 0) {
        toast.error(asString(res.message) || 'Message not sent.');
        return;
      }
      setDraft('');
      await loadMessages(selectedId);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Message not sent.');
    } finally {
      setSending(false);
    }
  }, [draft, selectedId, sending, api, session.token, loadMessages, reload]);

  const open = (chatId: string) => {
    if (chatId !== selectedId) {
      setMessages([]);
      setDraft('');
    }
    setSelectedId(chatId);
  };

  if (loading) return <PageLoader label="Loading chat support..." />;
  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-destructive">
          {error}
          <div className="mt-4"><Button variant="outline" onClick={reload}>Retry</Button></div>
        </CardContent>
      </Card>
    );
  }

  const totalMessages = conversations.reduce((sum, c) => sum + c.messageCount, 0);

  return (
    <div className="space-y-4">
      <PageTitle
        title="Chat Support"
        subtitle={`${conversations.length} conversations · ${totalMessages} messages`}
      />

      <div
        className={cn(
          'grid h-[calc(100vh-14rem)] min-h-[520px] grid-cols-1 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-card)]',
          selected && showProfile ? 'lg:grid-cols-[288px_minmax(0,1fr)_300px]' : 'lg:grid-cols-[288px_minmax(0,1fr)]',
        )}
      >
        <ConversationList
          className={selected ? 'hidden lg:flex' : 'flex'}
          conversations={visible}
          counts={counts}
          filter={filter}
          onFilter={setFilter}
          search={search}
          onSearch={setSearch}
          selectedId={selectedId}
          onSelect={open}
        />
        <ConversationThread
          className={selected ? 'flex' : 'hidden lg:flex'}
          conversation={selected}
          messages={messages}
          loading={messagesLoading}
          error={messagesError}
          draft={draft}
          onDraft={setDraft}
          sending={sending}
          onSend={() => void send()}
          onRefresh={() => { if (selectedId) void loadMessages(selectedId); }}
          onBack={() => setSelectedId(null)}
          profileOpen={showProfile}
          onToggleProfile={() => setShowProfile((v) => !v)}
        />
        {selected && showProfile ? (
          <ConversationProfile conversation={selected} onClose={() => setShowProfile(false)} />
        ) : null}
      </div>
    </div>
  );
}
