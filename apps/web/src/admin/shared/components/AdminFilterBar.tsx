import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

export interface FilterField {
  key: string;
  label: string;
  type: 'text' | 'date' | 'select';
  value: string;
  placeholder?: string;
  options?: { label: string; value: string }[];
  onChange: (value: string) => void;
}

interface AdminFilterBarProps {
  filters: FilterField[];
  onApply: () => void;
  onClear: () => void;
}

export function AdminFilterBar({ filters, onApply, onClear }: AdminFilterBarProps) {
  return (
    <Card className="mb-4">
      <CardContent className="pt-4">
        <div className="flex flex-wrap items-end gap-4">
          {filters.map((filter) => (
            <div key={filter.key} className="min-w-[180px] flex-1">
              <Label className="mb-1 text-xs text-gray-500">{filter.label}</Label>
              {filter.type === 'select' ? (
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                  value={filter.value}
                  onChange={(e) => filter.onChange(e.target.value)}
                >
                  <option value="">{filter.placeholder ?? 'Select...'}</option>
                  {filter.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  type={filter.type}
                  value={filter.value}
                  onChange={(e) => filter.onChange(e.target.value)}
                  placeholder={filter.placeholder}
                  className="h-9"
                />
              )}
            </div>
          ))}
          <div className="flex gap-2">
            <Button
              onClick={onApply}
              className="gap-1.5 bg-ttii-primary hover:bg-ttii-primary/90"
              size="sm"
            >
              <Filter className="size-3.5" />
              Filters
            </Button>
            <Button
              variant="outline"
              onClick={onClear}
              className="gap-1.5 border-ttii-secondary text-ttii-secondary hover:bg-ttii-secondary/10"
              size="sm"
            >
              <X className="size-3.5" />
              Clear
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
