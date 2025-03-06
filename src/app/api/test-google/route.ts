import { NextResponse } from 'next/server';
// @ts-ignore - googleapis package is installed in the Docker container
import { google } from 'googleapis';

export async function GET() {
  try {
    // Create a simple OAuth2 client to verify the package is working
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    return NextResponse.json({ 
      success: true, 
      message: 'Google APIs package is working correctly',
      clientId: process.env.GOOGLE_CLIENT_ID?.substring(0, 10) + '...',
      redirectUri: process.env.GOOGLE_REDIRECT_URI
    });
  } catch (error) {
    console.error('Error testing Google APIs:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 