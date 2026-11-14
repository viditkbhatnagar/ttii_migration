import { ShieldOff } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { EmptyState } from '../../shared/components/ui-kit.js';

/** Shown when a credential page is opened without the needed switch (the server refuses the data too). */
export function AccessUnavailable({ what = 'this page' }: { what?: string }) {
  return (
    <Card className="gap-0 border-border/70 shadow-[var(--shadow-soft)]">
      <EmptyState
        icon={ShieldOff}
        title="Access unavailable"
        body={`You do not have permission to open ${what}. Ask a Super Admin to grant it under User Management.`}
      />
    </Card>
  );
}
