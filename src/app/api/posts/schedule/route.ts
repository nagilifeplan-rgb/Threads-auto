import { NextRequest, NextResponse } from 'next/server';
import { addPost } from '@/lib/store';
import { v4 as uuidv4 } from 'uuid';

// POST: create a new scheduled post
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content, scheduledAt, mediaUrls } = body;

    if (!content || typeof content !== 'string' || content.trim() === '') {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }
    if (!scheduledAt) {
      return NextResponse.json({ error: 'scheduledAt is required' }, { status: 400 });
    }

    const scheduled = new Date(scheduledAt);
    if (isNaN(scheduled.getTime())) {
      return NextResponse.json({ error: 'Invalid scheduledAt date' }, { status: 400 });
    }
    if (scheduled <= new Date()) {
      return NextResponse.json({ error: 'scheduledAt must be in the future' }, { status: 400 });
    }
    if (content.trim().length > 500) {
      return NextResponse.json({ error: 'Content exceeds 500 characters' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const post = {
      id: uuidv4(),
      content: content.trim(),
      scheduledAt: scheduled.toISOString(),
      status: 'pending' as const,
      mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [],
      createdAt: now,
      updatedAt: now,
    };

    addPost(post);
    return NextResponse.json(post, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
