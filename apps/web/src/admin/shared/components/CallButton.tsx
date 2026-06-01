// Click-to-call button (server-side REST — the proven method). On click, our
// API places a real call via Ainvox: it rings the admin's callback phone, then
// connects them to the student and records. The student sees our virtual
// number as caller ID. Admin-only; disabled when there's no usable phone.
import { useState } from 'react';
import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { startAdminCall, toDialableNumber } from '../call-actions.js';

interface CallButtonProps {
  api: AdminPortalApi;
  authToken: string;
  phone: string | null | undefined;
  /** Compact icon-only variant for dense surfaces (table rows, chips). */
  iconOnly?: boolean;
  label?: string;
  className?: string;
}

export function CallButton({ api, authToken, phone, iconOnly = false, label = 'Call', className }: CallButtonProps) {
  const [calling, setCalling] = useState(false);
  const dialable = toDialableNumber(phone ?? '');
  const title = dialable ? `Call ${dialable}` : 'No phone number on file';

  async function handleClick() {
    setCalling(true);
    try {
      await startAdminCall(api, authToken, phone);
    } finally {
      setCalling(false);
    }
  }

  return (
    <Button
      type="button"
      variant={iconOnly ? 'ghost' : 'outline'}
      size="sm"
      disabled={!dialable || calling}
      onClick={() => {
        void handleClick();
      }}
      title={title}
      aria-label={title}
      className={className}
    >
      <Phone className={iconOnly ? 'h-4 w-4' : 'mr-1.5 h-4 w-4'} />
      {iconOnly ? null : calling ? 'Calling…' : label}
    </Button>
  );
}
