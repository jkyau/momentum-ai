import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/lib/services/googleCalendar';
import { db } from '@/lib/db';

// Mock the Google API and database
vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(() => ({
        setCredentials: vi.fn(),
        on: vi.fn(),
      })),
    },
    calendar: vi.fn().mockImplementation(() => ({
      calendarList: {
        list: vi.fn().mockResolvedValue({
          data: {
            items: [
              { id: 'primary', summary: 'Primary Calendar' },
              { id: 'secondary', summary: 'Secondary Calendar' },
            ],
          },
        }),
        get: vi.fn().mockResolvedValue({}),
      },
      events: {
        insert: vi.fn().mockResolvedValue({
          data: { id: 'event-123' },
        }),
        update: vi.fn().mockResolvedValue({
          data: { id: 'event-123', updated: true },
        }),
        delete: vi.fn().mockResolvedValue({}),
      },
    })),
  },
}));

vi.mock('@/lib/db', () => ({
  db: {
    userIntegration: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    taskCalendarEvent: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('@/lib/utils/encryption', () => ({
  decrypt: vi.fn().mockReturnValue('decrypted-token'),
}));

describe('Google Calendar Service', () => {
  beforeEach(() => {
    // Setup mocks for each test
    vi.mocked(db.userIntegration.findUnique).mockResolvedValue({
      id: 'integration-1',
      userId: 'user-1',
      provider: 'google_calendar',
      accessToken: 'encrypted-token',
      refreshToken: 'encrypted-refresh-token',
      tokenExpiry: new Date(Date.now() + 3600000),
      isActive: true,
      defaultCalendarId: 'primary',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    vi.mocked(db.taskCalendarEvent.create).mockResolvedValue({
      id: 'task-calendar-1',
      taskId: 'task-1',
      calendarId: 'primary',
      calendarEventId: 'event-123',
      eventTime: '09:00',
      eventDuration: 60,
      reminderMinutes: 30,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    vi.mocked(db.taskCalendarEvent.findFirst).mockResolvedValue(null);
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });
  
  it('should create a calendar event', async () => {
    const result = await createCalendarEvent(
      'user-1',
      'task-1',
      'Test Task',
      '2023-12-31',
      '09:00',
      60,
      30
    );
    
    expect(result).toEqual({ id: 'event-123' });
    expect(db.taskCalendarEvent.create).toHaveBeenCalledWith({
      data: {
        taskId: 'task-1',
        calendarId: 'primary',
        calendarEventId: 'event-123',
        eventTime: '09:00',
        eventDuration: 60,
        reminderMinutes: 30,
      },
    });
  });
  
  it('should update a calendar event', async () => {
    // Mock existing calendar event
    vi.mocked(db.taskCalendarEvent.findFirst).mockResolvedValue({
      id: 'task-calendar-1',
      taskId: 'task-1',
      calendarId: 'primary',
      calendarEventId: 'event-123',
      eventTime: '09:00',
      eventDuration: 60,
      reminderMinutes: 30,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    const result = await updateCalendarEvent(
      'user-1',
      'task-1',
      'Updated Task',
      '2023-12-31',
      '10:00',
      120,
      15
    );
    
    expect(result).toEqual({ id: 'event-123', updated: true });
    expect(db.taskCalendarEvent.update).toHaveBeenCalledWith({
      where: {
        id: 'task-calendar-1',
      },
      data: {
        eventTime: '10:00',
        eventDuration: 120,
        reminderMinutes: 15,
      },
    });
  });
  
  it('should delete a calendar event', async () => {
    // Mock existing calendar event
    vi.mocked(db.taskCalendarEvent.findFirst).mockResolvedValue({
      id: 'task-calendar-1',
      taskId: 'task-1',
      calendarId: 'primary',
      calendarEventId: 'event-123',
      eventTime: '09:00',
      eventDuration: 60,
      reminderMinutes: 30,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    const result = await deleteCalendarEvent('task-1', 'user-1');
    
    expect(result).toBe(true);
    expect(db.taskCalendarEvent.delete).toHaveBeenCalledWith({
      where: {
        id: 'task-calendar-1',
      },
    });
  });
}); 