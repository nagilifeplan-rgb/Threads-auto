import { NextResponse } from 'next/server';
import { loadPosts } from '@/lib/store';

// GET: return all posts sorted by scheduledAt desc
export async function GET() {
  const posts = loadPosts().sort(
    (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
  );
  return NextResponse.json(posts);
}
