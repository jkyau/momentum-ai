import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { openai } from "@/lib/openai";

// Schema for note creation/update validation
const noteSchema = z.object({
  title: z.string().min(1, "Note title is required"),
  text: z.string().min(1, "Note content is required"),
});

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const notes = await db.note.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error("[NOTES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const validationResult = noteSchema.safeParse(body);

    if (!validationResult.success) {
      return new NextResponse(JSON.stringify(validationResult.error), {
        status: 400,
      });
    }

    const { title, text } = validationResult.data;

    // Optional: Add AI processing for note text enhancement and summarization
    let cleanedText = null;
    let summary = null;
    
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

    const note = await db.note.create({
      data: {
        userId,
        title,
        text,
        cleanedText,
        summary,
      },
    });

    return NextResponse.json(note);
  } catch (error) {
    console.error("[NOTES_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 