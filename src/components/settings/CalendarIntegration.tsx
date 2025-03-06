"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { 
  Calendar, 
  Check, 
  ExternalLink, 
  Loader2, 
  RefreshCw, 
  X 
} from "lucide-react";

interface Calendar {
  id: string;
  summary: string;
  primary?: boolean;
}

export const CalendarIntegration = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [defaultCalendarId, setDefaultCalendarId] = useState<string>('primary');
  
  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const integration = searchParams.get('integration');
    
    if (code && state && integration === 'google_calendar') {
      handleOAuthCallback(code, state);
    }
  }, [searchParams]);
  
  // Load integration status
  useEffect(() => {
    fetchIntegrationStatus();
  }, []);
  
  const fetchIntegrationStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/integrations/google-calendar');
      
      if (!response.ok) {
        throw new Error('Failed to fetch integration status');
      }
      
      const data = await response.json();
      setIsConnected(data.connected);
      setCalendars(data.calendars || []);
      setDefaultCalendarId(data.defaultCalendarId || 'primary');
    } catch (error) {
      console.error('Error fetching integration status:', error);
      toast.error('Failed to load integration status');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleConnectCalendar = async () => {
    try {
      setIsConnecting(true);
      const response = await fetch('/api/auth/google-calendar');
      
      if (!response.ok) {
        throw new Error('Failed to initiate Google Calendar connection');
      }
      
      const { authUrl } = await response.json();
      
      // Redirect to Google OAuth
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error connecting to Google Calendar:', error);
      toast.error('Failed to connect to Google Calendar');
      setIsConnecting(false);
    }
  };
  
  const handleOAuthCallback = async (code: string, state: string) => {
    try {
      setIsConnecting(true);
      
      const response = await fetch('/api/auth/google-calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code, state })
      });
      
      if (!response.ok) {
        throw new Error('Failed to complete Google Calendar authentication');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setIsConnected(true);
        setCalendars(data.calendars || []);
        toast.success('Successfully connected to Google Calendar');
        
        // Remove query parameters from URL
        router.replace('/settings');
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error) {
      console.error('Error completing OAuth flow:', error);
      toast.error('Failed to connect to Google Calendar');
    } finally {
      setIsConnecting(false);
    }
  };
  
  const handleDisconnect = async () => {
    try {
      const response = await fetch('/api/integrations/google-calendar', {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to disconnect Google Calendar');
      }
      
      setIsConnected(false);
      setCalendars([]);
      toast.success('Disconnected from Google Calendar');
    } catch (error) {
      console.error('Error disconnecting from Google Calendar:', error);
      toast.error('Failed to disconnect from Google Calendar');
    }
  };
  
  const handleDefaultCalendarChange = async (calendarId: string) => {
    try {
      setDefaultCalendarId(calendarId);
      
      const response = await fetch('/api/integrations/google-calendar', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ defaultCalendarId: calendarId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update default calendar');
      }
      
      toast.success('Default calendar updated');
    } catch (error) {
      console.error('Error updating default calendar:', error);
      toast.error('Failed to update default calendar');
    }
  };
  
  // Mobile-friendly styles
  const mobileStyles = {
    container: "space-y-4 md:space-y-6",
    header: "flex flex-col md:flex-row md:items-center md:justify-between gap-2",
    connectionStatus: "flex items-center justify-between p-3 bg-muted/30 rounded-md md:p-4",
    calendarSelector: "mt-4 w-full",
    actionButton: "w-full md:w-auto flex justify-center items-center"
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2">Loading integration status...</span>
      </div>
    );
  }
  
  return (
    <div className={mobileStyles.container}>
      <div className={mobileStyles.header}>
        <div className="flex items-center">
          <Calendar className="h-6 w-6 mr-2 text-primary" />
          <h3 className="text-lg font-medium">Google Calendar Integration</h3>
        </div>
        
        <button
          onClick={fetchIntegrationStatus}
          className="p-2 rounded-full hover:bg-muted transition-colors self-end md:self-auto"
          aria-label="Refresh integration status"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      
      <div className="rounded-lg border p-4">
        <div className={mobileStyles.connectionStatus}>
          <div className="flex items-center">
            <div className={`h-3 w-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>{isConnected ? 'Connected' : 'Not connected'}</span>
          </div>
          
          {isConnected ? (
            <button
              onClick={handleDisconnect}
              className="text-sm flex items-center text-red-500 hover:text-red-700 transition-colors"
            >
              <X className="h-4 w-4 mr-1" />
              Disconnect
            </button>
          ) : (
            <button
              onClick={handleConnectCalendar}
              disabled={isConnecting}
              className={`${mobileStyles.actionButton} px-3 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50`}
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Calendar className="h-4 w-4 mr-1" />
              )}
              Connect Calendar
            </button>
          )}
        </div>
        
        {isConnected && (
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Default Calendar
              </label>
              <select
                value={defaultCalendarId}
                onChange={(e) => handleDefaultCalendarChange(e.target.value)}
                className={`${mobileStyles.calendarSelector} p-2 border rounded-md bg-background`}
              >
                {calendars.map((calendar) => (
                  <option key={calendar.id} value={calendar.id}>
                    {calendar.summary} {calendar.primary ? '(Primary)' : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Tasks will be added to this calendar by default
              </p>
            </div>
            
            <div className="pt-2">
              <a
                href="https://calendar.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm flex items-center text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Open Google Calendar
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 