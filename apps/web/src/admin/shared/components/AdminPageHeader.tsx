import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminPageHeaderProps {
  title: string;
  addLabel?: string;
  onAdd?: () => void;
  children?: React.ReactNode;
}

export function AdminPageHeader({ title, addLabel, onAdd, children }: AdminPageHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-2">
        {children}
        {addLabel && onAdd ? (
          <Button onClick={onAdd} className="gap-1.5 bg-ttii-primary hover:bg-ttii-primary/90">
            <Plus className="size-4" />
            {addLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
