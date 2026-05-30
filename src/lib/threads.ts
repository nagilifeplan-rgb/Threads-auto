/**
 * Threads API client
 * Docs: https://developers.facebook.com/docs/threads
 */

const API_BASE = 'https://graph.threads.net/v1.0';

export interface ThreadsPostResult {
  id: string;
}

/**
 * Create a text-only post on Threads.
 * Flow: create container → publish container
 */
export async function postToThreads(
  accessToken: string,
  userId: string,
  text: string,
  mediaUrls?: string[]
): Promise<ThreadsPostResult> {
  // Step 1: Create media container
  const containerParams: Record<string, string> = {
    media_type: 'TEXT',
    text,
    access_token: accessToken,
  };

  // If image URLs provided, use single image
  if (mediaUrls && mediaUrls.length > 0) {
    containerParams.media_type = 'IMAGE';
    containerParams.image_url = mediaUrls[0];
  }

  const containerRes = await fetch(
    `${API_BASE}/${userId}/threads`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(containerParams),
    }
  );

  if (!containerRes.ok) {
    const err = await containerRes.json().catch(() => ({}));
    throw new Error(
      `Container creation failed: ${containerRes.status} – ${JSON.stringify(err)}`
    );
  }

  const { id: containerId } = (await containerRes.json()) as { id: string };

  // Step 2: Publish container
  const publishRes = await fetch(
    `${API_BASE}/${userId}/threads_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: accessToken,
      }),
    }
  );

  if (!publishRes.ok) {
    const err = await publishRes.json().catch(() => ({}));
    throw new Error(
      `Publish failed: ${publishRes.status} – ${JSON.stringify(err)}`
    );
  }

  const { id } = (await publishRes.json()) as { id: string };
  return { id };
}

/**
 * Verify token and fetch basic profile info
 */
export async function getThreadsProfile(accessToken: string) {
  const res = await fetch(
    `${API_BASE}/me?fields=id,username,threads_profile_picture_url&access_token=${encodeURIComponent(accessToken)}`
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Profile fetch failed: ${res.status} – ${JSON.stringify(err)}`);
  }
  return res.json() as Promise<{ id: string; username: string; threads_profile_picture_url?: string }>;
}
