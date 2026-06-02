// Click-to-call button — opens the in-dashboard Ainvox dialer and dials the
// contact in the browser (the supported widget flow). The admin signs into the
// dialer once; after that it just opens and calls, with recording handled by
// the Ainvox account. Disabled when there's no usable phone number.
import { useState } from 'react';
import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { startBrowserCall, toDialableNumber } from '../call-actions.js';

interface CallButtonProps {
  phone: string | null | undefined;
  /** Compact icon-only variant for dense surfaces (table rows, chips). */
  iconOnly?: boolean;
  label?: string;
  className?: string;
}

export function CallButton({ phone, iconOnly = false, label = 'Call', className }: CallButtonProps) {
  const [calling, setCalling] = useState(false);
  const dialable = toDialableNumber(phone ?? '');
  const title = dialable ? `Call ${dialable}` : 'No phone number on file';

  async function handleClick() {
    setCalling(true);
    try {
      await startBrowserCall(phone);
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
