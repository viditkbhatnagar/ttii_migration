import { useRef, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { AdminPageHeader } from '../../../admin/shared/components/AdminPageHeader.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, formatDate, messageFromError } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CentrePageProps } from '../../routing/centre-routes.js';

interface SupportData {
  messages: Record<string, unknown>[];
  videos: Record<string, unknown>[];
}

export default function CentreSupportPage({ api, session }: CentrePageProps) {
  const { data, loading, error, reload } = useAdminPageData<SupportData>(
    async () => {
      const [messages, videos] = await Promise.all([
        api.loadSupportMessages(session.token),
        api.loadTrainingVideos(session.token),
      ]);
      return { messages, videos };
    },
    [session.token],
  );

  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (data?.messages) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [data?.messages]);

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    try {
      await api.submitSupportMessage(session.token, messageText.trim());
      setMessageText('');
      reload();
    } catch (err: unknown) {
      toast.error(messageFromError(err));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  if (loading) {
    return <PageLoader label="Loading centre support..." />;
  }

  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-10 text-center text-sm text-red-600">
          {error}
        </CardContent>
      </Card>
    );
  }

  const { messages, videos } = data!;

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Support & Training" />

      <div className="grid grid-cols-2 gap-6 max-lg:grid-cols-1">
        {/* Left Panel - Chat Support */}
        <Card>
          <CardContent className="flex flex-col p-0">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">Support Chat</h2>
            </div>

            <div className="max-h-[400px] min-h-[300px] overflow-y-auto p-4">
              {messages.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">
                  No messages yet. Start a conversation.
                </p>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg, idx) => {
                    const senderId = asString(msg.sender_id) || asString(msg.user_id);
                    const isOwn = senderId === String(session.userId);
                    const text = asString(msg.message) || asString(msg.text);
                    const time = asString(msg.created_at) || asString(msg.timestamp);
                    return (
                      <div
                        key={asString(msg.id) || String(idx)}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                            isOwn
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <p>{text}</p>
                          {time && (
                            <p
                              className={`mt-1 text-xs ${
                                isOwn ? 'text-blue-100' : 'text-gray-400'
                              }`}
                            >
                              {formatDate(time)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="border-t p-3">
              <div className="flex gap-2">
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button
                  className="bg-ttii-primary hover:bg-ttii-primary/90"
                  onClick={() => void handleSendMessage()}
                >
                  Send
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Panel - Training Videos */}
        <Card>
          <CardContent className="flex flex-col p-0">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">Training Videos</h2>
            </div>

            <div className="max-h-[460px] overflow-y-auto p-4">
              {videos.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">
                  No training videos available.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {videos.map((video, idx) => {
                    const title = asString(video.title) || asString(video.name);
                    const category = asString(video.category) || asString(video.type);
                    const url = asString(video.url) || asString(video.video_url);
                    return (
                      <Card key={asString(video.id) || String(idx)}>
                        <CardContent className="p-3">
                          <div className="mb-2 flex h-24 items-center justify-center rounded bg-gray-100 text-2xl text-gray-400">
                            ▶
                          </div>
                          <h3 className="truncate text-sm font-medium text-gray-900">
                            {title}
                          </h3>
                          <div className="mt-1 flex items-center justify-between">
                            {category && (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                {category}
                              </span>
                            )}
                            {url && (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                              >
                                Watch
                              </a>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
