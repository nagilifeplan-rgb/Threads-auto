'use client';
import { useEffect, useState, useCallback } from 'react';
import { ConnectPanel } from '@/components/ConnectPanel';
import { ScheduleForm } from '@/components/ScheduleForm';
import { PostList } from '@/components/PostList';
import { SpreadsheetImport } from '@/components/SpreadsheetImport';
import { NoteEditor } from '@/components/NoteEditor';
import { Dashboard } from '@/components/Dashboard';
import { ScheduledPost } from '@/types';

interface AuthState {
  connected: boolean;
  username?: string;
}

type Tab = 'dashboard' | 'notes' | 'schedule' | 'spreadsheet' | 'history';

const TABS: { key: Tab; label: string; requireAuth?: boolean }[] = [
  { key: 'dashboard',   label: '🏠 ダッシュボード' },
  { key: 'notes',       label: '📝 note記事' },
  { key: 'schedule',    label: '✏️ Threads', requireAuth: true },
  { key: 'spreadsheet', label: '📊 一括', requireAuth: true },
  { key: 'history',     label: '📋 履歴', requireAuth: true },
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
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
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

  const visibleTabs = TABS.filter((t) => !t.requireAuth || auth.connected);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🪄</span>
            <div>
              <h1 className="text-base font-bold text-gray-900">note × Threads マネージャー</h1>
              <p className="text-xs text-gray-500">記事執筆 → AI変換 → 自動投稿</p>
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

        {/* ── Tabs ── */}
        <div className="flex border-b border-gray-200 overflow-x-auto -mx-1 px-1 scrollbar-thin">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
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
        {activeTab === 'dashboard' && (
          <Dashboard
            threadsConnected={auth.connected}
            threadsUsername={auth.username}
            posts={posts}
            onGoNotes={() => setActiveTab('notes')}
            onGoSchedule={() => setActiveTab('schedule')}
            onGoHistory={() => setActiveTab('history')}
          />
        )}

        {activeTab === 'notes' && (
          <NoteEditor
            threadsConnected={auth.connected}
            onScheduled={() => { fetchPosts(); }}
          />
        )}

        {activeTab === 'schedule' && auth.connected && (
          <ScheduleForm onScheduled={() => { fetchPosts(); setActiveTab('history'); }} />
        )}

        {activeTab === 'spreadsheet' && auth.connected && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="mb-4">
              <h2 className="text-sm font-bold text-gray-800">スプレッドシートから一括インポート</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                CSV または Google スプレッドシートから複数投稿を一括スケジュール
              </p>
            </div>
            <SpreadsheetImport onImported={() => { fetchPosts(); }} />
          </div>
        )}

        {activeTab === 'history' && auth.connected && (
          <div className="space-y-3">
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
              {historyFilter === 'all'
                ? `全 ${posts.length} 件`
                : `${posts.filter((p) => p.status === historyFilter).length} 件`}
            </p>

            <PostList
              posts={posts}
              onCancel={handleCancel}
              loading={listLoading}
              filter={historyFilter}
            />
          </div>
        )}
      </main>

      <footer className="text-center py-8 text-xs text-gray-400">
        note × Threads マネージャー — スケジューラーは30秒ごとに実行
      </footer>
    </div>
  );
}
