'use client';
import { useState } from 'react';

interface Props {
  onScheduled: () => void;
}

export function ScheduleForm({ onScheduled }: Props) {
  const [content, setContent] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const MAX_CHARS = 500;
  const remaining = MAX_CHARS - content.length;

  // Default to now + 10 min for convenience
  const getDefaultDateTime = () => {
    const d = new Date(Date.now() + 10 * 60 * 1000);
    // Format for datetime-local input (YYYY-MM-DDTHH:mm)
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!content.trim()) { setError('投稿内容を入力してください'); return; }
    if (!scheduledAt) { setError('投稿日時を設定してください'); return; }
    if (new Date(scheduledAt) <= new Date()) { setError('投稿日時は未来に設定してください'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/posts/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, scheduledAt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '予期しないエラーが発生しました');
      setContent('');
      setScheduledAt('');
      setSuccess('✅ スケジュールを登録しました！');
      onScheduled();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-700">新しい投稿をスケジュール</h2>

      {/* Content textarea */}
      <div className="space-y-1">
        <textarea
          placeholder="Threads に投稿する内容を入力…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={MAX_CHARS}
          rows={4}
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
        <div className="flex justify-end">
          <span className={`text-xs ${remaining < 50 ? 'text-red-500' : 'text-gray-400'}`}>
            残り {remaining} 文字
          </span>
        </div>
      </div>

      {/* Date time picker */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600">投稿日時</label>
        <div className="flex gap-2 items-center">
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <button
            type="button"
            onClick={() => setScheduledAt(getDefaultDateTime())}
            className="text-xs text-purple-600 hover:underline whitespace-nowrap"
          >
            10分後
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded p-2">{error}</p>}
      {success && <p className="text-xs text-green-600 bg-green-50 border border-green-200 rounded p-2">{success}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-40 transition"
      >
        {loading ? '登録中…' : '📅 スケジュール登録'}
      </button>
    </form>
  );
}
