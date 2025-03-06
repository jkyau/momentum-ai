import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { FullPageEditor } from "@/components/notes/FullPageEditor";
import { db } from "@/lib/db";

async function getNote(noteId: string, userId: string) {
  try {
    const note = await db.note.findUnique({
      where: {
        id: noteId,
        userId: userId,
      },
    });
    
    return note;
  } catch (error) {
    console.error("Error fetching note:", error);
    return null;
  }
}

export default async function EditNotePage({ params }: { params: Promise<{ noteId: string }> }) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }
  
  const { noteId } = await params;
  const note = await getNote(noteId, userId);
  
  if (!note) {
    return (
      <div className="container mx-auto py-8 max-w-5xl">
        <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-6">
          <h2 className="text-lg font-medium mb-2">Note not found</h2>
          <p>The note you're looking for doesn't exist or you don't have permission to view it.</p>
        </div>
      </div>
    );
  }
  
  return <FullPageEditor existingNote={note} />;
} 