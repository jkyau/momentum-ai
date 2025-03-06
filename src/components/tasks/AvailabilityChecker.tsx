import { useState } from 'react';
import { format, addMinutes, parseISO } from 'date-fns';
import { Calendar, Clock, Loader2, AlertCircle, Check } from 'lucide-react';

interface AvailabilityCheckerProps {
  dueDate: string;
  eventTime: string;
  eventDuration: number;
  onTimeChange: (newTime: string) => void;
}

export const AvailabilityChecker = ({
  dueDate,
  eventTime,
  eventDuration,
  onTimeChange
}: AvailabilityCheckerProps) => {
  const [isChecking, setIsChecking] = useState(false);
  const [availability, setAvailability] = useState<{
    available: boolean;
    conflicts?: any[];
    suggestedTimes?: string[];
  } | null>(null);
  
  const checkAvailability = async () => {
    if (!dueDate || !eventTime) return;
    
    setIsChecking(true);
    
    try {
      // Calculate end time
      const startDateTime = new Date(`${dueDate}T${eventTime}`);
      const endDateTime = addMinutes(startDateTime, eventDuration);
      const endTime = format(endDateTime, 'HH:mm');
      
      const response = await fetch(`/api/integrations/google-calendar/availability?date=${dueDate}&startTime=${eventTime}&endTime=${endTime}`);
      
      if (!response.ok) {
        throw new Error('Failed to check availability');
      }
      
      const data = await response.json();
      
      // If not available, suggest alternative times
      if (!data.available && data.conflicts) {
        const suggestedTimes = generateAlternativeTimes(dueDate, eventTime, eventDuration, data.conflicts);
        setAvailability({
          ...data,
          suggestedTimes
        });
      } else {
        setAvailability(data);
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      // Show error state
    } finally {
      setIsChecking(false);
    }
  };
  
  const generateAlternativeTimes = (date: string, time: string, duration: number, conflicts: any[]): string[] => {
    // Start with some reasonable time slots
    const possibleStartTimes = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];
    const availableTimes: string[] = [];
    
    // Check each possible time against conflicts
    for (const startTime of possibleStartTimes) {
      const startDateTime = new Date(`${date}T${startTime}`);
      const endDateTime = addMinutes(startDateTime, duration);
      
      // Check if this time slot conflicts with any existing events
      const hasConflict = conflicts.some(event => {
        const eventStart = parseISO(event.start.dateTime);
        const eventEnd = parseISO(event.end.dateTime);
        
        return (
          (startDateTime >= eventStart && startDateTime < eventEnd) ||
          (endDateTime > eventStart && endDateTime <= eventEnd) ||
          (startDateTime <= eventStart && endDateTime >= eventEnd)
        );
      });
      
      if (!hasConflict) {
        availableTimes.push(startTime);
        
        // Limit to 3 suggestions
        if (availableTimes.length >= 3) break;
      }
    }
    
    return availableTimes;
  };
  
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={checkAvailability}
        disabled={isChecking || !dueDate || !eventTime}
        className="text-sm flex items-center text-primary hover:underline"
      >
        {isChecking ? (
          <Loader2 className="h-4 w-4 animate-spin mr-1" />
        ) : (
          <Calendar className="h-4 w-4 mr-1" />
        )}
        Check availability
      </button>
      
      {availability && (
        <div className="mt-2 p-2 rounded-md bg-muted/30">
          {availability.available ? (
            <div className="flex items-center text-green-600">
              <Check className="h-4 w-4 mr-1" />
              <span className="text-sm">Time slot is available</span>
            </div>
          ) : (
            <div>
              <div className="flex items-center text-amber-600 mb-2">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span className="text-sm">Time slot conflicts with existing events</span>
              </div>
              
              {availability.suggestedTimes && availability.suggestedTimes.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Suggested available times:</p>
                  <div className="flex flex-wrap gap-2">
                    {availability.suggestedTimes.map(time => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => onTimeChange(time)}
                        className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors"
                      >
                        <Clock className="h-3 w-3 inline mr-1" />
                        {format(parseISO(`2000-01-01T${time}`), 'h:mm a')}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 