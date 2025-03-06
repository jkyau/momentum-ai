import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Calendar {
  id: string;
  summary: string;
  primary?: boolean;
}

interface CalendarIntegrationState {
  isConnected: boolean;
  defaultCalendarId: string;
  calendars: Calendar[];
}

export const useCalendarIntegration = () => {
  const queryClient = useQueryClient();
  
  // Fetch integration status with React Query
  const { 
    data, 
    isLoading, 
    error, 
    refetch 
  } = useQuery<CalendarIntegrationState>({
    queryKey: ['calendarIntegration'],
    queryFn: async () => {
      const response = await fetch('/api/integrations/google-calendar');
      
      if (!response.ok) {
        throw new Error('Failed to fetch integration status');
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep data in cache for 10 minutes
  });
  
  // Update default calendar mutation
  const updateDefaultCalendarMutation = useMutation({
    mutationFn: async (calendarId: string) => {
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
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate the calendar integration query to refetch
      queryClient.invalidateQueries({ queryKey: ['calendarIntegration'] });
    }
  });
  
  // Disconnect integration mutation
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/integrations/google-calendar', {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to disconnect Google Calendar');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate the calendar integration query to refetch
      queryClient.invalidateQueries({ queryKey: ['calendarIntegration'] });
    }
  });
  
  const handleUpdateDefaultCalendar = useCallback((calendarId: string) => {
    updateDefaultCalendarMutation.mutate(calendarId);
  }, [updateDefaultCalendarMutation]);
  
  const handleDisconnect = useCallback(() => {
    disconnectMutation.mutate();
  }, [disconnectMutation]);
  
  return {
    isConnected: data?.isConnected || false,
    defaultCalendarId: data?.defaultCalendarId || 'primary',
    calendars: data?.calendars || [],
    isLoading,
    error,
    refetch,
    updateDefaultCalendar: handleUpdateDefaultCalendar,
    disconnect: handleDisconnect,
    isUpdating: updateDefaultCalendarMutation.isPending,
    isDisconnecting: disconnectMutation.isPending
  };
}; 