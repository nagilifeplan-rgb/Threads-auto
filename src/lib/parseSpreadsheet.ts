/**
 * Spreadsheet / CSV parser
 * Supports:
 *   - CSV / TSV file upload
 *   - Google Sheets "publish as CSV" URLs
 *
 * Expected columns (auto-detected by name, case-insensitive):
 *   content / 投稿内容 / text / post
 *   scheduled_at / 日時 / datetime / date / time / 投稿日時
 */
import Papa from 'papaparse';
import { ParsedSpreadsheet, SpreadsheetRow } from '@/types';

// ---- Column name detection ----

const CONTENT_KEYS = ['content', '投稿内容', 'text', 'post', 'message', '本文'];
const DATE_KEYS = [
  'scheduled_at', '日時', 'datetime', 'date', 'time',
  '投稿日時', 'schedule', 'scheduled', '予定日時', '予定',
];

function detectColumn(headers: string[], candidates: string[]): string | null {
  const lower = headers.map((h) => h.trim().toLowerCase());
  for (const c of candidates) {
    const idx = lower.indexOf(c.toLowerCase());
    if (idx !== -1) return headers[idx];
  }
  return null;
}

// ---- Date parsing ----
// Accepts: ISO 8601, "YYYY/MM/DD HH:mm", "YYYY-MM-DD HH:mm", Japanese format, etc.
export function parseDate(raw: string): Date | null {
  if (!raw || !raw.trim()) return null;
  const s = raw.trim();

  // Try standard ISO / Date constructor first
  const d1 = new Date(s);
  if (!isNaN(d1.getTime())) return d1;

  // "YYYY/MM/DD HH:mm" → replace / with -
  const s2 = s.replace(/\//g, '-');
  const d2 = new Date(s2);
  if (!isNaN(d2.getTime())) return d2;

  // "YYYY年M月D日 H時m分" Japanese
  const jpMatch = s.match(/(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2})時(\d{1,2})分/);
  if (jpMatch) {
    const [, y, mo, d, h, mi] = jpMatch;
    return new Date(+y, +mo - 1, +d, +h, +mi);
  }

  // "YYYY年M月D日" (no time → midnight)
  const jpDate = s.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (jpDate) {
    const [, y, mo, d] = jpDate;
    return new Date(+y, +mo - 1, +d, 0, 0);
  }

  return null;
}

// ---- Core parser ----

export function parseCSVText(
  csvText: string,
  contentCol?: string,
  dateCol?: string,
): ParsedSpreadsheet {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const headers = result.meta.fields ?? [];
  const resolvedContent = contentCol ?? detectColumn(headers, CONTENT_KEYS);
  const resolvedDate = dateCol ?? detectColumn(headers, DATE_KEYS);

  const rows: SpreadsheetRow[] = result.data.map((row, i) => {
    const rowIndex = i + 2; // 1-based, row 1 = header

    if (!resolvedContent || !resolvedDate) {
      return {
        rowIndex,
        content: '',
        scheduledAt: '',
        rawDate: '',
        valid: false,
        error: '列が特定できません。列名を確認してください。',
      };
    }

    const content = (row[resolvedContent] ?? '').trim();
    const rawDate = (row[resolvedDate] ?? '').trim();

    if (!content) {
      return { rowIndex, content, scheduledAt: '', rawDate, valid: false, error: '投稿内容が空です' };
    }
    if (content.length > 500) {
      return { rowIndex, content, scheduledAt: '', rawDate, valid: false, error: '500文字を超えています' };
    }
    if (!rawDate) {
      return { rowIndex, content, scheduledAt: '', rawDate, valid: false, error: '日時が空です' };
    }

    const parsed = parseDate(rawDate);
    if (!parsed) {
      return { rowIndex, content, scheduledAt: '', rawDate, valid: false, error: `日時を解析できません: "${rawDate}"` };
    }
    if (parsed <= new Date()) {
      return { rowIndex, content, scheduledAt: parsed.toISOString(), rawDate, valid: false, error: '過去の日時です' };
    }

    return {
      rowIndex,
      content,
      scheduledAt: parsed.toISOString(),
      rawDate,
      valid: true,
    };
  });

  return {
    rows,
    headers,
    contentCol: resolvedContent ?? '',
    dateCol: resolvedDate ?? '',
    validCount: rows.filter((r) => r.valid).length,
    errorCount: rows.filter((r) => !r.valid).length,
  };
}

// ---- Google Sheets URL converter ----
// Converts share URL → CSV export URL

export function convertGoogleSheetsUrl(url: string): string | null {
  // Pattern: https://docs.google.com/spreadsheets/d/{ID}/edit#gid={GID}
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  const id = match[1];

  // Extract gid if present
  const gidMatch = url.match(/[#&?]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : '0';

  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
}

// Also handle "publish to web" CSV links directly
export function isGoogleSheetsUrl(url: string): boolean {
  return url.includes('docs.google.com/spreadsheets');
}
