"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { UserButton } from "@clerk/nextjs";
import { 
  LayoutDashboard, 
  CheckSquare, 
  FileText, 
  MessageSquare, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  User
} from "lucide-react";

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isCollapsed: boolean;
}

const NavItem = ({ href, icon, label, isCollapsed }: NavItemProps) => {
  const pathname = usePathname();
  const isActive = pathname === href;
  
  return (
    <Link 
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 ${
        isActive 
          ? "bg-primary text-primary-foreground" 
          : "hover:bg-muted hover:translate-x-1"
      } ${isCollapsed ? "justify-center" : ""}`}
      aria-label={label}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          (e.target as HTMLElement).click();
        }
      }}
    >
      <span className="flex-shrink-0">{icon}</span>
      {!isCollapsed && <span className="transition-opacity duration-200">{label}</span>}
    </Link>
  );
};

export const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Handle responsive behavior
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      }
    };

    // Initial check
    checkScreenSize();
    
    // Add event listener
    window.addEventListener('resize', checkScreenSize);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileOpen(!isMobileOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <>
      {/* Mobile menu button - only visible on small screens */}
      {isMobile && (
        <button
          onClick={toggleSidebar}
          className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-background border shadow-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors hover:scale-105 active:scale-95 transform duration-150"
          aria-label={isMobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMobileOpen}
          aria-controls="sidebar"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Sidebar */}
      <aside 
        id="sidebar"
        className={`${
          isCollapsed && !isMobile ? "w-16" : "w-64"
        } ${
          isMobile ? "fixed inset-y-0 left-0 z-40" : "relative"
        } ${
          isMobile && !isMobileOpen ? "-translate-x-full" : "translate-x-0"
        } border-r h-screen flex flex-col bg-background transition-all duration-300 ease-in-out`}
        aria-label="Sidebar navigation"
      >
        <div className={`p-4 flex ${isCollapsed && !isMobile ? "justify-center" : "justify-between"} items-center`}>
          {!isCollapsed && (
            <div className="transition-opacity duration-200">
              <h2 className="text-xl font-bold">Momentum</h2>
              {!isCollapsed && <p className="text-muted-foreground text-xs">AI Task & Notes Manager</p>}
            </div>
          )}
          
          {/* Toggle button - hidden on mobile */}
          {!isMobile && (
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors hover:scale-105 active:scale-95 transform duration-150"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          )}
        </div>
        
        <nav className={`space-y-2 ${isCollapsed && !isMobile ? "px-2" : "px-4"} py-4`}>
          <NavItem 
            href="/dashboard" 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard"
            isCollapsed={isCollapsed && !isMobile}
          />
          <NavItem 
            href="/dashboard/tasks" 
            icon={<CheckSquare size={20} />} 
            label="Tasks"
            isCollapsed={isCollapsed && !isMobile}
          />
          <NavItem 
            href="/dashboard/notes" 
            icon={<FileText size={20} />} 
            label="Notes"
            isCollapsed={isCollapsed && !isMobile}
          />
          <NavItem 
            href="/dashboard/chat" 
            icon={<MessageSquare size={20} />} 
            label="AI Assistant"
            isCollapsed={isCollapsed && !isMobile}
          />
        </nav>
        
        <div className={`mt-auto ${isCollapsed && !isMobile ? "px-2" : "px-4"} space-y-2`}>
          <NavItem 
            href="/dashboard/settings" 
            icon={<Settings size={20} />} 
            label="Settings"
            isCollapsed={isCollapsed && !isMobile}
          />
          
          {/* User profile section with separator */}
          <div className="border-t border-border my-2 pt-2">
            <div 
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 hover:bg-muted ${isCollapsed && !isMobile ? "justify-center" : ""}`}
              aria-label="User profile"
              tabIndex={0}
            >
              <div className="flex-shrink-0">
                <UserButton 
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      userButtonAvatarBox: "w-8 h-8",
                      userButtonTrigger: "focus:outline-none focus:ring-0"
                    }
                  }}
                />
              </div>
              {!isCollapsed && (
                <div className="transition-opacity duration-200 overflow-hidden">
                  <span className="text-sm font-medium">Account</span>
                  <p className="text-xs text-muted-foreground">Manage profile</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobile && isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}
    </>
  );
};