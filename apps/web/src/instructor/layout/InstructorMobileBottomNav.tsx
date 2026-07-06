import { LayoutDashboard, Users, Video, ClipboardCheck, Settings, type LucideIcon } from 'lucide-react';

// Naji 2026-07-06 Lovable refresh — a mobile bottom navigation bar (matches the
// updated ttiifaculty.lovable.app design). Shown only below md; the collapsible
// sidebar remains the desktop nav. Dashboard sits in the centre.

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const ITEMS: NavItem[] = [
  { label: 'Cohorts', href: '/instructor/cohorts', icon: Users },
  { label: 'Live', href: '/instructor/live-classes', icon: Video },
  { label: 'Dashboard', href: '/instructor/dashboard', icon: LayoutDashboard },
  { label: 'Assignments', href: '/instructor/assignments', icon: ClipboardCheck },
  { label: 'Settings', href: '/instructor/settings', icon: Settings },
];

interface InstructorMobileBottomNavProps {
  pathname: string;
  onNavigate: (href: string) => void;
}

export function InstructorMobileBottomNav({ pathname, onNavigate }: InstructorMobileBottomNavProps) {
  const isActive = (href: string): boolean =>
    href === '/instructor/dashboard'
      ? pathname === '/instructor' || pathname === '/instructor/' || pathname.startsWith('/instructor/dashboard')
      : pathname.startsWith(href);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md md:hidden"
    >
      <div className="flex h-16 items-center justify-around">
        {ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <button
              key={item.href}
              type="button"
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              onClick={() => onNavigate(item.href)}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors ${
                active ? 'text-violet-600' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className={`size-5 transition-colors ${active ? 'text-violet-600' : 'text-slate-500'}`} aria-hidden="true" />
              <span className="leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
