/**
 * POST /api/spreadsheet/preview
 *
 * Accepts either:
 *   - multipart/form-data  { file: File, contentCol?: string, dateCol?: string }
 *   - application/json     { url: string (Google Sheets), contentCol?, dateCol? }
 *
 * Returns ParsedSpreadsheet for client preview before committing.
 */
import { NextRequest, NextResponse } from 'next/server';
import { parseCSVText, convertGoogleSheetsUrl, isGoogleSheetsUrl } from '@/lib/parseSpreadsheet';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') ?? '';

    let csvText = '';
    let contentCol: string | undefined;
    let dateCol: string | undefined;
    let sourceFile = '';

    if (contentType.includes('multipart/form-data')) {
      // --- File upload ---
      const form = await req.formData();
      const file = form.get('file') as File | null;
      contentCol = (form.get('contentCol') as string) || undefined;
      dateCol = (form.get('dateCol') as string) || undefined;

      if (!file) {
        return NextResponse.json({ error: 'ファイルが見つかりません' }, { status: 400 });
      }
      if (!file.name.match(/\.(csv|tsv|txt)$/i)) {
        return NextResponse.json({ error: 'CSV / TSV ファイルのみ対応しています' }, { status: 400 });
      }
      csvText = await file.text();
      sourceFile = file.name;
    } else {
      // --- Google Sheets URL ---
      const body = await req.json();
      const { url, contentCol: cc, dateCol: dc } = body;
      contentCol = cc || undefined;
      dateCol = dc || undefined;

      if (!url || !isGoogleSheetsUrl(url)) {
        return NextResponse.json({ error: '有効な Google スプレッドシートの URL を入力してください' }, { status: 400 });
      }

      const csvUrl = convertGoogleSheetsUrl(url);
      if (!csvUrl) {
        return NextResponse.json({ error: 'URL から スプレッドシート ID を取得できませんでした' }, { status: 400 });
      }

      const fetchRes = await fetch(csvUrl);
      if (!fetchRes.ok) {
        return NextResponse.json({
          error: `スプレッドシートの取得に失敗しました (${fetchRes.status})。「ウェブに公開」設定を確認してください。`,
        }, { status: 400 });
      }
      csvText = await fetchRes.text();
      sourceFile = url;
    }

    if (!csvText.trim()) {
      return NextResponse.json({ error: 'ファイルが空です' }, { status: 400 });
    }

    const parsed = parseCSVText(csvText, contentCol, dateCol);
    return NextResponse.json({ ...parsed, sourceFile });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
