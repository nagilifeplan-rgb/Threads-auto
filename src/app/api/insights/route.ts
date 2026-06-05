/**
 * GET /api/insights         → 全インサイトキャッシュを返す
 * POST /api/insights/refresh → 投稿済みのThreadsインサイトを一括更新
 */
import { NextResponse } from 'next/server';
import { loadInsights, loadPosts, loadConfig, upsertInsight } from '@/lib/store';
import { getThreadInsights } from '@/lib/threads';

export async function GET() {
  return NextResponse.json(loadInsights());
}

export async function POST() {
  const config = loadConfig();
  if (!config) {
    return NextResponse.json({ error: 'Threads未接続' }, { status: 400 });
  }

  const posted = loadPosts().filter((p) => p.status === 'posted' && p.threadId);

  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const post of posted) {
    try {
      const ins = await getThreadInsights(config.accessToken, post.threadId!);
      upsertInsight({
        postId: post.id,
        threadId: post.threadId!,
        ...ins,
        fetchedAt: new Date().toISOString(),
      });
      success++;
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${post.id}: ${msg}`);
    }
  }

  return NextResponse.json({
    total: posted.length,
    success,
    failed,
    errors: errors.slice(0, 5), // 最大5件のエラーを返す
  });
}
