import { google } from 'googleapis';
import { decrypt, encrypt } from '@/lib/encryption';
import { db } from '@/lib/db';
import { trackEvent } from '@/lib/monitoring';

// Google OAuth configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Add caching for OAuth clients to avoid recreating them for each request
const oauthClientCache = new Map<string, any>();
const OAUTH_CLIENT_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Create OAuth2 client with caching
export const createOAuth2Client = async (userId: string) => {
  // Check if we have a cached client that's still valid
  const cachedClient = oauthClientCache.get(userId);
  if (cachedClient && cachedClient.expiresAt > Date.now()) {
    return cachedClient.client;
  }
  
  const integration = await db.userIntegration.findUnique({
    where: {
      userId_provider: {
        userId,
        provider: 'google_calendar'
      }
    }
  });
  
  if (!integration || !integration.accessToken) {
    throw new Error('Google Calendar integration not found or inactive');
  }
  
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  
  // Set credentials
  oauth2Client.setCredentials({
    access_token: decrypt(integration.accessToken),
    refresh_token: integration.refreshToken ? decrypt(integration.refreshToken) : undefined,
    expiry_date: integration.tokenExpiry ? new Date(integration.tokenExpiry).getTime() : undefined
  });
  
  // Handle token refresh if needed
  oauth2Client.on('tokens', async (tokens) => {
    const updates: any = {};
    
    if (tokens.access_token) {
      updates.accessToken = tokens.access_token;
    }
    
    if (tokens.refresh_token) {
      updates.refreshToken = tokens.refresh_token;
    }
    
    if (tokens.expiry_date) {
      updates.tokenExpiry = new Date(tokens.expiry_date);
    }
    
    // Only update if we have changes
    if (Object.keys(updates).length > 0) {
      await db.userIntegration.update({
        where: {
          userId_provider: {
            userId,
            provider: 'google_calendar'
          }
        },
        data: updates
      });
    }
  });
  
  // Cache the client
  oauthClientCache.set(userId, {
    client: oauth2Client,
    expiresAt: Date.now() + OAUTH_CLIENT_CACHE_TTL
  });
  
  return oauth2Client;
};

export async function getAuthenticatedCalendarClient(userId: string) {
  try {
    // Get user's integration data
    const integration = await db.userIntegration.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: 'google_calendar'
        }
      }
    });

    if (!integration || !integration.isActive) {
      throw new Error('Google Calendar integration not found or inactive');
    }

    // Check if token is expired and refresh if needed
    const tokenExpiry = integration.tokenExpiry?.getTime() || 0;
    const isExpired = tokenExpiry < Date.now();

    if (isExpired && integration.refreshToken) {
      const refreshToken = decrypt(integration.refreshToken);
      
      oauth2Client.setCredentials({
        refresh_token: refreshToken
      });

      const { credentials } = await oauth2Client.refreshAccessToken();
      
      // Update tokens in database
      await db.userIntegration.update({
        where: {
          id: integration.id
        },
        data: {
          accessToken: encrypt(credentials.access_token || ''),
          tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
          updatedAt: new Date()
        }
      });

      oauth2Client.setCredentials(credentials);
    } else {
      // Use existing token
      oauth2Client.setCredentials({
        access_token: decrypt(integration.accessToken),
        refresh_token: integration.refreshToken ? decrypt(integration.refreshToken) : undefined,
        expiry_date: integration.tokenExpiry?.getTime()
      });
    }

    // Return authenticated calendar client
    return google.calendar({ version: 'v3', auth: oauth2Client });
  } catch (error) {
    console.error('Error getting authenticated calendar client:', error);
    throw new Error('Failed to authenticate with Google Calendar');
  }
}

