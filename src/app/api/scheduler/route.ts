/**
 * This route kick-starts the in-process scheduler on first request.
 * Next.js server-side code can import startScheduler() here.
 */
import { NextResponse } from 'next/server';
import { startScheduler } from '@/lib/scheduler';

// Ensure scheduler is running
startScheduler();

export async function GET() {
  return NextResponse.json({ status: 'scheduler running' });
}
