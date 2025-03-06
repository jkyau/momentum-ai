# Google Calendar Integration

This document outlines the implementation of Google Calendar integration with Momentum tasks.

## Overview

The Google Calendar integration allows users to:
- Connect their Google Calendar account to Momentum
- Create tasks that automatically add events to their Google Calendar
- Update calendar events when tasks are modified
- Delete calendar events when tasks are deleted

## Architecture

The integration follows a client-server architecture:

1. **Client-side components**:
   - Calendar integration settings UI in the Settings page
   - Task form with calendar options
   - Task detail view showing calendar event information

2. **Server-side components**:
   - OAuth authentication flow for Google Calendar
   - Token management and secure storage
   - Calendar API service for CRUD operations
   - Task API routes with calendar integration

3. **Database schema**:
   - `UserIntegration` table for storing OAuth tokens and preferences
   - `TaskCalendarEvent` table for mapping tasks to calendar events
   - Extended `Task` model with calendar integration fields

## Implementation Details

### Authentication Flow

1. User clicks "Connect Calendar" in the Settings page
2. System generates an OAuth URL and redirects the user to Google's consent screen
3. After granting permission, Google redirects back to Momentum with an authorization code
4. The system exchanges the code for access and refresh tokens
5. Tokens are encrypted and stored in the database

### Task-Calendar Synchronization

When a user creates or updates a task with calendar integration enabled:

1. The task is saved to the database
2. A calendar event is created/updated via the Google Calendar API
3. The calendar event ID is stored in the `TaskCalendarEvent` table
4. The task detail view shows the calendar event information with a link to view it in Google Calendar

When a task is deleted:
1. The associated calendar event is deleted from Google Calendar
2. The `TaskCalendarEvent` record is removed from the database

### Security Considerations

- OAuth tokens are encrypted before storage using AES-256-CBC encryption
- The encryption key is stored as an environment variable
- Refresh token rotation is handled automatically
- Users can disconnect their Google Calendar integration at any time

## User Experience

### Settings Page

The Settings page provides:
- Connection status indicator
- Connect/Disconnect button
- Default calendar selection
- Link to open Google Calendar

### Task Creation/Editing

When creating or editing a task:
- Toggle to enable/disable calendar integration
- Time picker for the event start time
- Duration selector (30 min, 1 hour, 2 hours, etc.)
- Reminder settings (5 min, 15 min, 30 min, etc. before the event)

### Task Detail View

The task detail view shows:
- Calendar integration status
- Event time and duration
- Link to view the event in Google Calendar

## Error Handling

The integration includes robust error handling:
- Connection failures show clear error messages
- Token refresh failures prompt the user to reconnect
- API errors are logged and appropriate fallbacks are implemented
- Network issues are handled gracefully with retry mechanisms

## Testing

The integration is tested with:
- Unit tests for the calendar service functions
- Integration tests for the API routes
- End-to-end tests for the user flow

## Future Enhancements

Potential future enhancements include:
- Two-way synchronization (updates from Google Calendar reflected in Momentum)
- Support for recurring tasks/events
- Calendar availability checking to avoid scheduling conflicts
- Multiple calendar support for different task categories 