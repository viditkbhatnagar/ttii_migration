// EduPulse-style segmented pill tab control (Naji 2026-06-06). A rounded gray
// track where the ACTIVE tab is an elevated white pill; inactive tabs are muted
// and darken on hover. Counts render inline in parentheses, e.g. "Ongoing (1)".
// Replaces the underline+chip AdminTabBar where the demo uses segmented pills.

export interface SegmentedTab {
  id: string;
  label: string;
  count?: number;
}

interface SegmentedTabsProps {
  tabs: SegmentedTab[];
  active: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
}

export function SegmentedTabs({ tabs, active, onChange, ariaLabel }: SegmentedTabsProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-slate-100 p-1"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all ${
              isActive
                ? 'bg-white text-student-text shadow-sm'
                : 'text-slate-500 hover:text-student-text'
            }`}
          >
            {tab.label}
            {typeof tab.count === 'number' ? ` (${tab.count})` : ''}
          </button>
        );
      })}
    </div>
  );
}
