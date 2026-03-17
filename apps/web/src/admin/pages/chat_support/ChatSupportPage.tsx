import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Paperclip, RefreshCw } from 'lucide-react';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminTabBar, type AdminTab } from '../../shared/components/AdminTabBar.js';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface Conversation {
  chat_id: string;
  user_name: string;
  user_email: string;
  user_photo: string | null;
  role_id: number | null;
  message_count: number;
  last_message: string | null;
  last_message_at: string | null;
}

interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_photo: string | null;
  message: string;
  created_at: string;
  is_admin: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function parseConversation(r: Record<string, unknown>): Conversation {
  return {
    chat_id: asString(r.chat_id),
    user_name: asString(r.user_name) || 'Unknown',
    user_email: asString(r.user_email),
    user_photo: asString(r.user_photo) || null,
    role_id: asNumber(r.role_id) || null,
    message_count: asNumber(r.message_count),
    last_message: asString(r.last_message) || null,
    last_message_at: asString(r.last_message_at) || null,
  };
}

function parseMessage(r: Record<string, unknown>): ChatMessage {
  return {
    id: asString(r.id),
    sender_id: asString(r.sender_id),
    sender_name: asString(r.sender_name),
    sender_photo: asString(r.sender_photo) || null,
    message: asString(r.message),
    created_at: asString(r.created_at),
    is_admin: r.is_admin === true,
  };
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => (w[0] ?? '').toUpperCase())
    .join('');
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return d.toLocaleDateString();
}

function formatMessageTime(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function roleLabel(roleId: number | null): 'Students' | 'Centres' | 'Contact' {
  if (roleId === 5) return 'Students';
  if (roleId === 6) return 'Centres';
  return 'Contact';
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function ChatSupportPage({ api, session }: AdminPageProps) {
  const [activePanel, setActivePanel] = useState<'Students' | 'Centres' | 'Contact'>('Students');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations
  const { data: rawConversations, loading, error, reload } = useAdminPageData(
    () => api.loadChatConversations(session.token),
    [],
  );

  const conversations = useMemo(() => {
    const records = Array.isArray(rawConversations) ? rawConversations : toRecords(rawConversations);
    return records.map(parseConversation);
  }, [rawConversations]);

  // Categorize conversations
  const categorized = useMemo(() => {
    const result = { Students: [] as Conversation[], Centres: [] as Conversation[], Contact: [] as Conversation[] };
    for (const c of conversations) {
      const cat = roleLabel(c.role_id);
      result[cat].push(c);
    }
    return result;
  }, [conversations]);

  const panelConversations = categorized[activePanel];

  const tabs: AdminTab[] = useMemo(() => [
    { id: 'Students', label: 'Students', count: categorized.Students.length },
    { id: 'Centres', label: 'Centres', count: categorized.Centres.length },
    { id: 'Contact', label: 'Contact', count: categorized.Contact.length },
  ], [categorized]);

  const selectedConv = useMemo(
    () => conversations.find((c) => c.chat_id === selectedChatId) ?? null,
    [conversations, selectedChatId],
  );

  // Load messages when a conversation is selected
  const loadMessages = useCallback(async (chatId: string) => {
    setMessagesLoading(true);
    try {
      const raw = await api.loadChatMessages(session.token, chatId);
      setMessages(raw.map(parseMessage));
    } catch {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, [api, session.token]);

  useEffect(() => {
    if (selectedChatId) {
      loadMessages(selectedChatId);
    }
  }, [selectedChatId, loadMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSend = useCallback(async () => {
    if (!messageText.trim() || !selectedChatId) return;
    setSending(true);
    try {
      await api.sendChatMessage(session.token, selectedChatId, messageText.trim());
      setMessageText('');
      await loadMessages(selectedChatId);
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  }, [messageText, selectedChatId, api, session.token, loadMessages]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-red-600">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Chat Support" />

      <Card className="overflow-hidden">
        <div className="grid grid-cols-[320px_1fr] h-[calc(100vh-200px)] min-h-[500px]">

          {/* ── Left Panel: Conversation List ─────────────────────── */}
          <div className="border-r border-gray-200 flex flex-col">
            <div className="p-3 border-b border-gray-200">
              <AdminTabBar
                tabs={tabs}
                activeTab={activePanel}
                onChange={(t) => setActivePanel(t as typeof activePanel)}
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              {panelConversations.length === 0 ? (
                <p className="p-4 text-sm text-gray-400 text-center">No conversations</p>
              ) : (
                panelConversations.map((conv) => (
                  <button
                    key={conv.chat_id}
                    type="button"
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-gray-100 transition-colors hover:bg-gray-50 ${
                      selectedChatId === conv.chat_id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedChatId(conv.chat_id)}
                  >
                    {/* Avatar */}
                    {conv.user_photo ? (
                      <img
                        src={conv.user_photo}
                        alt={conv.user_name}
                        className="size-10 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="size-10 rounded-full bg-ttii-primary/10 text-ttii-primary flex items-center justify-center text-sm font-semibold shrink-0">
                        {initials(conv.user_name)}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <p className="text-sm font-medium text-gray-900 truncate">{conv.user_name}</p>
                        <span className="text-xs text-gray-400 shrink-0 ml-2">
                          {timeAgo(conv.last_message_at ?? '')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{conv.last_message ?? 'No messages'}</p>
                    </div>

                    {conv.message_count > 0 ? (
                      <span className="text-[10px] bg-ttii-primary text-white rounded-full px-1.5 py-0.5 font-medium shrink-0">
                        {conv.message_count}
                      </span>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* ── Right Panel: Message Area ─────────────────────────── */}
          <div className="flex flex-col bg-gray-50">
            {selectedConv ? (
              <>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    {selectedConv.user_photo ? (
                      <img
                        src={selectedConv.user_photo}
                        alt={selectedConv.user_name}
                        className="size-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="size-8 rounded-full bg-ttii-primary/10 text-ttii-primary flex items-center justify-center text-xs font-semibold">
                        {initials(selectedConv.user_name)}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{selectedConv.user_name}</p>
                      <p className="text-xs text-gray-500">{selectedConv.user_email}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => selectedChatId && loadMessages(selectedChatId)}
                  >
                    <RefreshCw className="size-4" />
                  </Button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  {messagesLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2">
                      <Skeleton className="h-8 w-48" />
                      <Skeleton className="h-8 w-64" />
                      <Skeleton className="h-8 w-40" />
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 mt-8">No messages yet</p>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.is_admin ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg px-3 py-2 ${
                            msg.is_admin
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-800 border border-gray-200'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          <p
                            className={`text-[10px] mt-1 ${
                              msg.is_admin ? 'text-blue-200' : 'text-gray-400'
                            }`}
                          >
                            {formatMessageTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input bar */}
                <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="shrink-0 text-gray-400" disabled>
                    <Paperclip className="size-4" />
                  </Button>
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    disabled={!messageText.trim() || sending}
                    onClick={handleSend}
                  >
                    <Send className="size-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm">Choose a chat from the left panel to start messaging</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
