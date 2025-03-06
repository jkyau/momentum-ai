import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { google } from "googleapis";
import { createOAuth2Client } from "@/lib/services/googleCalendar";
import { trackEvent } from "@/lib/monitoring";

// Verify the webhook request is from Google
const verifyWebhook = (req: Request): boolean => {
  // In production, you would verify the X-Goog-Channel-ID and X-Goog-Resource-ID headers
  // against your stored channel information
  return true;
};

export async function POST(req: Request) {
  try {
    // Verify the request is from Google
    if (!verifyWebhook(req)) {
      return NextResponse.json(
        { message: "Unauthorized webhook request" },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    const { resourceId, channelId, resourceState } = body;
    
    // Find the integration associated with this channel
    const integration = await db.calendarWebhook.findUnique({
      where: {
        channelId
      },
      include: {
        userIntegration: true
      }
    });
    
    if (!integration) {
      return NextResponse.json(
        { message: "Unknown channel ID" },
        { status: 404 }
      );
    }
    
    const userId = integration.userIntegration.userId;
    
    // Handle different resource states
    if (resourceState === 'exists') {
      // Get the updated event
      const auth = await createOAuth2Client(userId);
      const calendar = google.calendar({ version: 'v3', auth });
      
      const response = await calendar.events.get({
        calendarId: integration.calendarId,
        eventId: resourceId
      });
      
      const event = response.data;
      
      // Find the task associated with this event
      const taskCalendarEvent = await db.taskCalendarEvent.findFirst({
        where: {
          calendarEventId: event.id!
        },
        include: {
          task: true
        }
      });
      
      if (taskCalendarEvent) {
        // Update the task based on the calendar event changes
        await db.task.update({
          where: {
            id: taskCalendarEvent.taskId
          },
          data: {
            text: event.summary || taskCalendarEvent.task.text,
            dueDate: event.start?.dateTime ? new Date(event.start.dateTime) : taskCalendarEvent.task.dueDate,
            // If the event was deleted in Google Calendar, mark the task as completed
            completed: event.status === 'cancelled' ? true : taskCalendarEvent.task.completed
          }
        });
        
        // Track the sync event
        trackEvent('calendar_event_synced', {
          userId,
          details: {
            taskId: taskCalendarEvent.taskId,
            eventId: event.id,
            action: 'updated'
          }
        });
      }
    } else if (resourceState === 'not_exists') {
      // The event was deleted in Google Calendar
      const taskCalendarEvent = await db.taskCalendarEvent.findFirst({
        where: {
          calendarEventId: resourceId
        }
      });
      
      if (taskCalendarEvent) {
        // Mark the task as completed
        await db.task.update({
          where: {
            id: taskCalendarEvent.taskId
          },
          data: {
            completed: true
          }
        });
        
        // Delete the calendar event reference
        await db.taskCalendarEvent.delete({
          where: {
            id: taskCalendarEvent.id
          }
        });
        
        // Track the sync event
        trackEvent('calendar_event_synced', {
          userId,
          details: {
            taskId: taskCalendarEvent.taskId,
            eventId: resourceId,
            action: 'deleted'
          }
        });
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing calendar webhook:", error);
    return NextResponse.json(
      { message: "Failed to process webhook" },
      { status: 500 }
    );
  }
} 