import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { ollama } from "@/lib/ollama";

// Schema for note update validation
const noteUpdateSchema = z.object({
  title: z.string().min(1, "Note title is required").optional(),
  text: z.string().min(1, "Note content is required").optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { noteId } = await params;

    const note = await db.note.findUnique({
      where: {
        id: noteId,
        userId,
      },
    });

    if (!note) {
      return new NextResponse("Note not found", { status: 404 });
    }

    return NextResponse.json(note);
  } catch (error) {
    console.error("[NOTE_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { noteId } = await params;

    const body = await req.json();
    const validatedData = noteUpdateSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: validatedData.error.errors },
        { status: 400 }
      );
    }

    const note = await db.note.findUnique({
      where: {
        id: noteId,
        userId,
      },
    });

    if (!note) {
      return new NextResponse("Note not found", { status: 404 });
    }

    const { title, text } = validatedData.data;

    // Optional: Add AI processing for note text enhancement and summarization if text is updated
    let cleanedText = undefined;
    let summary = undefined;
    
    if (text && text !== note.text) {
      try {
        // This could be an AI service call to enhance and summarize the note text
        if (text.length > 100) {
          const response = await ollama.chat.completions.create({
            model: "llama3",
            messages: [
              {
                role: "system",
                content: "You are a helpful assistant that summarizes text concisely."
              },
              {
                role: "user",
                content: `Summarize the following text in 2-3 sentences: ${text}`
              }
            ]
          });

          summary = response.choices[0].message.content;
        }
      } catch (error) {
        console.error("Error generating summary:", error);
        // Continue without summary if AI processing fails
      }
    }

    const updatedNote = await db.note.update({
      where: {
        id: noteId,
      },
      data: {
        title,
        text,
        cleanedText,
        summary,
      },
    });

    return NextResponse.json(updatedNote);
  } catch (error) {
    console.error("[NOTE_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { noteId } = await params;

    // Check if note exists and belongs to user
    const note = await db.note.findUnique({
      where: {
        id: noteId,
        userId,
      },
    });

    if (!note) {
      return new NextResponse("Note not found", { status: 404 });
    }

    // Delete the note
    await db.note.delete({
      where: {
        id: noteId,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[NOTE_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 