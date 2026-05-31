// Click-to-call button. Opens the Ainvox browser dialer (pre-authenticated,
// no login) and dials the student — you talk through the dashboard, the
// student sees our virtual number as caller ID. Admin-only; disabled when the
// contact has no usable phone number.
import { useState } from 'react';
import { Phone } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { toDialableNumber } from '../call-actions.js';
import { placeBrowserCall } from '../call-widget.js';

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
    if (!dialable) {
      toast.error('No valid phone number for this contact.');
      return;
    }
    setCalling(true);
    try {
      await placeBrowserCall(() => api.getDialerIframeUrl(authToken), dialable);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open the dialer.');
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
      {iconOnly ? null : calling ? 'Opening…' : label}
    </Button>
  );
}
