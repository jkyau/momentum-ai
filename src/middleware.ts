import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define all routes as public for testing purposes
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhook(.*)',
  '/dashboard(.*)', // Temporarily allow access to dashboard routes
  '/api(.*)'         // Temporarily allow access to API routes
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!.*\\..*|_next).*)',
    '/',
    '/(api|trpc)(.*)'
  ],
}; 