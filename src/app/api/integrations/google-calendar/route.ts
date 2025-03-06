import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { 
  getUserCalendars, 
  setDefaultCalendar 
} from "@/lib/services/googleCalendar";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }
    
    // Get integration status
    const integration = await db.userIntegration.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: 'google_calendar'
        }
      }
    });
    
    // If integration exists and is active, get calendars
    let calendars: any[] = [];
    if (integration && integration.isActive) {
      try {
        calendars = await getUserCalendars(userId);
      } catch (error) {
        console.error("Error fetching calendars:", error);
        // Continue with empty calendars list
      }
    }
    
    return NextResponse.json({
      connected: !!integration?.isActive,
      defaultCalendarId: integration?.defaultCalendarId || 'primary',
      calendars
    });
  } catch (error) {
    console.error("Error getting integration status:", error);
    return NextResponse.json(
      { message: "Failed to get integration status" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    const { defaultCalendarId } = body;
    
    if (!defaultCalendarId) {
      return NextResponse.json(
        { message: "Default calendar ID is required" },
        { status: 400 }
      );
    }
    
    // Update default calendar
    await setDefaultCalendar(userId, defaultCalendarId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating integration settings:", error);
    return NextResponse.json(
      { message: "Failed to update integration settings" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }
    
    // Deactivate integration
    await db.userIntegration.update({
      where: {
        userId_provider: {
          userId,
          provider: 'google_calendar'
        }
      },
      data: {
        isActive: false
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting integration:", error);
    return NextResponse.json(
      { message: "Failed to disconnect integration" },
      { status: 500 }
    );
  }
} 