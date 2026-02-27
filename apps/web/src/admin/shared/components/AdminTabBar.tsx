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
    <div className="mb-4 flex gap-1 border-b border-gray-200">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={cn(
            'relative px-4 py-2 text-sm font-medium transition-colors',
            activeTab === tab.id
              ? 'text-ttii-primary'
              : 'text-gray-500 hover:text-gray-700',
          )}
          onClick={() => onChange(tab.id)}
        >
          <span className="flex items-center gap-1.5">
            {tab.label}
            {tab.count != null ? (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-xs font-medium',
                  activeTab === tab.id
                    ? 'bg-ttii-primary/10 text-ttii-primary'
                    : 'bg-gray-100 text-gray-500',
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </span>
          {activeTab === tab.id ? (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ttii-primary" />
          ) : null}
        </button>
      ))}
    </div>
  );
}
