'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { ScheduledPost, PostInsights } from '@/types';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface Props {
  posts: ScheduledPost[];
  threadsConnected: boolean;
}

type SortKey = 'views' | 'likes' | 'replies' | 'reposts' | 'shares' | 'date';

function fmt(iso: string) {
  try {
    return format(new Date(iso), 'M/d HH:mm', { locale: ja });
  } catch {
    return iso;
  }
}

function formatNum(n: number | undefined): string {
  if (n === undefined || n === null) return '-';
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

export function Analytics({ posts, threadsConnected }: Props) {
  const [insights, setInsights] = useState<PostInsights[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('views');

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/insights');
      const data = await res.json();
      setInsights(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const showMsg = (type: 'ok' | 'err', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleRefresh = async () => {
    if (!threadsConnected) {
      showMsg('err', 'Threadsに接続してください');
      return;
    }
    setRefreshing(true);
    try {
      const res = await fetch('/api/insights', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '取得に失敗しました');
      showMsg(
        'ok',
        `📊 ${data.success}/${data.total} 件のインサイトを更新しました${
          data.failed > 0 ? ` (失敗 ${data.failed})` : ''
        }`
      );
      fetchInsights();
    } catch (e: unknown) {
      showMsg('err', e instanceof Error ? e.message : String(e));
    } finally {
      setRefreshing(false);
    }
  };

  // posts + insightsをマージ
  const postedItems = useMemo(() => {
    const insightMap = new Map(insights.map((i) => [i.postId, i]));
    return posts
      .filter((p) => p.status === 'posted')
      .map((p) => ({ post: p, insight: insightMap.get(p.id) }));
  }, [posts, insights]);

  // 集計
  const totals = useMemo(() => {
    return postedItems.reduce(
      (acc, { insight }) => {
        if (!insight) return acc;
        acc.views += insight.views ?? 0;
        acc.likes += insight.likes ?? 0;
        acc.replies += insight.replies ?? 0;
        acc.reposts += insight.reposts ?? 0;
        acc.shares += insight.shares ?? 0;
        acc.count++;
        return acc;
      },
      { views: 0, likes: 0, replies: 0, reposts: 0, shares: 0, count: 0 }
    );
  }, [postedItems]);

  // ソート
  const sortedItems = useMemo(() => {
    const arr = [...postedItems];
    if (sortKey === 'date') {
      arr.sort(
        (a, b) =>
          new Date(b.post.scheduledAt).getTime() -
          new Date(a.post.scheduledAt).getTime()
      );
    } else {
      arr.sort(
        (a, b) =>
          (b.insight?.[sortKey] ?? 0) - (a.insight?.[sortKey] ?? 0)
      );
    }
    return arr;
  }, [postedItems, sortKey]);

  // トップ投稿（views順、最大3件）
  const topPosts = useMemo(() => {
    return [...postedItems]
      .filter((x) => x.insight && (x.insight.views ?? 0) > 0)
      .sort((a, b) => (b.insight?.views ?? 0) - (a.insight?.views ?? 0))
      .slice(0, 3);
  }, [postedItems]);

  const engagementRate =
    totals.views > 0
      ? (((totals.likes + totals.replies + totals.reposts + totals.shares) /
          totals.views) *
          100)
      : 0;

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-sm font-bold text-gray-800">📊 パフォーマンス分析</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              投稿済みの Threads インサイト（閲覧、いいね、返信など）
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing || !threadsConnected}
            className="px-3 py-1.5 text-xs bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-full font-medium hover:opacity-90 disabled:opacity-40"
          >
            {refreshing ? '取得中…' : '🔄 最新を取得'}
          </button>
        </div>
        {!threadsConnected && (
          <p className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded px-2 py-1">
            ⚠️ Threadsに接続するとインサイトを取得できます
          </p>
        )}
        {msg && (
          <p
            className={`text-xs rounded p-2 mt-2 border ${
              msg.type === 'ok'
                ? 'text-green-700 bg-green-50 border-green-200'
                : 'text-red-700 bg-red-50 border-red-200'
            }`}
          >
            {msg.text}
          </p>
        )}
      </div>

      {/* 全体サマリー */}
      <div className="bg-gradient-to-br from-purple-600 to-pink-500 text-white rounded-xl p-5">
        <p className="text-xs opacity-80 mb-3">集計（インサイト取得済み {totals.count} 投稿）</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <p className="text-xs opacity-80">👀 総閲覧数</p>
            <p className="text-2xl font-bold">{formatNum(totals.views)}</p>
          </div>
          <div>
            <p className="text-xs opacity-80">❤️ いいね</p>
            <p className="text-2xl font-bold">{formatNum(totals.likes)}</p>
          </div>
          <div>
            <p className="text-xs opacity-80">💬 返信</p>
            <p className="text-2xl font-bold">{formatNum(totals.replies)}</p>
          </div>
          <div>
            <p className="text-xs opacity-80">🔁 リポスト</p>
            <p className="text-2xl font-bold">{formatNum(totals.reposts)}</p>
          </div>
          <div>
            <p className="text-xs opacity-80">📤 シェア</p>
            <p className="text-2xl font-bold">{formatNum(totals.shares)}</p>
          </div>
          <div>
            <p className="text-xs opacity-80">📈 エンゲージ率</p>
            <p className="text-2xl font-bold">{engagementRate.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* トップ投稿 */}
      {topPosts.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-bold text-gray-800 mb-3">
            🏆 トップ投稿（閲覧数順）
          </h3>
          <div className="space-y-2">
            {topPosts.map(({ post, insight }, i) => (
              <div
                key={post.id}
                className="flex gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                  i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : 'bg-orange-400'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 line-clamp-2 break-words">
                    {post.content}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1 text-[11px] text-gray-600">
                    <span>👀 {formatNum(insight?.views)}</span>
                    <span>❤️ {formatNum(insight?.likes)}</span>
                    <span>💬 {formatNum(insight?.replies)}</span>
                    <span>🔁 {formatNum(insight?.reposts)}</span>
                    <span className="text-gray-400">{fmt(post.scheduledAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 詳細リスト */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-800">
            📋 投稿別データ ({postedItems.length})
          </h3>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
          >
            <option value="views">閲覧数順</option>
            <option value="likes">いいね順</option>
            <option value="replies">返信順</option>
            <option value="reposts">リポスト順</option>
            <option value="shares">シェア順</option>
            <option value="date">日付順</option>
          </select>
        </div>

        {loading ? (
          <p className="text-xs text-gray-400 text-center py-6">読み込み中…</p>
        ) : postedItems.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            <p className="text-3xl mb-2">📊</p>
            投稿済みの記事がまだありません
          </div>
        ) : (
          <div className="space-y-2">
            {sortedItems.map(({ post, insight }) => (
              <div
                key={post.id}
                className="border border-gray-200 rounded-lg p-3"
              >
                <p className="text-sm text-gray-800 line-clamp-2 break-words mb-2">
                  {post.content}
                </p>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span className="bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                      👀 {formatNum(insight?.views)}
                    </span>
                    <span className="bg-pink-50 border border-pink-200 px-1.5 py-0.5 rounded">
                      ❤️ {formatNum(insight?.likes)}
                    </span>
                    <span className="bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                      💬 {formatNum(insight?.replies)}
                    </span>
                    <span className="bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">
                      🔁 {formatNum(insight?.reposts)}
                    </span>
                    <span className="bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded">
                      📤 {formatNum(insight?.shares)}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {fmt(post.scheduledAt)}
                  </span>
                </div>
                {!insight && (
                  <p className="text-[10px] text-gray-400 italic mt-1">
                    まだインサイト未取得（「最新を取得」をクリック）
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 補足説明 */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-600 space-y-1">
        <p className="font-semibold text-gray-800">💡 インサイトについて</p>
        <p>• データは Threads Graph API から取得します</p>
        <p>• 投稿直後はデータが反映されるまで数分かかる場合があります</p>
        <p>• 「最新を取得」を押すと投稿済みの全データを再取得します</p>
      </div>
    </div>
  );
}
