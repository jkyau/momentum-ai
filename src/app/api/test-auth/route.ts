import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { mockAuth } from "@/lib/mock-auth";

export async function GET(req: Request) {
  try {
    // Try to get the user ID from Clerk auth
    const clerkAuth = await auth();
    
    // If Clerk auth fails, use mock auth
    const { userId } = clerkAuth.userId ? clerkAuth : await mockAuth();
    
    return NextResponse.json({
      success: true,
      userId,
      usingMockAuth: !clerkAuth.userId,
      message: "Auth is working correctly"
    });
  } catch (error) {
    console.error("Error testing auth:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Auth is not working correctly"
      },
      { status: 500 }
    );
  }
} 