import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskForm } from "@/components/tasks/TaskForm";

export default async function TasksPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Tasks</h1>
        <p className="text-muted-foreground">
          Manage your tasks and to-dos with AI-powered enhancements.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <TaskForm />
        </div>
        
        <div className="lg:col-span-2">
          <TaskList />
        </div>
      </div>
    </div>
  );
} 