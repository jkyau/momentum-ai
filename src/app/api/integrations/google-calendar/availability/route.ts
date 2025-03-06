import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkAvailability } from "@/lib/services/googleCalendar";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }
    
    const url = new URL(req.url);
    const date = url.searchParams.get("date");
    const startTime = url.searchParams.get("startTime");
    const endTime = url.searchParams.get("endTime");
    
    if (!date || !startTime || !endTime) {
      return NextResponse.json(
        { message: "Date, start time, and end time are required" },
        { status: 400 }
      );
    }
    
    const availability = await checkAvailability(
      userId,
      date,
      startTime,
      endTime
    );
    
    return NextResponse.json(availability);
  } catch (error) {
    console.error("Error checking availability:", error);
    return NextResponse.json(
      { message: "Failed to check availability" },
      { status: 500 }
    );
  }
} 