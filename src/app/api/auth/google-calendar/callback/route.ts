import { NextResponse } from "next/server";
import { redirect } from "next/navigation";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    
    if (!code || !state) {
      return NextResponse.redirect(new URL('/settings?error=missing_params', req.url));
    }
    
    // Redirect to settings page with auth code and state
    // The client will handle the token exchange
    return NextResponse.redirect(
      new URL(`/settings?code=${code}&state=${state}&integration=google_calendar`, req.url)
    );
  } catch (error) {
    console.error("Error in OAuth callback:", error);
    return NextResponse.redirect(new URL('/settings?error=oauth_callback', req.url));
  }
} 