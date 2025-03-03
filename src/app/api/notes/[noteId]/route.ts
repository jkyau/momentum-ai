import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { openai } from "@/lib/openai";

// Schema for note update validation
const noteUpdateSchema = z.object({
  title: z.string().min(1, "Note title is required").optional(),
  text: z.string().min(1, "Note content is required").optional(),
});

export async function GET(
  req: Request,
  { params }: { params: { noteId: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const note = await db.note.findUnique({
      where: {
        id: params.noteId,
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
  { params }: { params: { noteId: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const validationResult = noteUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return new NextResponse(JSON.stringify(validationResult.error), {
        status: 400,
      });
    }

    const { title, text } = validationResult.data;

    // Check if note exists and belongs to user
    const existingNote = await db.note.findUnique({
      where: {
        id: params.noteId,
        userId,
      },
    });

    if (!existingNote) {
      return new NextResponse("Note not found", { status: 404 });
    }

    // Optional: Add AI processing for note text enhancement and summarization if text is updated
    let cleanedText = undefined;
    let summary = undefined;
    
    if (text && text !== existingNote.text) {
      try {
        // This could be an AI service call to enhance and summarize the note text
        if (text.length > 100) {
          const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: "You are a helpful assistant that summarizes text concisely."
              },
              {
                role: "user",
                content: `Summarize the following text in 1-2 sentences: ${text}`
              }
            ],
            max_tokens: 100,
          });
          
          summary = response.choices[0]?.message?.content?.trim() || null;
        }
        
        cleanedText = text; // For now, we'll just use the original text
      } catch (aiError) {
        console.error("[AI_PROCESSING_ERROR]", aiError);
        // Continue without AI enhancement if it fails
      }
    }

    const updatedNote = await db.note.update({
      where: {
        id: params.noteId,
      },
      data: {
        title,
        text,
        cleanedText: text ? cleanedText : undefined,
        summary: text ? summary : undefined,
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
  { params }: { params: { noteId: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if note exists and belongs to user
    const existingNote = await db.note.findUnique({
      where: {
        id: params.noteId,
        userId,
      },
    });

    if (!existingNote) {
      return new NextResponse("Note not found", { status: 404 });
    }

    // Delete the note
    await db.note.delete({
      where: {
        id: params.noteId,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[NOTE_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 