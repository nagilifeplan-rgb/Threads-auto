'use client';
import { useState, useEffect } from 'react';

interface Props {
  connected: boolean;
  username?: string;
  onConnect: (token: string) => Promise<void>;
  onDisconnect: () => Promise<void>;
}

interface OAuthConfig {
  oauthEnabled: boolean;
  hasAppId: boolean;
  hasAppSecret: boolean;
  redirectUri: string;
  detectedRedirectUri: string;
}

export function ConnectPanel({ connected, username, onConnect, onDisconnect }: Props) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [config, setConfig] = useState<OAuthConfig | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // OAuth設定状況を取得
  useEffect(() => {
    if (connected) return;
    fetch('/api/auth/threads/config')
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => {});
  }, [connected]);

  // URLのsuccess/errorクエリパラメータを処理
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    if (err) {
      setError(err);
      // URLをクリーンに
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

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

  const handleOAuthLogin = () => {
    window.location.href = '/api/auth/threads/start';
  };

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
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
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <div>
        <h2 className="text-sm font-bold text-gray-800">🔐 Threadsに接続する</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          投稿の自動化を始めるには Threads との連携が必要です
        </p>
      </div>

      {/* OAuth ボタン（環境変数が設定されている場合） */}
      {config?.oauthEnabled ? (
        <div className="space-y-2">
          <button
            onClick={handleOAuthLogin}
            className="w-full py-3 bg-black text-white text-sm font-bold rounded-lg hover:bg-gray-800 transition flex items-center justify-center gap-2"
          >
            <span className="text-lg">🧵</span>
            Threadsアカウントでログイン
          </button>
          <p className="text-xs text-gray-500 text-center">
            ワンクリックでOAuth認証が完了します
          </p>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-lg">💡</span>
            <div className="text-xs text-amber-900 flex-1">
              <p className="font-semibold mb-1">
                ワンクリックログインを有効にするには
              </p>
              <p>
                下のセットアップガイドに従って Meta開発者アプリを作成し、
                <code className="bg-amber-100 px-1 rounded">.env.local</code>{' '}
                に APP_ID と APP_SECRET を設定してください。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* セットアップガイド */}
      <details
        className="border border-gray-200 rounded-lg"
        open={showGuide}
        onToggle={(e) => setShowGuide((e.target as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 select-none flex items-center justify-between">
          <span>📖 セットアップガイド (Meta開発者登録 〜 トークン取得)</span>
          <span className="text-xs text-gray-400">クリックで展開</span>
        </summary>

        <div className="px-4 pb-4 space-y-4 text-sm text-gray-700">
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs">
            <p className="font-semibold text-blue-900 mb-1">📌 進め方</p>
            <p className="text-blue-800">
              開発モードでは、自分のThreadsアカウントを「Threadsテスター」として登録すれば
              審査なしで使えます。所要時間 10〜15分。
            </p>
          </div>

          {/* Step 1 */}
          <Step n={1} title="Meta開発者アカウントを作成">
            <p>
              下のリンクからMeta for Developersにアクセスし、Facebookアカウントでログインしてください。
            </p>
            <a
              href="https://developers.facebook.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              ↗ Meta for Developers を開く
            </a>
          </Step>

          {/* Step 2 */}
          <Step n={2} title="新規アプリを作成">
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>右上の「マイアプリ」→「アプリを作成」</li>
              <li>
                ユースケース選択画面で
                <strong className="text-purple-700">「アクセス: Threads API」</strong>
                を選択
              </li>
              <li>アプリ名を入力（例: 「note-threads-manager」）→ 作成</li>
            </ol>
            <a
              href="https://developers.facebook.com/apps/?show_reminder=true"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              ↗ アプリ作成画面を開く
            </a>
          </Step>

          {/* Step 3 */}
          <Step n={3} title="Threads APIの権限を有効化">
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>左メニュー「ユースケース」→ Threads API の「カスタマイズ」</li>
              <li>
                以下の権限にチェック:
                <ul className="ml-5 mt-1 space-y-0.5">
                  <li>✅ <code>threads_basic</code></li>
                  <li>✅ <code>threads_content_publish</code></li>
                  <li>✅ <code>threads_manage_insights</code></li>
                </ul>
              </li>
            </ol>
          </Step>

          {/* Step 4: コールバックURL */}
          <Step n={4} title="コールバックURLを登録">
            <p className="text-xs mb-2">
              左メニュー「Threads API」→「設定」→「Callback URL」に
              以下のURLを<strong>そのままコピペ</strong>:
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded p-2 flex items-center gap-2">
              <code className="text-xs flex-1 break-all">
                {config?.redirectUri || '読み込み中...'}
              </code>
              <button
                onClick={() => copyToClipboard(config?.redirectUri || '', 'redirect')}
                disabled={!config?.redirectUri}
                className="shrink-0 text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-40"
              >
                {copied === 'redirect' ? '✓' : 'コピー'}
              </button>
            </div>
          </Step>

          {/* Step 5: テスター登録 */}
          <Step n={5} title="自分をThreadsテスターとして登録">
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>
                同じ「Threads API」→「設定」画面下部の
                <strong>「Threadsテスターを追加または削除」</strong>
              </li>
              <li>自分のThreadsユーザー名を入力して招待</li>
              <li>
                下のリンクから
                <a
                  href="https://www.threads.net/settings/account"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  Threadsの設定ページ
                </a>
                を開いて、テスター招待を承認
              </li>
            </ol>
          </Step>

          {/* Step 6: APP_ID/SECRET */}
          <Step n={6} title="APP_ID と APP_SECRET をコピー">
            <p className="text-xs mb-2">
              左メニュー「アプリ設定」→「基本」から以下を確認:
            </p>
            <ul className="text-xs ml-4 space-y-0.5 list-disc">
              <li><strong>アプリID</strong> (Threads App ID)</li>
              <li><strong>app secret</strong> (「表示」ボタンで露出)</li>
            </ul>
          </Step>

          {/* Step 7: .env.local */}
          <Step n={7} title="環境変数を設定 (.env.local)">
            <p className="text-xs mb-2">
              プロジェクトルートに <code>.env.local</code> を作成し、以下を貼り付け:
            </p>
            <div className="bg-gray-900 text-gray-100 rounded p-3 text-xs font-mono relative">
              <button
                onClick={() =>
                  copyToClipboard(
                    `THREADS_APP_ID=your_app_id_here\nTHREADS_APP_SECRET=your_app_secret_here\nTHREADS_REDIRECT_URI=${config?.redirectUri || ''}`,
                    'env'
                  )
                }
                className="absolute top-2 right-2 text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded"
              >
                {copied === 'env' ? '✓' : 'コピー'}
              </button>
              <pre className="whitespace-pre-wrap break-all pr-12">
{`THREADS_APP_ID=your_app_id_here
THREADS_APP_SECRET=your_app_secret_here
THREADS_REDIRECT_URI=${config?.redirectUri || ''}`}
              </pre>
            </div>
            <p className="text-xs text-orange-600 mt-2">
              ⚠️ <code>.env.local</code> 保存後は<strong>サーバー再起動</strong>が必要です
            </p>
          </Step>

          {/* Step 8: ログイン */}
          <Step n={8} title="完了！「Threadsアカウントでログイン」ボタンが出現">
            <p className="text-xs">
              ここまで完了するとページ上部のボタンが有効になり、ワンクリックでログインできます。
              開発モードのままで自分のアカウントなら審査不要です。
            </p>
          </Step>
        </div>
      </details>

      {/* 手動トークン入力（フォールバック） */}
      <details className="border border-gray-200 rounded-lg">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 select-none">
          🔧 アクセストークンを手動で入力する
        </summary>
        <div className="px-4 pb-4 space-y-2">
          <p className="text-xs text-gray-500">
            既に Long-lived Access Token をお持ちの場合は、ここに貼り付けてください。
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
        </div>
      </details>

      {error && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
          ❌ {error}
        </p>
      )}
    </div>
  );
}

// ステップ表示用のコンポーネント
function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-7 h-7 rounded-full bg-purple-100 text-purple-700 font-bold text-sm flex items-center justify-center">
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-800 mb-1">{title}</p>
        <div className="text-gray-600">{children}</div>
      </div>
    </div>
  );
}
