'use client';
import { ScheduledPost } from '@/types';
import { StatusBadge } from './StatusBadge';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface Props {
  posts: ScheduledPost[];
  onCancel: (id: string) => Promise<void>;
  loading: boolean;
  filter?: 'all' | 'pending' | 'posted' | 'failed' | 'cancelled';
}

const SOURCE_LABEL: Record<string, { icon: string; label: string; cls: string }> = {
  manual: { icon: '✏️', label: '手動', cls: 'bg-blue-50 text-blue-600 border-blue-200' },
  csv:    { icon: '📊', label: 'CSV', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  sheets: { icon: '📋', label: 'Sheets', cls: 'bg-green-50 text-green-600 border-green-200' },
};

export function PostList({ posts, onCancel, loading, filter = 'all' }: Props) {
  if (loading) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        <div className="animate-spin inline-block w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full mr-2" />
        読み込み中…
      </div>
    );
  }

  const filtered = filter === 'all' ? posts : posts.filter((p) => p.status === filter);

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        <p className="text-3xl mb-2">📭</p>
        {filter === 'all' ? 'スケジュール済みの投稿はありません' : `${filter} の投稿はありません`}
      </div>
    );
  }

  const formatDate = (iso: string) => {
    try {
      return format(new Date(iso), 'yyyy年M月d日 HH:mm', { locale: ja });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-3">
      {filtered.map((post) => {
        const srcInfo = SOURCE_LABEL[post.source ?? 'manual'];
        return (
          <div
            key={post.id}
            className={`bg-white border rounded-xl p-4 space-y-2 transition-opacity ${
              post.status === 'cancelled' ? 'opacity-50' : ''
            }`}
          >
            {/* Content + status */}
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-gray-800 whitespace-pre-wrap break-words flex-1">
                {post.content}
              </p>
              <StatusBadge status={post.status} />
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 pt-1 border-t border-gray-100">
              <span>📅 {formatDate(post.scheduledAt)}</span>

              {/* Source badge */}
              <span className={`border rounded-full px-2 py-0.5 font-medium ${srcInfo.cls}`}>
                {srcInfo.icon} {srcInfo.label}
              </span>

              {post.threadId && (
                <span className="text-green-500 font-mono ml-auto">ID: {post.threadId}</span>
              )}
              {post.status === 'pending' && (
                <button
                  onClick={() => onCancel(post.id)}
                  className="text-red-400 hover:text-red-600 font-medium ml-auto"
                >
                  キャンセル
                </button>
              )}
            </div>

            {/* Error message */}
            {post.errorMessage && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded px-2 py-1">
                エラー: {post.errorMessage}
              </p>
            )}

            {/* Source file */}
            {post.sourceFile && (
              <p className="text-xs text-gray-300 truncate">
                元ファイル: {post.sourceFile}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
