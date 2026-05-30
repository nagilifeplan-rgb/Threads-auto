export interface ScheduledPost {
  id: string;
  content: string;
  scheduledAt: string; // ISO string
  status: 'pending' | 'posted' | 'failed' | 'cancelled';
  mediaUrls?: string[];
  threadId?: string; // Threads post ID after posting
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ThreadsConfig {
  accessToken: string;
  userId: string;
  username?: string;
}
