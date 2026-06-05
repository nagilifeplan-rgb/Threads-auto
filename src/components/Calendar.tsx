'use client';
import { useMemo, useState } from 'react';
import { ScheduledPost } from '@/types';
import { StatusBadge } from './StatusBadge';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
  addMonths,
  subMonths,
} from 'date-fns';
import { ja } from 'date-fns/locale';

interface Props {
  posts: ScheduledPost[];
  onCancel: (id: string) => Promise<void>;
}

const DOW = ['日', '月', '火', '水', '木', '金', '土'];

export function Calendar({ posts, onCancel }: Props) {
  const [cursor, setCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  // Group posts by date (YYYY-MM-DD)
  const postsByDate = useMemo(() => {
    const map = new Map<string, ScheduledPost[]>();
    for (const p of posts) {
      const key = format(new Date(p.scheduledAt), 'yyyy-MM-dd');
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    return map;
  }, [posts]);

  const getDayPosts = (d: Date) =>
    postsByDate.get(format(d, 'yyyy-MM-dd')) ?? [];

  const selectedPosts = selectedDate ? getDayPosts(selectedDate) : [];

  // Monthly stats
  const monthPosts = posts.filter((p) => {
    const d = new Date(p.scheduledAt);
    return d.getMonth() === cursor.getMonth() && d.getFullYear() === cursor.getFullYear();
  });
  const monthPosted = monthPosts.filter((p) => p.status === 'posted').length;
  const monthPending = monthPosts.filter((p) => p.status === 'pending').length;
  const monthFailed = monthPosts.filter((p) => p.status === 'failed').length;

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setCursor(subMonths(cursor, 1))}
            className="px-3 py-1.5 text-sm hover:bg-gray-100 rounded-lg"
          >
            ‹ 前月
          </button>
          <div className="text-center">
            <h2 className="text-base font-bold text-gray-800">
              {format(cursor, 'yyyy年 M月', { locale: ja })}
            </h2>
          </div>
          <button
            onClick={() => setCursor(addMonths(cursor, 1))}
            className="px-3 py-1.5 text-sm hover:bg-gray-100 rounded-lg"
          >
            次月 ›
          </button>
        </div>

        <div className="flex justify-center mb-3">
          <button
            onClick={() => { setCursor(new Date()); setSelectedDate(new Date()); }}
            className="text-xs text-purple-600 hover:underline"
          >
            今日に戻る
          </button>
        </div>

        {/* 月間統計 */}
        <div className="grid grid-cols-3 gap-2 mb-3 text-center text-xs">
          <div className="bg-yellow-50 border border-yellow-200 rounded py-1.5">
            <span className="font-bold text-yellow-700">{monthPending}</span>{' '}
            <span className="text-gray-500">予定</span>
          </div>
          <div className="bg-green-50 border border-green-200 rounded py-1.5">
            <span className="font-bold text-green-700">{monthPosted}</span>{' '}
            <span className="text-gray-500">投稿済</span>
          </div>
          <div className="bg-red-50 border border-red-200 rounded py-1.5">
            <span className="font-bold text-red-700">{monthFailed}</span>{' '}
            <span className="text-gray-500">失敗</span>
          </div>
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {DOW.map((d, i) => (
            <div
              key={d}
              className={`text-center text-xs font-semibold py-1 ${
                i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-600'
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* カレンダー本体 */}
        <div className="grid grid-cols-7 gap-0.5">
          {days.map((day) => {
            const dayPosts = getDayPosts(day);
            const inMonth = isSameMonth(day, cursor);
            const isToday = isSameDay(day, new Date());
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const dow = day.getDay();

            const counts = {
              pending: dayPosts.filter((p) => p.status === 'pending').length,
              posted: dayPosts.filter((p) => p.status === 'posted').length,
              failed: dayPosts.filter((p) => p.status === 'failed').length,
            };

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`min-h-[64px] sm:min-h-[72px] p-1 rounded text-left transition-colors border ${
                  isSelected
                    ? 'border-purple-500 bg-purple-50'
                    : isToday
                    ? 'border-purple-300 bg-purple-50/40'
                    : 'border-transparent hover:bg-gray-50'
                } ${!inMonth ? 'opacity-30' : ''}`}
              >
                <div
                  className={`text-xs font-medium mb-0.5 ${
                    isToday
                      ? 'text-purple-700'
                      : dow === 0
                      ? 'text-red-500'
                      : dow === 6
                      ? 'text-blue-500'
                      : 'text-gray-700'
                  }`}
                >
                  {day.getDate()}
                </div>
                {dayPosts.length > 0 && (
                  <div className="flex flex-wrap gap-0.5">
                    {counts.pending > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold bg-yellow-400 text-white rounded">
                        ⏳{counts.pending}
                      </span>
                    )}
                    {counts.posted > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold bg-green-500 text-white rounded">
                        ✓{counts.posted}
                      </span>
                    )}
                    {counts.failed > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold bg-red-500 text-white rounded">
                        ✗{counts.failed}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 選択日の投稿一覧 */}
      {selectedDate && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800">
              📅 {format(selectedDate, 'yyyy年M月d日 (E)', { locale: ja })}
            </h3>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              閉じる
            </button>
          </div>

          {selectedPosts.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">
              この日の投稿はありません
            </p>
          ) : (
            <div className="space-y-2">
              {selectedPosts
                .sort(
                  (a, b) =>
                    new Date(a.scheduledAt).getTime() -
                    new Date(b.scheduledAt).getTime()
                )
                .map((p) => (
                  <div
                    key={p.id}
                    className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-xs font-medium text-purple-700">
                        🕐 {format(new Date(p.scheduledAt), 'HH:mm')}
                      </span>
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap break-words line-clamp-3 mb-1">
                      {p.content}
                    </p>
                    {p.status === 'pending' && (
                      <div className="flex justify-end pt-1 border-t border-gray-100">
                        <button
                          onClick={() => onCancel(p.id)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          キャンセル
                        </button>
                      </div>
                    )}
                    {p.errorMessage && (
                      <p className="text-xs text-red-500 bg-red-50 rounded px-2 py-1 mt-1">
                        {p.errorMessage}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* 凡例 */}
      <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3">
        <p className="font-semibold mb-1">📖 凡例</p>
        <div className="flex flex-wrap gap-3">
          <span><span className="inline-block w-3 h-3 bg-yellow-400 rounded mr-1 align-middle"/>⏳ 予定</span>
          <span><span className="inline-block w-3 h-3 bg-green-500 rounded mr-1 align-middle"/>✓ 投稿済</span>
          <span><span className="inline-block w-3 h-3 bg-red-500 rounded mr-1 align-middle"/>✗ 失敗</span>
        </div>
      </div>
    </div>
  );
}
