'use client';
import { useEffect, useState, useCallback } from 'react';
import { ConnectPanel } from '@/components/ConnectPanel';
import { ScheduleForm } from '@/components/ScheduleForm';
import { PostList } from '@/components/PostList';
import { ScheduledPost } from '@/types';

interface AuthState {
  connected: boolean;
  username?: string;
}

export default function Home() {
  const [auth, setAuth] = useState<AuthState>({ connected: false });
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'schedule' | 'history'>('schedule');

  // Kick scheduler on load
  useEffect(() => {
    fetch('/api/scheduler').catch(() => {});
  }, []);

  // Fetch auth status
  const fetchAuth = useCallback(async () => {
    const res = await fetch('/api/auth/threads');
    const data = await res.json();
    setAuth(data);
  }, []);

  // Fetch posts
  const fetchPosts = useCallback(async () => {
    setListLoading(true);
    const res = await fetch('/api/posts/history');
    const data = await res.json();
    setPosts(Array.isArray(data) ? data : []);
    setListLoading(false);
  }, []);

  useEffect(() => {
    fetchAuth();
    fetchPosts();
  }, [fetchAuth, fetchPosts]);

  // Auto-refresh every 30 seconds
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

  const pendingCount = posts.filter((p) => p.status === 'pending').length;
  const postedCount = posts.filter((p) => p.status === 'posted').length;
  const failedCount = posts.filter((p) => p.status === 'failed').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧵</span>
            <div>
              <h1 className="text-base font-bold text-gray-900">Threads スケジューラー</h1>
              <p className="text-xs text-gray-500">任意の時間に自動ポスト</p>
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
        {/* Connection panel */}
        <ConnectPanel
          connected={auth.connected}
          username={auth.username}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
        />

        {/* Stats */}
        {auth.connected && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: '予定', value: pendingCount, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
              { label: '投稿済み', value: postedCount, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
              { label: '失敗', value: failedCount, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl border ${s.bg} px-4 py-3 text-center`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {auth.connected ? (
          <>
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              {(['schedule', 'history'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'border-b-2 border-purple-600 text-purple-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'schedule' ? '📅 新規スケジュール' : '📋 投稿履歴'}
                </button>
              ))}
            </div>

            {activeTab === 'schedule' ? (
              <ScheduleForm onScheduled={fetchPosts} />
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-700">
                    投稿一覧 ({posts.length})
                  </h2>
                  <button
                    onClick={fetchPosts}
                    className="text-xs text-purple-600 hover:underline"
                  >
                    更新
                  </button>
                </div>
                <PostList posts={posts} onCancel={handleCancel} loading={listLoading} />
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 text-gray-400 space-y-2">
            <p className="text-5xl">🔐</p>
            <p className="text-sm">Threads に接続すると投稿をスケジュールできます</p>
          </div>
        )}
      </main>

      <footer className="text-center py-8 text-xs text-gray-400">
        Threads Scheduler — スケジュールは30秒ごとにチェックされます
      </footer>
    </div>
  );
}
