/**
 * DELETE /api/notifications/[id]  → 個別削除
 * PATCH  /api/notifications/[id]  → 既読化
 */
import { NextRequest, NextResponse } from 'next/server';
import { deleteNotification, markNotificationRead } from '@/lib/store';

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const ok = deleteNotification(id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function PATCH(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const ok = markNotificationRead(id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
