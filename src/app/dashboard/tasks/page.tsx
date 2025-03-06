import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { TaskBoard } from "@/components/tasks/TaskBoard";

export default async function TasksPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }
  
  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
        <p className="text-muted-foreground mt-1">
          Manage your tasks and stay organized.
        </p>
      </div>
      
      <TaskBoard />
    </div>
  );
} 