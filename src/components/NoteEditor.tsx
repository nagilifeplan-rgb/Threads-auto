'use client';
import { useState, useEffect, useCallback } from 'react';
import { NoteArticle } from '@/types';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface Props {
  /** Threads が接続済みかどうか（スケジュールボタンの活性化用） */
  threadsConnected: boolean;
  /** スケジュール登録後に呼ばれる */
  onScheduled?: () => void;
}

type Style = 'casual' | 'professional' | 'hook';
const STYLE_LABELS: { key: Style; label: string }[] = [
  { key: 'casual', label: '😎 カジュアル' },
  { key: 'professional', label: '🧑‍💼 プロ' },
  { key: 'hook', label: '🎣 フック型' },
];

function formatDate(iso: string) {
  try {
    return format(new Date(iso), 'M/d HH:mm', { locale: ja });
  } catch {
    return iso;
  }
}

export function NoteEditor({ threadsConnected, onScheduled }: Props) {
  const [notes, setNotes] = useState<NoteArticle[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [threadsDraft, setThreadsDraft] = useState('');
  const [style, setStyle] = useState<Style>('casual');
  const [aiLoading, setAiLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [scheduleAt, setScheduleAt] = useState('');

  const fetchNotes = useCallback(async () => {
    const res = await fetch('/api/notes');
    const data = await res.json();
    setNotes(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const showMsg = (type: 'ok' | 'err', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const resetForm = () => {
    setSelectedId(null);
    setTitle('');
    setBody('');
    setTags('');
    setThreadsDraft('');
    setScheduleAt('');
  };

  const loadNote = (n: NoteArticle) => {
    setSelectedId(n.id);
    setTitle(n.title);
    setBody(n.body);
    setTags(n.tags.join(', '));
    setThreadsDraft(n.threadsDraft || '');
    setScheduleAt('');
  };

  const handleSave = async () => {
    if (!title.trim() && !body.trim()) {
      showMsg('err', 'タイトルか本文を入力してください');
      return;
    }
    setSaveLoading(true);
    try {
      const payload = {
        title,
        body,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        threadsDraft,
      };
      const url = selectedId ? `/api/notes/${selectedId}` : '/api/notes';
      const method = selectedId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '保存に失敗しました');
      showMsg('ok', selectedId ? '✏️ 更新しました' : '💾 下書きを保存しました');
      setSelectedId(data.id);
      fetchNotes();
    } catch (e: unknown) {
      showMsg('err', e instanceof Error ? e.message : String(e));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!confirm('この下書きを削除しますか？')) return;
    const res = await fetch(`/api/notes/${selectedId}`, { method: 'DELETE' });
    if (res.ok) {
      showMsg('ok', '🗑️ 削除しました');
      resetForm();
      fetchNotes();
    }
  };

  const handleAIConvert = async () => {
    if (!body.trim()) {
      showMsg('err', '本文を入力してからAI変換してください');
      return;
    }
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, style }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI変換に失敗しました');
      setThreadsDraft(data.text);
      showMsg('ok', '🤖 Threads投稿文を生成しました');
    } catch (e: unknown) {
      showMsg('err', e instanceof Error ? e.message : String(e));
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopyForNote = async () => {
    const text = (title ? `# ${title}\n\n` : '') + body;
    await navigator.clipboard.writeText(text);
    showMsg('ok', '📋 noteエディタ用にコピーしました（タイトル+本文）');
  };

  const handleOpenNote = () => {
    window.open('https://note.com/notes/new', '_blank', 'noopener,noreferrer');
  };

  const handleSchedule = async () => {
    if (!threadsDraft.trim()) {
      showMsg('err', 'Threads投稿文を先に生成してください');
      return;
    }
    if (!scheduleAt) {
      showMsg('err', '投稿日時を指定してください');
      return;
    }
    if (new Date(scheduleAt) <= new Date()) {
      showMsg('err', '投稿日時は未来に設定してください');
      return;
    }
    try {
      const res = await fetch('/api/posts/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: threadsDraft,
          scheduledAt: new Date(scheduleAt).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'スケジュール登録に失敗');

      // note 記事側にも紐付け
      if (selectedId) {
        await fetch(`/api/notes/${selectedId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ threadsPostedId: data.id, threadsDraft }),
        });
      }

      showMsg('ok', '📅 Threadsにスケジュール登録しました');
      setScheduleAt('');
      onScheduled?.();
      fetchNotes();
    } catch (e: unknown) {
      showMsg('err', e instanceof Error ? e.message : String(e));
    }
  };

  const remaining = 500 - threadsDraft.length;

  return (
    <div className="space-y-4">
      {/* 下書き一覧 */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">
            📚 note下書き一覧 ({notes.length})
          </h3>
          <button
            onClick={resetForm}
            className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700"
          >
            ＋ 新規
          </button>
        </div>
        {notes.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">
            まだ下書きはありません
          </p>
        ) : (
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {notes.map((n) => (
              <button
                key={n.id}
                onClick={() => loadNote(n)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                  selectedId === n.id
                    ? 'bg-purple-50 border border-purple-200'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-800 truncate flex-1">
                    {n.title || '(無題)'}
                  </span>
                  <span className="text-gray-400 text-[10px] shrink-0">
                    {formatDate(n.updatedAt)}
                  </span>
                </div>
                {n.threadsDraft && (
                  <span className="inline-block mt-1 text-[10px] bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded">
                    🧵 Threads草稿あり
                  </span>
                )}
                {n.threadsPostedId && (
                  <span className="inline-block mt-1 ml-1 text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded">
                    📅 予約済み
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* エディタ */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            {selectedId ? '📝 下書きを編集' : '📝 新しい記事を書く'}
          </h2>
          {selectedId && (
            <button
              onClick={handleDelete}
              className="text-xs text-red-500 hover:text-red-700"
            >
              削除
            </button>
          )}
        </div>

        <input
          type="text"
          placeholder="記事タイトル"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full text-base font-semibold border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
        />

        <textarea
          placeholder="記事本文を書く…（マークダウンOK）"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={10}
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-purple-400 font-mono"
        />

        <input
          type="text"
          placeholder="タグ（カンマ区切り） 例: ライフハック, AI, 仕事術"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
        />

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSave}
            disabled={saveLoading}
            className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50"
          >
            {saveLoading ? '保存中…' : '💾 下書き保存'}
          </button>
          <button
            onClick={handleCopyForNote}
            disabled={!title && !body}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40"
          >
            📋 noteにコピー
          </button>
          <button
            onClick={handleOpenNote}
            className="px-4 py-2 text-sm bg-white border border-green-600 text-green-700 rounded-lg hover:bg-green-50"
          >
            ↗ noteを開く
          </button>
        </div>

        {msg && (
          <p
            className={`text-xs rounded p-2 border ${
              msg.type === 'ok'
                ? 'text-green-700 bg-green-50 border-green-200'
                : 'text-red-700 bg-red-50 border-red-200'
            }`}
          >
            {msg.text}
          </p>
        )}
      </div>

      {/* AI変換 → Threads スケジュール */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-purple-900 flex items-center gap-2">
          🤖 AIで Threads投稿文に変換
        </h2>

        <div className="flex flex-wrap gap-2">
          {STYLE_LABELS.map((s) => (
            <button
              key={s.key}
              onClick={() => setStyle(s.key)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                style === s.key
                  ? 'bg-purple-600 text-white'
                  : 'bg-white border border-purple-300 text-purple-700 hover:bg-purple-50'
              }`}
            >
              {s.label}
            </button>
          ))}
          <button
            onClick={handleAIConvert}
            disabled={aiLoading || !body.trim()}
            className="ml-auto px-4 py-1.5 text-xs bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-full font-medium hover:opacity-90 disabled:opacity-40"
          >
            {aiLoading ? '生成中…' : '✨ AIで生成'}
          </button>
        </div>

        <div className="space-y-1">
          <textarea
            placeholder="ここに Threads 用の投稿文が表示されます（編集可能）"
            value={threadsDraft}
            onChange={(e) => setThreadsDraft(e.target.value)}
            rows={6}
            maxLength={500}
            className="w-full text-sm border border-purple-300 rounded-lg px-3 py-2 bg-white resize-y focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <div className="flex justify-end">
            <span
              className={`text-xs ${remaining < 50 ? 'text-red-500' : 'text-gray-500'}`}
            >
              残り {remaining} 文字
            </span>
          </div>
        </div>

        {/* スケジュール登録 */}
        <div className="bg-white border border-purple-200 rounded-lg p-3 space-y-2">
          <p className="text-xs font-medium text-gray-700">📅 Threadsに予約投稿</p>
          {!threadsConnected && (
            <p className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded px-2 py-1">
              ⚠️ Threadsに接続するとスケジュール登録できます
            </p>
          )}
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
              className="flex-1 min-w-[180px] text-sm border border-gray-300 rounded-lg px-3 py-2"
            />
            <button
              onClick={handleSchedule}
              disabled={!threadsConnected || !threadsDraft.trim() || !scheduleAt}
              className="px-4 py-2 text-sm bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-40"
            >
              スケジュール登録
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
