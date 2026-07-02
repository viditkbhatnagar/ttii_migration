import { cn } from '@/lib/utils';

export interface AdminTab {
  id: string;
  label: string;
  count?: number;
}

interface AdminTabBarProps {
  tabs: AdminTab[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export function AdminTabBar({ tabs, activeTab, onChange }: AdminTabBarProps) {
  return (
    <div role="tablist" className="mb-4 flex gap-1 overflow-x-auto border-b border-gray-200">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={tab.count != null ? `${tab.label} (${tab.count})` : undefined}
            className={cn(
              'relative shrink-0 whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors sm:px-4',
              isActive
                ? 'text-ttii-primary'
                : 'text-gray-500 hover:text-gray-700',
            )}
            onClick={() => onChange(tab.id)}
          >
            <span className="flex items-center gap-1.5">
              {tab.label}
              {tab.count != null ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-xs font-medium',
                    isActive
                      ? 'bg-ttii-primary/10 text-ttii-primary'
                      : 'bg-gray-100 text-gray-500',
                  )}
                >
                  {tab.count}
                </span>
              ) : null}
            </span>
            {isActive ? (
              <span aria-hidden="true" className="absolute bottom-0 left-0 right-0 h-0.5 bg-ttii-primary" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
