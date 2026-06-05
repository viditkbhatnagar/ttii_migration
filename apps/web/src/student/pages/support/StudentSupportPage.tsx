import { useState, useCallback, useRef, useEffect } from 'react';
import { Send, MessageCircle, RefreshCw, Headphones, Mail, Phone, MapPin, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, asNumber } from '../../../admin/shared/utils/admin-data-utils.js';
import type { StudentPageProps } from '../../routing/student-routes.js';

const SUPPORT_TYPES = ['General', 'Technical', 'Academic', 'Billing'] as const;

const CONTACT_INFO = [
  { icon: Mail, label: 'Email', value: 'support@teachersindia.in', color: 'bg-blue-100 text-blue-600' },
  { icon: Phone, label: 'Phone', value: '+91-XXXX-XXXXXX', color: 'bg-emerald-100 text-emerald-600' },
  { icon: MapPin, label: 'Address', value: 'Teacher\'s Training Institute of India', color: 'bg-purple-100 text-purple-600' },
  { icon: Clock, label: 'Hours', value: 'Mon - Sat, 9 AM - 6 PM', color: 'bg-amber-100 text-amber-600' },
];

function formatChatTimestamp(dateStr: string): string {
  if (!dateStr) return '';

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;

  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  if (isToday) return `Today ${timeStr}`;
  if (isYesterday) return `Yesterday ${timeStr}`;

  return `${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} ${timeStr}`;
}

export default function StudentSupportPage({ api, session }: StudentPageProps) {
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadSupport(session.token),
    [api, session.token],
    `student:support:${session.userId}`,
  );

  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('General');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [data?.messages.length, scrollToBottom]);

  useEffect(() => {
    refreshIntervalRef.current = setInterval(() => {
      reload();
    }, 15000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [reload]);

  const handleSend = useCallback(async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const prefixedMessage = `[${selectedType}] ${message.trim()}`;
      await api.submitSupportMessage(session.token, prefixedMessage);
      setMessage('');
      reload();
    } finally {
      setSending(false);
    }
  }, [api, session.token, message, selectedType, reload]);

  if (loading) {
    return <PageLoader label="Loading student support..." />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-student-text">Help Center</h1>
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="outline" className="mt-4" onClick={reload}>Retry</Button>
        </div>
      </div>
    );
  }

  const messages = data?.messages ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-student-text">Help Center</h1>
          <p className="mt-1 text-sm text-student-muted">Get in touch with our support team</p>
        </div>
        <Button variant="outline" size="sm" onClick={reload} className="rounded-xl">
          <RefreshCw className="mr-2 size-3.5" />
          Refresh
        </Button>
      </div>

      {/* Contact Info Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CONTACT_INFO.map((info) => {
          const Icon = info.icon;
          return (
            <div key={info.label} className="rounded-2xl border border-slate-200/80 bg-white p-5 transition-all hover:shadow-md">
              <div aria-hidden="true" className={`inline-flex size-10 items-center justify-center rounded-full ${info.color} mb-3`}>
                <Icon className="size-5" />
              </div>
              <p className="text-xs font-medium uppercase tracking-wider text-student-muted">{info.label}</p>
              <p className="mt-1 text-sm font-medium text-student-text">{info.value}</p>
            </div>
          );
        })}
      </div>

      {/* Chat Section */}
      <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="size-5 text-student-primary" />
            Conversation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Support Type Selector */}
          <div role="radiogroup" aria-label="Support category" className="flex flex-wrap gap-2">
            {SUPPORT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={selectedType === type}
                className={`rounded-full px-4 text-sm font-medium transition-all h-9 max-sm:h-11 ${
                  selectedType === type
                    ? 'bg-student-primary text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                onClick={() => setSelectedType(type)}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Message thread */}
          <div
            role="log"
            aria-label="Support conversation"
            aria-live="polite"
            className="max-h-[500px] min-h-[350px] space-y-3 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/50 p-4"
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-student-primary/10">
                  <Headphones className="size-8 text-student-primary" />
                </div>
                <div>
                  <p className="font-semibold text-student-text">Need help?</p>
                  <p className="mt-1 text-sm text-student-muted">
                    Start a conversation with our support team. We're here to help!
                  </p>
                </div>
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
                    <div className={`max-w-[75%] ${isStudent ? 'order-2' : 'order-1'}`}>
                      {!isStudent ? (
                        <p className="mb-1 ml-1 text-xs font-semibold text-student-primary">Support Agent</p>
                      ) : null}
                      <div
                        className={`rounded-2xl px-4 py-2.5 ${
                          isStudent
                            ? 'rounded-br-md bg-student-primary text-white'
                            : 'rounded-bl-md border border-slate-200 bg-white text-student-text shadow-sm'
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{text}</p>
                      </div>
                      {createdAt ? (
                        <p className={`mt-1 text-[10px] ${isStudent ? 'text-right text-slate-400' : 'ml-1 text-slate-400'}`}>
                          {formatChatTimestamp(createdAt)}
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
          <form
            className="flex gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
          >
            <label htmlFor="support-message" className="sr-only">
              Message
            </label>
            <input
              id="support-message"
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-student-primary focus:outline-none focus:ring-1 focus:ring-student-primary"
              disabled={sending}
            />
            <Button
              type="submit"
              className="rounded-xl bg-student-primary hover:bg-student-primary/90"
              disabled={sending || !message.trim()}
            >
              <Send aria-hidden="true" className="mr-2 size-4" />
              {sending ? 'Sending...' : 'Send'}
            </Button>
          </form>

          <p className="text-center text-[10px] text-slate-400">
            Messages auto-refresh every 15 seconds
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
