import { LifeBuoy } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { CentrePageHeader } from '../../layout/CentrePageHeader.js';
import { SupportChatThread } from '../../layout/CentreSupportChat.js';
import type { CentrePageProps } from '../../routing/centre-routes.js';

// /centre/support keeps working (old links, bookmarks): the same real support
// conversation as the top-bar chat panel, full page. Training videos, which
// used to share this page, have their own Training page.
export default function CentreSupportPage({ api, session }: CentrePageProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <CentrePageHeader title="Support Chat" subtitle="Chat with the TTII support team. Replies appear here and in the chat panel." />
      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <LifeBuoy aria-hidden="true" className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">TTII Support</h2>
        </div>
        <SupportChatThread api={api} session={session} active className="h-[min(560px,70dvh)]" />
      </Card>
    </div>
  );
}
