/**
 * GET /api/auth/threads/config
 *
 * OAuth設定状況とリダイレクトURIを返す。
 * フロントエンド側でOAuthボタンを出すか手動入力ガイドを出すかの判定に使う。
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPublicOrigin } from '@/lib/origin';

export async function GET(req: NextRequest) {
  const hasAppId = !!process.env.THREADS_APP_ID;
  const hasAppSecret = !!process.env.THREADS_APP_SECRET;

  // 現在のホストから自動推測したリダイレクトURI（Meta側に登録すべき値）
  const detectedRedirectUri = `${getPublicOrigin(req)}/api/auth/threads/callback`;
  const configuredRedirectUri = process.env.THREADS_REDIRECT_URI || detectedRedirectUri;

  return NextResponse.json({
    oauthEnabled: hasAppId && hasAppSecret,
    hasAppId,
    hasAppSecret,
    redirectUri: configuredRedirectUri,
    detectedRedirectUri,
  });
}
