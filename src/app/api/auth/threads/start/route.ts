/**
 * GET /api/auth/threads/start
 *
 * OAuthフローを開始する。Threadsの認可画面にリダイレクトする。
 * 必須環境変数:
 *   THREADS_APP_ID      - Meta開発者ダッシュボードのApp ID
 *   THREADS_APP_SECRET  - App Secret
 *   THREADS_REDIRECT_URI - 登録済みコールバックURL
 *     (例: https://3000-xxx.sandbox.novita.ai/api/auth/threads/callback)
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getRedirectUri } from '@/lib/origin';

const AUTHORIZE_URL = 'https://threads.net/oauth/authorize';
const DEFAULT_SCOPES = [
  'threads_basic',
  'threads_content_publish',
  'threads_manage_insights',
].join(',');

export async function GET(req: NextRequest) {
  const appId = process.env.THREADS_APP_ID;
  const redirectUri = getRedirectUri(req);

  if (!appId) {
    return NextResponse.json(
      {
        error: 'THREADS_APP_ID が設定されていません。.env.local を確認してください',
        configured: false,
      },
      { status: 400 }
    );
  }

  // CSRF対策の state
  const state = crypto.randomBytes(16).toString('hex');

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: DEFAULT_SCOPES,
    response_type: 'code',
    state,
  });

  const url = `${AUTHORIZE_URL}?${params.toString()}`;

  // stateをcookieに保存（5分間有効）
  const res = NextResponse.redirect(url);
  res.cookies.set('threads_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 300,
    path: '/',
  });
  return res;
}


