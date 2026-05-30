'use client';
import { useEffect, useState, useCallback } from 'react';
import { ConnectPanel } from '@/components/ConnectPanel';
import { ScheduleForm } from '@/components/ScheduleForm';
import { PostList } from '@/components/PostList';
import { SpreadsheetImport } from '@/components/SpreadsheetImport';
import { ScheduledPost } from '@/types';

interface AuthState {
  connected: boolean;
  username?: string;
}

type Tab = 'schedule' | 'spreadsheet' | 'history';

const TABS: { key: Tab; label: string }[] = [
  { key: 'schedule',    label: '✏️ 手動入力' },
  { key: 'spreadsheet', label: '📊 スプレッドシート' },
  { key: 'history',     label: '📋 投稿履歴' },
];

type HistoryFilter = 'all' | 'pending' | 'posted' | 'failed' | 'cancelled';
const FILTERS: { key: HistoryFilter; label: string }[] = [
  { key: 'all',       label: 'すべて' },
  { key: 'pending',   label: '⏳ 予定' },
  { key: 'posted',    label: '✅ 済み' },
  { key: 'failed',    label: '❌ 失敗' },
  { key: 'cancelled', label: '🚫 取消' },
];

export default function Home() {
  const [auth, setAuth] = useState<AuthState>({ connected: false });
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('schedule');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');

  // Start scheduler
  useEffect(() => { fetch('/api/scheduler').catch(() => {}); }, []);

  const fetchAuth = useCallback(async () => {
    const res = await fetch('/api/auth/threads');
    setAuth(await res.json());
  }, []);

  const fetchPosts = useCallback(async () => {
    setListLoading(true);
    const res = await fetch('/api/posts/history');
    const data = await res.json();
    setPosts(Array.isArray(data) ? data : []);
    setListLoading(false);
  }, []);

  useEffect(() => { fetchAuth(); fetchPosts(); }, [fetchAuth, fetchPosts]);

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(fetchPosts, 30_000);
    return () => clearInterval(id);
  }, [fetchPosts]);

  const handleConnect = async (token: string) => {
    const res = await fetch('/api/auth/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: token }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '接続に失敗しました');
    setAuth(data);
  };

  const handleDisconnect = async () => {
    await fetch('/api/auth/threads', { method: 'DELETE' });
    setAuth({ connected: false });
  };

  const handleCancel = async (id: string) => {
    await fetch(`/api/posts/delete?id=${id}`, { method: 'DELETE' });
    fetchPosts();
  };

  const pendingCount  = posts.filter((p) => p.status === 'pending').length;
  const postedCount   = posts.filter((p) => p.status === 'posted').length;
  const failedCount   = posts.filter((p) => p.status === 'failed').length;
  const csvCount      = posts.filter((p) => p.source === 'csv' || p.source === 'sheets').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧵</span>
            <div>
              <h1 className="text-base font-bold text-gray-900">Threads スケジューラー</h1>
              <p className="text-xs text-gray-500">スプレッドシートから一括自動投稿</p>
            </div>
          </div>
          {auth.connected && (
            <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 border border-green-200 rounded-full px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
              稼働中
            </div>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* ── Connection ── */}
        <ConnectPanel
          connected={auth.connected}
          username={auth.username}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
        />

        {/* ── Stats ── */}
        {auth.connected && (
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: '予定', value: pendingCount, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
              { label: '投稿済み', value: postedCount, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
              { label: '失敗', value: failedCount, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
              { label: 'CSV/Sheets', value: csvCount, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl border ${s.bg} px-3 py-2.5 text-center`}>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {auth.connected ? (
          <>
            {/* ── Tabs ── */}
            <div className="flex border-b border-gray-200">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 px-3 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'border-b-2 border-purple-600 text-purple-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Tab content ── */}
            {activeTab === 'schedule' && (
              <ScheduleForm onScheduled={() => { fetchPosts(); setActiveTab('history'); }} />
            )}

            {activeTab === 'spreadsheet' && (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="mb-4">
                  <h2 className="text-sm font-bold text-gray-800">スプレッドシートから一括インポート</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    CSV ファイルまたは Google スプレッドシートから複数の投稿を一括スケジュール登録できます
                  </p>
                </div>
                <SpreadsheetImport onImported={() => { fetchPosts(); }} />
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-3">
                {/* Filter bar */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 flex-wrap">
                    {FILTERS.map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setHistoryFilter(f.key)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          historyFilter === f.key
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white text-gray-500 border-gray-300 hover:border-purple-400'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <button onClick={fetchPosts} className="text-xs text-purple-600 hover:underline ml-2">
                    更新
                  </button>
                </div>

                <p className="text-xs text-gray-400">
                  {historyFilter === 'all' ? `全 ${posts.length} 件` : `${posts.filter(p => p.status === historyFilter).length} 件`}
                </p>

                <PostList
                  posts={posts}
                  onCancel={handleCancel}
                  loading={listLoading}
                  filter={historyFilter}
                />
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 text-gray-400 space-y-3">
            <p className="text-5xl">🔐</p>
            <p className="text-sm font-medium text-gray-600">Threads に接続してください</p>
            <div className="inline-flex flex-col gap-1.5 text-left bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-500 max-w-xs">
              <p className="font-semibold text-gray-700 text-sm mb-1">できること</p>
              <p>📊 CSV/スプレッドシートから一括インポート</p>
              <p>📅 任意の日時にスケジュール登録</p>
              <p>⚡ サーバーが自動で投稿を実行</p>
              <p>📋 投稿履歴・ステータス管理</p>
            </div>
          </div>
        )}
      </main>

      <footer className="text-center py-8 text-xs text-gray-400">
        Threads Scheduler — 30秒ごとに自動チェック
      </footer>
    </div>
  );
}
