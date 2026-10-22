import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { LifeBuoy, Loader2, RefreshCw, Send } from 'lucide-react';
import { toast } from 'sonner';
import type { AuthSession } from '@ttii/frontend-core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { CentrePortalApi } from '../centre-portal-api.js';
import { useCentreLayout } from './CentreLayoutContext.js';
import { CHAT_MAX_LENGTH, chatDraftProblem, formatIstDateTime, toChatMessages, type ChatMessage } from './centre-shell-model.js';

// Naji's SupportChat.tsx on the REAL centre support thread
// (/centre/support/get_messages + submit_message: one conversation per centre
// login, chat_id = the centre user, answered by TTII in admin Chat Support).
// His prototype invented tickets (subjects, Open / Resolved, ticket ids); the
// backend has one running conversation and no ticket status, so the panel
// opens straight into it. Polls every 10 s while it is on screen.

const POLL_MS = 10_000;

interface ThreadProps {
  api: CentrePortalApi;
  session: AuthSession;
  /** Poll while true (panel open / page visible). */
  active: boolean;
  className?: string;
}

/** The conversation + composer, shared by the top-bar panel and /centre/support. */
export function SupportChatThread({ api, session, active, className }: ThreadProps) {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const loading = useRef(false);
  const lastCount = useRef(0);

  const load = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    try {
      const rows = await api.loadSupportMessages(session.token);
      setMessages(toChatMessages(rows, session.userId));
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not load the conversation.');
    } finally {
      loading.current = false;
    }
  }, [api, session.token, session.userId]);

  useEffect(() => {
    if (!active) return undefined;
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [active, load]);

  // Keep the newest message in view when the thread grows.
  useEffect(() => {
    const count = messages?.length ?? 0;
    if (count !== lastCount.current && scroller.current) {
      scroller.current.scrollTop = scroller.current.scrollHeight;
    }
    lastCount.current = count;
  }, [messages]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const problem = chatDraftProblem(draft);
    if (problem || sending) {
      if (problem && draft.trim()) toast.error(problem);
      return;
    }
    setSending(true);
    try {
      await api.submitSupportMessage(session.token, draft.trim());
      setDraft('');
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not send the message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite" aria-busy={messages === null}>
        {messages === null && !error ? (
          <p className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> Loading conversation…
          </p>
        ) : null}
        {error && messages === null ? (
          <div role="alert" className="flex flex-col items-center gap-3 py-8 text-center text-sm text-muted-foreground">
            <p>{error}</p>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void load()}>
              <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" /> Try again
            </Button>
          </div>
        ) : null}
        {messages !== null && messages.length === 0 ? (
          <div className="py-8 text-center">
            <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-accent-foreground">
              <LifeBuoy aria-hidden="true" className="h-5 w-5" />
            </span>
            <p className="text-sm font-medium">No messages yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Ask the TTII support team about applications, fees, your wallet or anything else.</p>
          </div>
        ) : null}
        {(messages ?? []).map((m) => (
          <div key={m.id} className={cn('flex', m.own ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[80%] rounded-2xl px-3 py-2 text-sm', m.own ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground')}>
              {!m.own ? <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-70">TTII Support</p> : null}
              <p className="whitespace-pre-wrap break-words">{m.text}</p>
              {m.at ? <p className="mt-1 text-[10px] opacity-70">{formatIstDateTime(m.at)}</p> : null}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={(e) => void send(e)} className="flex shrink-0 gap-2 border-t border-border p-3">
        <Input
          value={draft}
          maxLength={CHAT_MAX_LENGTH}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          aria-label="Message to TTII support"
          disabled={sending}
        />
        <Button type="submit" size="icon" aria-label="Send" disabled={sending || !draft.trim()}>
          {sending ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Send aria-hidden="true" className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}

/** The top-bar button and its slide-out panel (open state lives in the layout so pages can open it). */
export function CentreSupportChat({ api, session }: { api: CentrePortalApi; session: AuthSession }) {
  const { supportOpen, setSupportOpen } = useCentreLayout();
  return (
    <>
      <Button variant="outline" size="icon" className="relative shrink-0" aria-label="Support chat" title="Support chat" onClick={() => setSupportOpen(true)}>
        <LifeBuoy aria-hidden="true" className="h-4 w-4" />
      </Button>
      <Sheet open={supportOpen} onOpenChange={setSupportOpen}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border p-4 text-left">
            <SheetTitle className="flex items-center gap-2">
              <LifeBuoy aria-hidden="true" className="h-4 w-4 text-primary" /> TTII Support
            </SheetTitle>
            <SheetDescription className="text-xs">Chat with the TTII support team. Replies appear here.</SheetDescription>
          </SheetHeader>
          <SupportChatThread api={api} session={session} active={supportOpen} className="flex-1" />
        </SheetContent>
      </Sheet>
    </>
  );
}
