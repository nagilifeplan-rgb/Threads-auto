export interface ScheduledPost {
  id: string;
  content: string;
  scheduledAt: string; // ISO string
  status: 'pending' | 'posted' | 'failed' | 'cancelled';
  mediaUrls?: string[];
  threadId?: string; // Threads post ID after posting
  errorMessage?: string;
  source?: 'manual' | 'csv' | 'sheets'; // origin of the post
  sourceFile?: string; // original filename or sheet URL
  createdAt: string;
  updatedAt: string;
}

export interface ThreadsConfig {
  accessToken: string;
  userId: string;
  username?: string;
}

// ---- Spreadsheet import ----

/** One row parsed from CSV / Google Sheets, before scheduling */
export interface SpreadsheetRow {
  rowIndex: number;
  content: string;
  scheduledAt: string; // ISO string (already parsed)
  rawDate: string;     // original date string from sheet
  valid: boolean;
  error?: string;
}

export interface ParsedSpreadsheet {
  rows: SpreadsheetRow[];
  headers: string[];
  contentCol: string;
  dateCol: string;
  validCount: number;
  errorCount: number;
}

// ---- Note article (下書き) ----

/** note記事の下書き。実投稿はnoteエディタにコピーして手動で行う */
export interface NoteArticle {
  id: string;
  title: string;
  body: string;
  tags: string[];
  threadsDraft?: string;     // AI が生成した Threads 用テキスト
  threadsPostedId?: string;  // Threads にスケジュール／投稿した時の ScheduledPost.id
  createdAt: string;
  updatedAt: string;
}
