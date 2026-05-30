import { NextRequest, NextResponse } from 'next/server';
import { saveConfig, loadConfig, clearConfig } from '@/lib/store';
import { getThreadsProfile } from '@/lib/threads';

// GET: return current config (masked)
export async function GET() {
  const config = loadConfig();
  if (!config) {
    return NextResponse.json({ connected: false });
  }
  return NextResponse.json({
    connected: true,
    userId: config.userId,
    username: config.username,
  });
}

// POST: save access token + verify
export async function POST(req: NextRequest) {
  try {
    const { accessToken } = await req.json();
    if (!accessToken || typeof accessToken !== 'string') {
      return NextResponse.json({ error: 'accessToken is required' }, { status: 400 });
    }

    const profile = await getThreadsProfile(accessToken.trim());
    saveConfig({
      accessToken: accessToken.trim(),
      userId: profile.id,
      username: profile.username,
    });

    return NextResponse.json({
      connected: true,
      userId: profile.id,
      username: profile.username,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

// DELETE: disconnect
export async function DELETE() {
  clearConfig();
  return NextResponse.json({ connected: false });
}
