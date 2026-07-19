const headers = {
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
}

// Next.js is stateless. Backend readiness is probed independently so that a
// catalog outage does not restart an otherwise healthy storefront process.
export async function GET() {
  return new Response('ok', { status: 200, headers })
}

export async function HEAD() {
  return new Response(null, { status: 200, headers })
}
