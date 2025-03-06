import { db } from "@/lib/db";
import { setupCalendarWebhook, stopCalendarWebhook } from "@/lib/services/googleCalendar";
import { addDays } from "date-fns";

export const renewCalendarWebhooks = async (): Promise<void> => {
  try {
    // Find webhooks that will expire in the next 24 hours
    const expiringWebhooks = await db.calendarWebhook.findMany({
      where: {
        expiration: {
          lte: addDays(new Date(), 1)
        }
      },
      include: {
        userIntegration: true
      }
    });
    
    console.log(`Found ${expiringWebhooks.length} webhooks to renew`);
    
    for (const webhook of expiringWebhooks) {
      try {
        const userId = webhook.userIntegration.userId;
        
        // Stop the existing webhook
        await stopCalendarWebhook(
          userId,
          webhook.channelId,
          webhook.resourceId
        );
        
        // Set up a new webhook
        await setupCalendarWebhook(userId);
        
        console.log(`Renewed webhook for user ${userId}`);
      } catch (error) {
        console.error(`Error renewing webhook for user ${webhook.userIntegration.userId}:`, error);
        // Continue with the next webhook
      }
    }
    
    // Clean up expired webhooks that failed to renew
    const now = new Date();
    await db.calendarWebhook.deleteMany({
      where: {
        expiration: {
          lt: now
        }
      }
    });
  } catch (error) {
    console.error("Error renewing calendar webhooks:", error);
  }
}; 