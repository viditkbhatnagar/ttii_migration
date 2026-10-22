import {
  BookOpen, Building2, FileText, FolderOpen, GraduationCap, Headphones, LayoutDashboard, PlayCircle, Users, Video, Wallet,
  type LucideIcon,
} from 'lucide-react';

// Icons of the centre menu (centre-nav-tree.ts names them by string), as in
// Naji's Sidebar.tsx / MobileTabBar.tsx.
const ICONS: Readonly<Record<string, LucideIcon>> = {
  LayoutDashboard,
  FileText,
  GraduationCap,
  BookOpen,
  Users,
  Video,
  PlayCircle,
  FolderOpen,
  Wallet,
  Building2,
  HeadphonesIcon: Headphones,
};

export function centreNavIcon(name: string): LucideIcon {
  return ICONS[name] ?? LayoutDashboard;
}
