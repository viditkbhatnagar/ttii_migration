import { useState, useCallback, useRef, useEffect } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, asNumber } from '../../../admin/shared/utils/admin-data-utils.js';
import type { StudentPageProps } from '../../routing/student-routes.js';

export default function StudentSupportPage({ api, session }: StudentPageProps) {
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadSupport(session.token),
    [api, session.token],
  );

  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [data?.messages.length, scrollToBottom]);

  const handleSend = useCallback(async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await api.submitSupportMessage(session.token, message.trim());
      setMessage('');
      reload();
    } finally {
      setSending(false);
    }
  }, [api, session.token, message, reload]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-gray-900">Support</h1>
        <Card className="bg-white">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <Button variant="outline" className="mt-4" onClick={reload}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const messages = data?.messages ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Support Chat</h1>

      <Card className="bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="size-5 text-ttii-primary" />
            Conversation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Message thread */}
          <div className="max-h-[500px] min-h-[300px] space-y-3 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50/50 p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <MessageCircle className="size-10 text-gray-300" />
                <p className="text-sm text-gray-500">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const id = asString(msg.id);
                const text = asString(msg.message);
                const senderId = asNumber(msg.sender_id) || asString(msg.sender_id);
                const isStudent = String(senderId) === String(session.userId);
                const createdAt = asString(msg.created_at);

                return (
                  <div
                    key={id}
                    className={`flex ${isStudent ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-xl px-4 py-2.5 ${
                        isStudent
                          ? 'bg-ttii-primary text-white'
                          : 'bg-white text-gray-900 shadow-sm border border-gray-200'
                      }`}
                    >
                      {!isStudent ? (
                        <p className="mb-1 text-xs font-medium text-ttii-primary">Support Agent</p>
                      ) : null}
                      <p className="text-sm leading-relaxed">{text}</p>
                      {createdAt ? (
                        <p className={`mt-1.5 text-[10px] ${isStudent ? 'text-white/60' : 'text-gray-400'}`}>
                          {createdAt}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Compose area */}
          <div className="flex gap-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Type your message..."
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-ttii-primary focus:outline-none focus:ring-1 focus:ring-ttii-primary"
              disabled={sending}
            />
            <Button
              className="bg-ttii-primary hover:bg-ttii-primary/90"
              disabled={sending || !message.trim()}
              onClick={() => void handleSend()}
            >
              <Send className="mr-2 size-4" />
              {sending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
