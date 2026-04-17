// ============================================================
// GSC VERIFICATION ROUTE — serves the Google verification file
// Next.js App Router catches all routes before /public is checked,
// so we serve the verification content as a route handler.
// ============================================================

export async function GET() {
  return new Response('google-site-verification: googledc7df46b0486632f.html', {
    headers: { 'Content-Type': 'text/html' },
  });
}
