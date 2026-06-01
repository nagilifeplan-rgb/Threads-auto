/**
 * In-process scheduler using setInterval (runs while the Next.js server is up).
 * Every 30 seconds it checks for pending posts whose scheduledAt has passed,
 * publishes them to Threads, and creates a notification record.
 */
import { loadPosts, updatePost, loadConfig, addNotification } from './store';
import { postToThreads } from './threads';
import { v4 as uuidv4 } from 'uuid';

let schedulerStarted = false;

export function startScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  console.log('[Scheduler] Started – checking every 30 seconds');

  const tick = async () => {
    try {
      const config = loadConfig();
      if (!config) return;

      const now = new Date();
      const posts = loadPosts();
      const due = posts.filter(
        (p) => p.status === 'pending' && new Date(p.scheduledAt) <= now
      );

      for (const post of due) {
        console.log(`[Scheduler] Posting: ${post.id} – "${post.content.slice(0, 40)}..."`);
        try {
          const result = await postToThreads(
            config.accessToken,
            config.userId,
            post.content,
            post.mediaUrls
          );
          updatePost(post.id, { status: 'posted', threadId: result.id });
          console.log(`[Scheduler] Posted successfully. Thread ID: ${result.id}`);

          // 🔔 通知を保存
          addNotification({
            id: uuidv4(),
            type: 'success',
            title: '✅ 投稿が完了しました',
            message: post.content.slice(0, 80) + (post.content.length > 80 ? '…' : ''),
            relatedPostId: post.id,
            read: false,
            createdAt: new Date().toISOString(),
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          updatePost(post.id, { status: 'failed', errorMessage: msg });
          console.error(`[Scheduler] Failed to post ${post.id}: ${msg}`);

          // 🔔 失敗通知
          addNotification({
            id: uuidv4(),
            type: 'error',
            title: '❌ 投稿に失敗しました',
            message: `${post.content.slice(0, 50)}… (${msg.slice(0, 80)})`,
            relatedPostId: post.id,
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      console.error('[Scheduler] Tick error:', err);
    }
  };

  // Run immediately once, then every 30 seconds
  tick();
  setInterval(tick, 30_000);
}
