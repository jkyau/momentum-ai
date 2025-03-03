import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { NoteList } from "@/components/notes/NoteList";
import { NoteForm } from "@/components/notes/NoteForm";

export default async function NotesPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Notes</h1>
        <p className="text-muted-foreground">
          Capture and organize your thoughts with AI-powered summarization.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <NoteForm />
        </div>
        
        <div className="lg:col-span-2">
          <NoteList />
        </div>
      </div>
    </div>
  );
} 