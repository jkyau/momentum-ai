import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";

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
      <div className="container mx-auto py-8 max-w-5xl">
        <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-6">
          <h2 className="text-lg font-medium mb-2">Note not found</h2>
          <p>The note you're looking for doesn't exist or you don't have permission to view it.</p>
          <Link 
            href="/dashboard/notes" 
            className="mt-4 inline-block text-primary hover:underline"
          >
            Return to Notes
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <Link 
          href="/dashboard/notes" 
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to notes</span>
        </Link>
        
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/notes/${note.id}/edit`}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <Edit size={16} />
            <span>Edit</span>
          </Link>
        </div>
      </div>
      
      <div className="bg-card rounded-lg border shadow-sm p-6">
        <h1 className="text-3xl font-bold mb-4">{note.title}</h1>
        
        <div className="text-sm text-muted-foreground mb-6">
          Created {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
        </div>
        
        <div className="prose prose-sm sm:prose lg:prose-lg max-w-none">
          {note.text.split('\n').map((paragraph, index) => (
            paragraph ? <p key={index}>{paragraph}</p> : <br key={index} />
          ))}
        </div>
      </div>
    </div>
  );
} 