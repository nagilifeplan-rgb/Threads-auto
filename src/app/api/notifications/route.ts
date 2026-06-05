/**
 * GET /api/notifications        → 一覧（新しい順）
 * DELETE /api/notifications     → 全削除（?all=1）
 * PATCH /api/notifications      → 全部既読化
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  loadNotifications,
  clearAllNotifications,
  markAllNotificationsRead,
} from '@/lib/store';

export async function GET() {
  return NextResponse.json(loadNotifications());
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('all') === '1') {
    clearAllNotifications();
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: 'specify ?all=1' }, { status: 400 });
}

export async function PATCH() {
  markAllNotificationsRead();
  return NextResponse.json({ success: true });
}
