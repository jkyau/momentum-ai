import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { NoteList } from "@/components/notes/NoteList";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function NotesPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }
  
  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notes</h1>
          <p className="text-muted-foreground mt-1">
            Create, edit and organize your notes in one place.
          </p>
        </div>
        
        <Link href="/dashboard/notes/new" passHref>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
            <Plus size={16} />
            <span>New Note</span>
          </button>
        </Link>
      </div>
      
      <NoteList />
    </div>
  );
} 