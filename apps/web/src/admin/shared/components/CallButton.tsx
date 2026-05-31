// Click-to-call button (server-side). On click, our API rings the admin's
// callback phone and connects them to the student — no widget, no login.
// Admin-only; disabled when the contact has no usable phone number.
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
