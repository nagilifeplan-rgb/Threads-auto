/**
 * POST /api/spreadsheet/import
 *
 * Body: { rows: SpreadsheetRow[], sourceFile?: string }
 * Only valid rows are scheduled.
 * Returns: { scheduled: number, skipped: number, posts: ScheduledPost[] }
 */
import { NextRequest, NextResponse } from 'next/server';
import { addPost } from '@/lib/store';
import { SpreadsheetRow, ScheduledPost } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const { rows, sourceFile } = (await req.json()) as {
      rows: SpreadsheetRow[];
      sourceFile?: string;
    };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: '行データがありません' }, { status: 400 });
    }

    const validRows = rows.filter((r) => r.valid);
    if (validRows.length === 0) {
      return NextResponse.json({ error: '有効な行がありません' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const scheduled: ScheduledPost[] = [];

    for (const row of validRows) {
      const post: ScheduledPost = {
        id: uuidv4(),
        content: row.content,
        scheduledAt: row.scheduledAt,
        status: 'pending',
        mediaUrls: [],
        source: sourceFile?.includes('google') ? 'sheets' : 'csv',
        sourceFile: sourceFile ?? '',
        createdAt: now,
        updatedAt: now,
      };
      addPost(post);
      scheduled.push(post);
    }

    return NextResponse.json({
      scheduled: scheduled.length,
      skipped: rows.length - validRows.length,
      posts: scheduled,
    }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
