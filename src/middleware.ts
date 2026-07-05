// Next.js only recognizes middleware exported from src/middleware.ts (or .js).
// The actual implementation lives in src/auth-proxy.ts to keep the file name
// semantically aligned with its role (JWT auth proxy, CSRF, rate-limit, security headers).
// This file simply re-exports so Next.js picks it up automatically.

export { proxy as middleware } from './auth-proxy';
export const config = {
  // Matcher: run middleware on everything EXCEPT:
  //   - Next.js internals (_next/static, _next/image)
  //   - Well-known static files (favicon, sw.js)
  //   - Unauthenticated API health/cron endpoints
  //   - Static media assets (mp4/webm/mov/m4v/mp3/wav/ogg/...) served from /public
  //
  // The media-extension exclusion is critical: without it, requests for
  // /hero.mp4 (and any other media file in public/) were hitting the JWT auth
  // check and getting redirected to /login for anonymous visitors, returning
  // HTML instead of the binary asset — which silently broke the landing-page
  // hero video (the <video> element could not decode the HTML and fell back to
  // its <img> child). See src/auth-proxy.ts::isStaticFile for the matching
  // in-function check (defense in depth).
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw.js|api/health|api/cron|.*\\.(?:mp4|webm|mov|m4v|mp3|wav|ogg|m4a|aac|flac|avi|mkv)$).*)',
  ],
};
