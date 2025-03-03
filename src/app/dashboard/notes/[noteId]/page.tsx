import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { NoteDetail } from "@/components/notes/NoteDetail";

interface NoteDetailPageProps {
  params: {
    noteId: string;
  };
}

async function getNote(noteId: string, userId: string) {
  try {
    const note = await db.note.findUnique({
      where: {
        id: noteId,
        userId,
      },
    });
    
    return note;
  } catch (error) {
    console.error("Error fetching note:", error);
    return null;
  }
}

export default async function NoteDetailPage({ params }: NoteDetailPageProps) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }
  
  const note = await getNote(params.noteId, userId);
  
  if (!note) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="text-2xl font-bold mb-2">Note Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The note you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <a 
          href="/dashboard/notes" 
          className="text-primary hover:underline"
        >
          Return to Notes
        </a>
      </div>
    );
  }
  
  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Note Details</h1>
        <a 
          href="/dashboard/notes" 
          className="text-primary hover:underline"
        >
          Back to Notes
        </a>
      </div>
      
      <NoteDetail note={note} />
    </div>
  );
} 