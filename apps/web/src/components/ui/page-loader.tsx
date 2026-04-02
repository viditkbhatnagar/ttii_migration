import { Loader2 } from 'lucide-react';

interface PageLoaderProps {
  label?: string;
}

export function PageLoader({ label }: PageLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      <Loader2 className="size-8 text-primary animate-spin" />
      {label ? <p className="text-sm text-muted-foreground">{label}</p> : null}
    </div>
  );
}
