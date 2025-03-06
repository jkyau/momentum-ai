import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { mockAuth } from "@/lib/mock-auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    // Try to get the user ID from Clerk auth
    const clerkAuth = await auth();
    
    // If Clerk auth fails, use mock auth
    const { userId } = clerkAuth.userId ? clerkAuth : await mockAuth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const { sessionId } = await params;
    
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
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    // Try to get the user ID from Clerk auth
    const clerkAuth = await auth();
    
    // If Clerk auth fails, use mock auth
    const { userId } = clerkAuth.userId ? clerkAuth : await mockAuth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const { sessionId } = await params;
    
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