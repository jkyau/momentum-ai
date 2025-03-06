import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { google } from "googleapis";
import { encrypt } from "@/lib/encryption";

// Google OAuth configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Scopes required for calendar access
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

export async function GET(req: Request) {
  try {
    // Get authenticated user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    // Generate OAuth URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent', // Force to get refresh token
      state: userId // Pass userId as state for verification
    });

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error("Error generating auth URL:", error);
    return NextResponse.json(
      { message: "Failed to initiate Google Calendar authentication" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { code, state } = await req.json();
    
    // Verify state matches userId from auth
    const { userId } = await auth();
    if (!userId || state !== userId) {
      return NextResponse.json(
        { message: "Authentication verification failed" },
        { status: 401 }
      );
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    // Encrypt sensitive data before storing
    const encryptedAccessToken = encrypt(tokens.access_token || '');
    const encryptedRefreshToken = encrypt(tokens.refresh_token || '');
    
    // Store tokens in database
    await db.userIntegration.upsert({
      where: {
        userId_provider: {
          userId,
          provider: 'google_calendar'
        }
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        isActive: true,
        updatedAt: new Date()
      },
      create: {
        userId,
        provider: 'google_calendar',
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        isActive: true
      }
    });

    // Get list of user's calendars to select default
    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const calendarList = await calendar.calendarList.list();
    
    return NextResponse.json({ 
      success: true,
      calendars: calendarList.data.items
    });
  } catch (error) {
    console.error("Error completing OAuth flow:", error);
    return NextResponse.json(
      { message: "Failed to complete Google Calendar authentication" },
      { status: 500 }
    );
  }
} 