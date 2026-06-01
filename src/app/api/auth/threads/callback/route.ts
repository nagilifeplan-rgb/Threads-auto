/**
 * GET /api/auth/threads/callback?code=...&state=...
 *
 * ThreadsからのOAuthコールバック。
 * 1. stateを検証
 * 2. codeをshort-lived tokenに交換
 * 3. long-lived token に変換
 * 4. プロフィール取得して config に保存
 * 5. アプリのトップに戻す
 */
import { NextRequest, NextResponse } from 'next/server';
import { saveConfig } from '@/lib/store';
import { getThreadsProfile } from '@/lib/threads';
import { getRedirectUri, getPublicOrigin } from '@/lib/origin';

const TOKEN_EXCHANGE_URL = 'https://graph.threads.net/oauth/access_token';
const LONG_LIVED_URL = 'https://graph.threads.net/access_token';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorReason = searchParams.get('error_reason');
  const errorDesc = searchParams.get('error_description');

  // ユーザーが認可を拒否した場合
  if (error) {
    return redirectToHomeWithError(
      req,
      `認可が拒否されました: ${errorReason || error}${errorDesc ? ' - ' + errorDesc : ''}`
    );
  }

  if (!code) {
    return redirectToHomeWithError(req, 'codeパラメータが見つかりません');
  }

  // state検証
  const expectedState = req.cookies.get('threads_oauth_state')?.value;
  if (!expectedState || expectedState !== state) {
    return redirectToHomeWithError(
      req,
      'CSRF state検証に失敗しました。もう一度お試しください'
    );
  }

  const appId = process.env.THREADS_APP_ID;
  const appSecret = process.env.THREADS_APP_SECRET;
  const redirectUri = getRedirectUri(req);

  if (!appId || !appSecret) {
    return redirectToHomeWithError(
      req,
      'THREADS_APP_ID / THREADS_APP_SECRET が設定されていません'
    );
  }

  try {
    // Step 1: code → short-lived token
    const formData = new FormData();
    formData.append('client_id', appId);
    formData.append('client_secret', appSecret);
    formData.append('grant_type', 'authorization_code');
    formData.append('redirect_uri', redirectUri);
    formData.append('code', code.replace(/#_$/, '')); // strip trailing #_

    const shortRes = await fetch(TOKEN_EXCHANGE_URL, {
      method: 'POST',
      body: formData,
    });

    if (!shortRes.ok) {
      const err = await shortRes.json().catch(() => ({}));
      throw new Error(
        `Short-lived token交換に失敗: ${shortRes.status} – ${JSON.stringify(err)}`
      );
    }

    const shortData = (await shortRes.json()) as {
      access_token: string;
      user_id: number | string;
    };

    // Step 2: short-lived → long-lived (60日有効)
    const longUrl = `${LONG_LIVED_URL}?grant_type=th_exchange_token&client_secret=${encodeURIComponent(
      appSecret
    )}&access_token=${encodeURIComponent(shortData.access_token)}`;

    const longRes = await fetch(longUrl);
    let finalToken = shortData.access_token;
    if (longRes.ok) {
      const longData = (await longRes.json()) as { access_token: string };
      finalToken = longData.access_token;
    } else {
      console.warn('[OAuth] Long-lived token交換に失敗、short-livedを使用');
    }

    // Step 3: プロフィール取得 & 保存
    const profile = await getThreadsProfile(finalToken);
    saveConfig({
      accessToken: finalToken,
      userId: profile.id,
      username: profile.username,
    });

    // 成功 → アプリトップへ
    const res = redirectToHome(req, { success: '1', username: profile.username });
    res.cookies.delete('threads_oauth_state');
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return redirectToHomeWithError(req, msg);
  }
}

function redirectToHome(
  req: NextRequest,
  params: Record<string, string>
): NextResponse {
  const url = new URL('/', getPublicOrigin(req));
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

function redirectToHomeWithError(req: NextRequest, message: string): NextResponse {
  return redirectToHome(req, { error: message });
}
