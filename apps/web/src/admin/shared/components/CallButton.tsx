// Click-to-call button backed by the Ainvox dialer widget. Admin-only
// (student support + payment follow-ups). Disabled when the contact has no
// usable phone number.
import { useState } from 'react';
import { Phone } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { placeCall, toDialableNumber } from '../ainvox-dialer.js';

interface CallButtonProps {
  phone: string | null | undefined;
  /** Compact icon-only variant for dense surfaces (table rows, chips). */
  iconOnly?: boolean;
  label?: string;
  className?: string;
}

export function CallButton({ phone, iconOnly = false, label = 'Call', className }: CallButtonProps) {
  const [connecting, setConnecting] = useState(false);
  const dialable = toDialableNumber(phone ?? '');
  const title = dialable ? `Call ${dialable}` : 'No phone number on file';

  async function handleClick() {
    if (!dialable) {
      toast.error('No valid phone number for this contact');
      return;
    }
    setConnecting(true);
    try {
      await placeCall(dialable);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start the call');
    } finally {
      setConnecting(false);
    }
  }

  return (
    <Button
      type="button"
      variant={iconOnly ? 'ghost' : 'outline'}
      size="sm"
      disabled={!dialable || connecting}
      onClick={() => {
        void handleClick();
      }}
      title={title}
      aria-label={title}
      className={className}
    >
      <Phone className={iconOnly ? 'h-4 w-4' : 'mr-1.5 h-4 w-4'} />
      {iconOnly ? null : connecting ? 'Connecting…' : label}
    </Button>
  );
}
