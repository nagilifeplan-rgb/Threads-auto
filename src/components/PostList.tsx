'use client';
import { ScheduledPost } from '@/types';
import { StatusBadge } from './StatusBadge';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface Props {
  posts: ScheduledPost[];
  onCancel: (id: string) => Promise<void>;
  loading: boolean;
}

export function PostList({ posts, onCancel, loading }: Props) {
  if (loading) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        <div className="animate-spin inline-block w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full mr-2" />
        読み込み中…
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        <p className="text-3xl mb-2">📭</p>
        スケジュール済みの投稿はありません
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
      {posts.map((post) => (
        <div
          key={post.id}
          className={`bg-white border rounded-xl p-4 space-y-2 transition-opacity ${
            post.status === 'cancelled' ? 'opacity-50' : ''
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-gray-800 whitespace-pre-wrap break-words flex-1">
              {post.content}
            </p>
            <StatusBadge status={post.status} />
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-gray-100">
            <span>📅 {formatDate(post.scheduledAt)}</span>
            {post.threadId && (
              <span className="text-green-500 font-mono">ID: {post.threadId}</span>
            )}
            {post.status === 'pending' && (
              <button
                onClick={() => onCancel(post.id)}
                className="text-red-400 hover:text-red-600 font-medium ml-2"
              >
                キャンセル
              </button>
            )}
          </div>

          {post.errorMessage && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded px-2 py-1">
              エラー: {post.errorMessage}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
