import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { LayoutDashboard, CheckSquare, FileText, MessageSquare } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const { userId } = await auth();
  const user = await currentUser();
  
  if (!userId || !user) {
    redirect("/sign-in");
  }
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Welcome, {user.firstName || "User"}!</h1>
        <p className="text-muted-foreground">
          Here's an overview of your tasks, notes, and recent activity.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DashboardCard
          title="Tasks"
          description="Manage your tasks and to-dos"
          icon={<CheckSquare className="h-8 w-8" />}
          href="/dashboard/tasks"
          color="bg-blue-50 dark:bg-blue-950"
          iconColor="text-blue-500"
        />
        
        <DashboardCard
          title="Notes"
          description="Organize your notes and thoughts"
          icon={<FileText className="h-8 w-8" />}
          href="/dashboard/notes"
          color="bg-green-50 dark:bg-green-950"
          iconColor="text-green-500"
        />
        
        <DashboardCard
          title="AI Assistant"
          description="Chat with your AI assistant"
          icon={<MessageSquare className="h-8 w-8" />}
          href="/dashboard/chat"
          color="bg-purple-50 dark:bg-purple-950"
          iconColor="text-purple-500"
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Tasks</h2>
            <Link 
              href="/dashboard/tasks" 
              className="text-sm text-primary hover:underline"
              aria-label="View all tasks"
              tabIndex={0}
            >
              View all
            </Link>
          </div>
          <div className="space-y-4">
            <p className="text-muted-foreground text-center py-8">
              No tasks yet. Create your first task to get started.
            </p>
          </div>
        </div>
        
        <div className="border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Notes</h2>
            <Link 
              href="/dashboard/notes" 
              className="text-sm text-primary hover:underline"
              aria-label="View all notes"
              tabIndex={0}
            >
              View all
            </Link>
          </div>
          <div className="space-y-4">
            <p className="text-muted-foreground text-center py-8">
              No notes yet. Create your first note to get started.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DashboardCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  iconColor: string;
}

const DashboardCard = ({
  title,
  description,
  icon,
  href,
  color,
  iconColor,
}: DashboardCardProps) => {
  return (
    <Link 
      href={href}
      className="border rounded-lg p-6 transition-all hover:shadow-md flex flex-col"
      aria-label={`Go to ${title}`}
      tabIndex={0}
    >
      <div className={`${color} ${iconColor} p-3 rounded-full w-fit mb-4`}>
        {icon}
      </div>
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-muted-foreground">{description}</p>
    </Link>
  );
}; 