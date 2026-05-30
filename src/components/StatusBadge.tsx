'use client';
import { ScheduledPost } from '@/types';

const STATUS_MAP: Record<ScheduledPost['status'], { label: string; className: string }> = {
  pending: { label: '⏳ 予定', className: 'bg-yellow-100 text-yellow-800 border border-yellow-300' },
  posted: { label: '✅ 投稿済み', className: 'bg-green-100 text-green-800 border border-green-300' },
  failed: { label: '❌ 失敗', className: 'bg-red-100 text-red-800 border border-red-300' },
  cancelled: { label: '🚫 キャンセル', className: 'bg-gray-100 text-gray-600 border border-gray-300' },
};

export function StatusBadge({ status }: { status: ScheduledPost['status'] }) {
  const { label, className } = STATUS_MAP[status] ?? STATUS_MAP.pending;
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${className}`}>{label}</span>
  );
}
