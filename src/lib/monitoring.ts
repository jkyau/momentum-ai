// Simple monitoring utility

type EventType = 
  | 'calendar_connected'
  | 'calendar_disconnected'
  | 'calendar_event_created'
  | 'calendar_event_updated'
  | 'calendar_event_deleted'
  | 'calendar_event_synced'
  | 'calendar_webhook_created'
  | 'calendar_webhook_deleted'
  | 'calendar_error';

interface EventData {
  userId: string;
  timestamp: string;
  details?: Record<string, any>;
}

// In a production app, this would send data to a monitoring service
// For now, we'll just log to console and store in memory for demo purposes
const events: Array<{ type: EventType; data: EventData }> = [];

export const trackEvent = (type: EventType, data: Omit<EventData, 'timestamp'>) => {
  const event = {
    type,
    data: {
      ...data,
      timestamp: new Date().toISOString()
    }
  };
  
  events.push(event);
  console.log(`[MONITORING] ${type}:`, event.data);
  
  // In production, you would send this to your analytics service
  // Example: await analyticsService.trackEvent(type, event.data);
};

export const getEvents = () => {
  return [...events];
}; 