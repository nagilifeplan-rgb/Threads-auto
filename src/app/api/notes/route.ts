/**
 * GET  /api/notes      → 一覧
 * POST /api/notes      → 新規作成
 */
import { NextRequest, NextResponse } from 'next/server';
import { loadNotes, addNote } from '@/lib/store';
import { v4 as uuidv4 } from 'uuid';
import { NoteArticle } from '@/types';

export async function GET() {
  const notes = loadNotes().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  return NextResponse.json(notes);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title = typeof body.title === 'string' ? body.title : '';
    const noteBody = typeof body.body === 'string' ? body.body : '';
    const tags = Array.isArray(body.tags) ? body.tags.map(String) : [];
    const threadsDraft = typeof body.threadsDraft === 'string' ? body.threadsDraft : undefined;

    const now = new Date().toISOString();
    const note: NoteArticle = {
      id: uuidv4(),
      title: title.trim(),
      body: noteBody,
      tags,
      threadsDraft,
      createdAt: now,
      updatedAt: now,
    };
    addNote(note);
    return NextResponse.json(note, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