// Retry mechanism for API calls
const retryOperation = async <T>(
  operation: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    if (retries <= 0) {
      throw error;
    }
    
    // Check if error is due to token expiration
    if (error.code === 401) {
      // Token is likely expired, let OAuth client handle refresh
      console.log('Token expired, will retry with refreshed token');
    } else {
      console.log(`Operation failed, retrying in ${delay}ms. Retries left: ${retries}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryOperation(operation, retries - 1, delay * 2);
  }
};

// Enhanced error logging
const logCalendarError = (error: any, operation: string, userId: string) => {
  const errorDetails = {
    operation,
    userId,
    errorCode: error.code,
    errorMessage: error instanceof Error ? error.message : String(error),
    timestamp: new Date().toISOString()
  };
  
  console.error('Google Calendar API Error:', JSON.stringify(errorDetails, null, 2));
  
  // In a production environment, you might want to log to a monitoring service
  // Example: await logToMonitoringService(errorDetails);
};

// Helper function to create RRULE string for Google Calendar
const createRRule = (
  pattern: string,
  count?: number,
  endDate?: string
): string => {
  let rrule = `RRULE:FREQ=${pattern}`;
  
  if (count && !endDate) {
    rrule += `;COUNT=${count}`;
  } else if (endDate) {
    // Format date as YYYYMMDD for UNTIL parameter
    const formattedDate = endDate.replace(/-/g, '');
    rrule += `;UNTIL=${formattedDate}T235959Z`;
  }
  
  return rrule;
};

// Update createCalendarEvent to handle recurrence
export const createCalendarEvent = async (
  userId: string,
  taskId: string,
  taskText: string,
  dueDate: string,
  eventTime: string,
  eventDuration: number,
  reminderMinutes: number,
  recurrence?: {
    pattern: string;
    count?: number;
    endDate?: string;
  }
) => {
  try {
    const auth = await createOAuth2Client(userId);
    const calendar = google.calendar({ version: 'v3', auth });
    
    // Get default calendar ID
    const integration = await db.userIntegration.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: 'google_calendar'
        }
      },
      select: {
        defaultCalendarId: true
      }
    });
    
    const calendarId = integration?.defaultCalendarId || 'primary';
    
    // Create start and end times
    const startDateTime = new Date(`${dueDate}T${eventTime}`);
    const endDateTime = new Date(startDateTime.getTime() + eventDuration * 60000);
    
    // Create event
    const event: any = {
      summary: taskText,
      description: `Task created in Momentum`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      reminders: {
        useDefault: false,
        overrides: reminderMinutes > 0 ? [
          { method: 'popup', minutes: reminderMinutes }
        ] : []
      }
    };
    
    // Add recurrence if specified
    if (recurrence) {
      event.recurrence = [
        createRRule(recurrence.pattern, recurrence.count, recurrence.endDate)
      ];
    }
    
    // Use retry mechanism for API call
    const response = await retryOperation(() => 
      calendar.events.insert({
        calendarId,
        requestBody: event
      })
    );
    
    // Save calendar event reference in database
    await db.taskCalendarEvent.create({
      data: {
        taskId,
        calendarId,
        calendarEventId: response.data.id!,
        eventTime,
        eventDuration,
        reminderMinutes,
        recurrencePattern: recurrence?.pattern,
        recurrenceCount: recurrence?.count,
        recurrenceEndDate: recurrence?.endDate ? new Date(recurrence.endDate) : null
      }
    });
    
    // Track successful event creation
    trackEvent('calendar_event_created', {
      userId,
      details: {
        taskId,
        calendarId,
        eventId: response.data.id,
        isRecurring: !!recurrence
      }
    });
    
    return response.data;
  } catch (error) {
    // Track error
    trackEvent('calendar_error', {
      userId,
      details: {
        operation: 'createCalendarEvent',
        errorMessage: error instanceof Error ? error.message : String(error),
        taskId
      }
    });
    
    logCalendarError(error, 'createCalendarEvent', userId);
    throw new Error(`Failed to create calendar event: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export async function updateCalendarEvent(userId: string, task: any) {
  try {
    // Get the calendar event reference
    const calendarEvent = await db.taskCalendarEvent.findFirst({
      where: {
        taskId: task.id
      }
    });
    
    if (!calendarEvent) {
      // If no event exists, create a new one
      return createCalendarEvent(userId, task.id, task.text, task.dueDate, task.eventTime || '09:00', task.eventDuration || 60, task.reminderMinutes || 30);
    }
    
    const calendar = await getAuthenticatedCalendarClient(userId);
    
    // Parse due date and time
    const dueDate = new Date(task.dueDate);
    let startTime = task.eventTime || '09:00';
    const [hours, minutes] = startTime.split(':').map(Number);
    
    dueDate.setHours(hours, minutes, 0);
    
    // Calculate end time based on duration
    const endDate = new Date(dueDate);
    endDate.setMinutes(endDate.getMinutes() + (task.eventDuration || 60));
    
    // Update event
    const event = {
      summary: task.text,
      description: `Task from Momentum: ${task.text}`,
      start: {
        dateTime: dueDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: task.reminderMinutes || 30 }
        ]
      }
    };
    
    const response = await calendar.events.update({
      calendarId: calendarEvent.calendarId,
      eventId: calendarEvent.calendarEventId,
      requestBody: event
    });
    
    // Update the last synced timestamp
    await db.taskCalendarEvent.update({
      where: {
        id: calendarEvent.id
      },
      data: {
        // Remove the lastSynced field as it doesn't exist in the schema
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error updating calendar event:', error);
    throw new Error('Failed to update calendar event');
  }
}

export async function deleteCalendarEvent(userId: string, taskId: string) {
  try {
    // Get the calendar event reference
    const calendarEvent = await db.taskCalendarEvent.findFirst({
      where: {
        taskId
      }
    });
    
    if (!calendarEvent) {
      return null; // No event to delete
    }
    
    const calendar = await getAuthenticatedCalendarClient(userId);
    
    // Delete the event
    await calendar.events.delete({
      calendarId: calendarEvent.calendarId,
      eventId: calendarEvent.calendarEventId
    });
    
    // Remove the reference
    await db.taskCalendarEvent.delete({
      where: {
        id: calendarEvent.id
      }
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    throw new Error('Failed to delete calendar event');
  }
}

export async function getUserCalendars(userId: string) {
  try {
    const auth = await createOAuth2Client(userId);
    const calendar = google.calendar({ version: 'v3', auth });
    
    const response = await calendar.calendarList.list();
    return response.data.items || [];
  } catch (error) {
    console.error('Error fetching user calendars:', error);
    throw error;
  }
}

export async function setDefaultCalendar(userId: string, calendarId: string) {
  try {
    // Verify calendar exists
    const auth = await createOAuth2Client(userId);
    const calendar = google.calendar({ version: 'v3', auth });
    
    await calendar.calendarList.get({
      calendarId
    });
    
    // Update default calendar in database
    await db.userIntegration.update({
      where: {
        userId_provider: {
          userId,
          provider: 'google_calendar'
        }
      },
      data: {
        defaultCalendarId: calendarId
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error setting default calendar:', error);
    throw error;
  }
}

// Check for scheduling conflicts
export const checkAvailability = async (
  userId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<{ available: boolean; conflicts?: any[] }> => {
  try {
    const auth = await createOAuth2Client(userId);
    const calendar = google.calendar({ version: 'v3', auth });
    
    // Get default calendar ID
    const integration = await db.userIntegration.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: 'google_calendar'
        }
      },
      select: {
        defaultCalendarId: true
      }
    });
    
    const calendarId = integration?.defaultCalendarId || 'primary';
    
    // Create time bounds for the query
    const timeMin = new Date(`${date}T${startTime}`);
    const timeMax = new Date(`${date}T${endTime}`);
    
    // Query for events during the specified time period
    const response = await calendar.events.list({
      calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });
    
    const events = response.data.items || [];
    
    return {
      available: events.length === 0,
      conflicts: events.length > 0 ? events : undefined
    };
  } catch (error) {
    logCalendarError(error, 'checkAvailability', userId);
    throw new Error(`Failed to check availability: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Set up webhook for calendar changes
export const setupCalendarWebhook = async (userId: string): Promise<void> => {
  try {
    const auth = await createOAuth2Client(userId);
    const calendar = google.calendar({ version: 'v3', auth });
    
    // Get the user's integration
    const integration = await db.userIntegration.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: 'google_calendar'
        }
      }
    });
    
    if (!integration) {
      throw new Error('Google Calendar integration not found');
    }
    
    const calendarId = integration.defaultCalendarId || 'primary';
    
    // Generate a unique channel ID
    const channelId = `momentum-calendar-${userId}-${Date.now()}`;
    
    // Set up the webhook
    const response = await calendar.events.watch({
      calendarId,
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/google-calendar`,
        // Token to identify the user
        token: userId,
        // Webhook will be active for 7 days
        expiration: (Date.now() + 7 * 24 * 60 * 60 * 1000).toString()
      }
    });
    
    // Store the webhook information
    await db.calendarWebhook.create({
      data: {
        channelId,
        resourceId: response.data.resourceId!,
        expiration: new Date(parseInt(response.data.expiration!)),
        calendarId,
        userIntegrationId: integration.id
      }
    });
    
    // Track the webhook setup
    trackEvent('calendar_webhook_created', {
      userId,
      details: {
        channelId,
        calendarId
      }
    });
  } catch (error) {
    logCalendarError(error, 'setupCalendarWebhook', userId);
    throw new Error(`Failed to set up calendar webhook: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Stop webhook subscription
export const stopCalendarWebhook = async (userId: string, channelId: string, resourceId: string): Promise<void> => {
  try {
    const auth = await createOAuth2Client(userId);
    const calendar = google.calendar({ version: 'v3', auth });
    
    // Stop the webhook
    await calendar.channels.stop({
      requestBody: {
        id: channelId,
        resourceId
      }
    });
    
    // Delete the webhook from the database
    await db.calendarWebhook.delete({
      where: {
        channelId
      }
    });
    
    // Track the webhook deletion
    trackEvent('calendar_webhook_deleted', {
      userId,
      details: {
        channelId
      }
    });
  } catch (error) {
    logCalendarError(error, 'stopCalendarWebhook', userId);
    // Continue even if there's an error, as we want to clean up the database
    
    // Delete the webhook from the database anyway
    try {
      await db.calendarWebhook.delete({
        where: {
          channelId
        }
      });
    } catch (dbError) {
      console.error('Error deleting webhook from database:', dbError);
    }
  }
}; 