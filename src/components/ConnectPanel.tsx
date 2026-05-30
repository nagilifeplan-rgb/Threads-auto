'use client';
import { useState } from 'react';

interface Props {
  connected: boolean;
  username?: string;
  onConnect: (token: string) => Promise<void>;
  onDisconnect: () => Promise<void>;
}

export function ConnectPanel({ connected, username, onConnect, onDisconnect }: Props) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    if (!token.trim()) return;
    setLoading(true);
    setError('');
    try {
      await onConnect(token.trim());
      setToken('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await onDisconnect();
    } finally {
      setLoading(false);
    }
  };

  if (connected) {
    return (
      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
            {username?.[0]?.toUpperCase() ?? 'T'}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">@{username ?? 'unknown'}</p>
            <p className="text-xs text-green-600">Threads に接続中</p>
          </div>
        </div>
        <button
          onClick={handleDisconnect}
          disabled={loading}
          className="text-sm text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
        >
          切断
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
      <h2 className="text-sm font-semibold text-gray-700">Threads アクセストークンを設定</h2>
      <p className="text-xs text-gray-500">
        <a
          href="https://developers.facebook.com/docs/threads/get-started"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          Threads API
        </a>{' '}
        から Long-lived Access Token を取得し、以下に入力してください。
      </p>
      <div className="flex gap-2">
        <input
          type="password"
          placeholder="Access Token を貼り付け..."
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
          className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
        <button
          onClick={handleConnect}
          disabled={loading || !token.trim()}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-40 transition"
        >
          {loading ? '確認中…' : '接続'}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
