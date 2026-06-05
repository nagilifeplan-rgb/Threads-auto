'use client';
import { useEffect, useState, useCallback } from 'react';
import { ScheduledPost, NoteArticle } from '@/types';
import { StatusBadge } from './StatusBadge';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface Props {
  threadsConnected: boolean;
  threadsUsername?: string;
  posts: ScheduledPost[];
  onGoNotes: () => void;
  onGoSchedule: () => void;
  onGoHistory: () => void;
  onGoCalendar?: () => void;
  onGoAnalytics?: () => void;
}

function fmt(iso: string) {
  try {
    return format(new Date(iso), 'M/d HH:mm', { locale: ja });
  } catch {
    return iso;
  }
}

export function Dashboard({
  threadsConnected,
  threadsUsername,
  posts,
  onGoNotes,
  onGoSchedule,
  onGoHistory,
  onGoCalendar,
  onGoAnalytics,
}: Props) {
  const [notes, setNotes] = useState<NoteArticle[]>([]);

  const fetchNotes = useCallback(async () => {
    const res = await fetch('/api/notes');
    const data = await res.json();
    setNotes(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    fetchNotes();
    const id = setInterval(fetchNotes, 30_000);
    return () => clearInterval(id);
  }, [fetchNotes]);

  const pending = posts.filter((p) => p.status === 'pending');
  const posted = posts.filter((p) => p.status === 'posted');
  const failed = posts.filter((p) => p.status === 'failed');

  // 次回投稿
  const nextPost = [...pending].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  )[0];

  // 最近の投稿
  const recentPosts = [...posts].slice(0, 5);

  // note統計
  const notesWithDraft = notes.filter((n) => n.threadsDraft);
  const notesScheduled = notes.filter((n) => n.threadsPostedId);

  return (
    <div className="space-y-5">
      {/* プラットフォーム接続状況 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          className={`rounded-xl border p-4 ${
            threadsConnected
              ? 'bg-green-50 border-green-200'
              : 'bg-gray-50 border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🧵</span>
              <div>
                <p className="text-sm font-semibold text-gray-800">Threads</p>
                <p className="text-xs text-gray-500">
                  {threadsConnected ? `@${threadsUsername || 'unknown'}` : '未接続'}
                </p>
              </div>
            </div>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                threadsConnected
                  ? 'bg-green-200 text-green-800'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {threadsConnected ? '✓ 接続中' : '未接続'}
            </span>
          </div>
        </div>

        <div className="rounded-xl border p-4 bg-green-50/40 border-green-200/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📝</span>
              <div>
                <p className="text-sm font-semibold text-gray-800">note</p>
                <p className="text-xs text-gray-500">下書き管理モード</p>
              </div>
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-200 text-green-800">
              ローカル
            </span>
          </div>
        </div>
      </div>

      {/* 統計 */}
      <div>
        <h3 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
          📊 統計
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: '予定中',
              value: pending.length,
              icon: '⏳',
              color: 'text-yellow-700 bg-yellow-50 border-yellow-200',
            },
            {
              label: '投稿済み',
              value: posted.length,
              icon: '✅',
              color: 'text-green-700 bg-green-50 border-green-200',
            },
            {
              label: '失敗',
              value: failed.length,
              icon: '❌',
              color: 'text-red-700 bg-red-50 border-red-200',
            },
            {
              label: 'note下書き',
              value: notes.length,
              icon: '📝',
              color: 'text-blue-700 bg-blue-50 border-blue-200',
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`rounded-xl border ${s.color} px-3 py-3 text-center`}
            >
              <p className="text-2xl font-bold">
                {s.icon} {s.value}
              </p>
              <p className="text-[11px] text-gray-600 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 次回の投稿 */}
      <div>
        <h3 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
          🚀 次回の自動投稿
        </h3>
        {nextPost ? (
          <div className="bg-white border border-purple-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-1 rounded">
                📅 {fmt(nextPost.scheduledAt)}
              </span>
              <StatusBadge status={nextPost.status} />
            </div>
            <p className="text-sm text-gray-800 whitespace-pre-wrap break-words line-clamp-3">
              {nextPost.content}
            </p>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-sm text-gray-400">
            予定されている投稿はありません
          </div>
        )}
      </div>

      {/* note 進捗 */}
      <div>
        <h3 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
          📝 note 進捗
        </h3>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div>
              <p className="text-xl font-bold text-gray-800">{notes.length}</p>
              <p className="text-gray-500 mt-0.5">下書き</p>
            </div>
            <div>
              <p className="text-xl font-bold text-purple-700">
                {notesWithDraft.length}
              </p>
              <p className="text-gray-500 mt-0.5">Threads草稿あり</p>
            </div>
            <div>
              <p className="text-xl font-bold text-green-700">
                {notesScheduled.length}
              </p>
              <p className="text-gray-500 mt-0.5">予約済み</p>
            </div>
          </div>
        </div>
      </div>

      {/* 最近の投稿 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            📋 最近の投稿
          </h3>
          <button
            onClick={onGoHistory}
            className="text-xs text-purple-600 hover:underline"
          >
            すべて見る →
          </button>
        </div>
        {recentPosts.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-sm text-gray-400">
            投稿履歴はまだありません
          </div>
        ) : (
          <div className="space-y-2">
            {recentPosts.map((p) => (
              <div
                key={p.id}
                className="bg-white border border-gray-200 rounded-lg p-3 flex items-start justify-between gap-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-800 line-clamp-2 whitespace-pre-wrap break-words">
                    {p.content}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {fmt(p.scheduledAt)}
                  </p>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* クイックアクション */}
      <div>
        <h3 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
          ⚡ クイックアクション
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onGoNotes}
            className="bg-gradient-to-br from-green-500 to-emerald-500 text-white rounded-xl p-4 text-left hover:opacity-90 transition"
          >
            <p className="text-2xl mb-1">📝</p>
            <p className="text-sm font-semibold">note記事を書く</p>
            <p className="text-xs opacity-80 mt-1">AIでThreads用に変換</p>
          </button>
          <button
            onClick={onGoSchedule}
            className="bg-gradient-to-br from-purple-600 to-pink-500 text-white rounded-xl p-4 text-left hover:opacity-90 transition"
          >
            <p className="text-2xl mb-1">🧵</p>
            <p className="text-sm font-semibold">Threads投稿を予約</p>
            <p className="text-xs opacity-80 mt-1">スケジュール登録</p>
          </button>
          {onGoCalendar && (
            <button
              onClick={onGoCalendar}
              className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-xl p-4 text-left hover:opacity-90 transition"
            >
              <p className="text-2xl mb-1">📅</p>
              <p className="text-sm font-semibold">カレンダー表示</p>
              <p className="text-xs opacity-80 mt-1">投稿予定を可視化</p>
            </button>
          )}
          {onGoAnalytics && threadsConnected && (
            <button
              onClick={onGoAnalytics}
              className="bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-xl p-4 text-left hover:opacity-90 transition"
            >
              <p className="text-2xl mb-1">📈</p>
              <p className="text-sm font-semibold">パフォーマンス分析</p>
              <p className="text-xs opacity-80 mt-1">いいね/閲覧/返信</p>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
