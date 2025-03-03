"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  CheckSquare, 
  FileText, 
  MessageSquare, 
  Settings 
} from "lucide-react";

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
}

const NavItem = ({ href, icon, label }: NavItemProps) => {
  const pathname = usePathname();
  const isActive = pathname === href;
  
  return (
    <Link 
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
        isActive 
          ? "bg-primary text-primary-foreground" 
          : "hover:bg-muted"
      }`}
      aria-label={label}
      tabIndex={0}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
};

export const Sidebar = () => {
  return (
    <aside className="w-64 border-r h-screen p-4 flex flex-col">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Momentum</h2>
        <p className="text-muted-foreground text-sm">AI Task & Notes Manager</p>
      </div>
      
      <nav className="space-y-2">
        <NavItem 
          href="/dashboard" 
          icon={<LayoutDashboard size={20} />} 
          label="Dashboard" 
        />
        <NavItem 
          href="/dashboard/tasks" 
          icon={<CheckSquare size={20} />} 
          label="Tasks" 
        />
        <NavItem 
          href="/dashboard/notes" 
          icon={<FileText size={20} />} 
          label="Notes" 
        />
        <NavItem 
          href="/dashboard/chat" 
          icon={<MessageSquare size={20} />} 
          label="AI Assistant" 
        />
      </nav>
      
      <div className="mt-auto">
        <NavItem 
          href="/dashboard/settings" 
          icon={<Settings size={20} />} 
          label="Settings" 
        />
      </div>
    </aside>
  );
};