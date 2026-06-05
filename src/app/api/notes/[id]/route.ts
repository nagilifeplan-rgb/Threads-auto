/**
 * GET    /api/notes/[id]
 * PATCH  /api/notes/[id]
 * DELETE /api/notes/[id]
 */
import { NextRequest, NextResponse } from 'next/server';
import { getNote, updateNote, deleteNote } from '@/lib/store';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const note = getNote(id);
  if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(note);
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const update = await req.json();
  // Allowed fields
  const patch: Record<string, unknown> = {};
  if (typeof update.title === 'string') patch.title = update.title;
  if (typeof update.body === 'string') patch.body = update.body;
  if (Array.isArray(update.tags)) patch.tags = update.tags.map(String);
  if (typeof update.threadsDraft === 'string') patch.threadsDraft = update.threadsDraft;
  if (typeof update.threadsPostedId === 'string') patch.threadsPostedId = update.threadsPostedId;

  const ok = updateNote(id, patch);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(getNote(id));
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const ok = deleteNote(id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
