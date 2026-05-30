/**
 * In-process scheduler using setInterval (runs while the Next.js server is up).
 * Every minute it checks for pending posts whose scheduledAt has passed.
 */
import { loadPosts, updatePost, loadConfig } from './store';
import { postToThreads } from './threads';

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
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          updatePost(post.id, { status: 'failed', errorMessage: msg });
          console.error(`[Scheduler] Failed to post ${post.id}: ${msg}`);
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
