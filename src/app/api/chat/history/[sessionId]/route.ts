import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const userId = session.userId;
    const { sessionId } = params;
    
    // Parse the date from sessionId (format: yyyy-MM-dd)
    const [year, month, day] = sessionId.split("-").map(Number);
    const startDate = new Date(year, month - 1, day);
    const endDate = new Date(year, month - 1, day + 1);
    
    // Fetch chat logs for the specific date
    const chatLogs = await db.chatLog.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });
    
    if (chatLogs.length === 0) {
      return NextResponse.json(
        { error: "Chat session not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(chatLogs);
  } catch (error) {
    console.error("Error fetching chat session:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat session" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const userId = session.userId;
    const { sessionId } = params;
    
    // Parse the date from sessionId (format: yyyy-MM-dd)
    const [year, month, day] = sessionId.split("-").map(Number);
    const startDate = new Date(year, month - 1, day);
    const endDate = new Date(year, month - 1, day + 1);
    
    // Delete chat logs for the specific date
    const result = await db.chatLog.deleteMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
    });
    
    if (result.count === 0) {
      return NextResponse.json(
        { error: "Chat session not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error) {
    console.error("Error deleting chat session:", error);
    return NextResponse.json(
      { error: "Failed to delete chat session" },
      { status: 500 }
    );
  }
} 