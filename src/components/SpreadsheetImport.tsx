'use client';
import { useState, useRef, useCallback } from 'react';
import { ParsedSpreadsheet, SpreadsheetRow } from '@/types';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface Props {
  onImported: () => void;
}

type Step = 'input' | 'preview' | 'done';
type InputMode = 'file' | 'url';

function formatDate(iso: string) {
  try {
    return format(new Date(iso), 'M/d HH:mm', { locale: ja });
  } catch {
    return iso;
  }
}

// ---- CSV template download ----
const CSV_TEMPLATE = `投稿内容,投稿日時
おはようございます！今日も頑張りましょう！,2026-06-01 09:00
週末の振り返り。良い一週間でした。,2026-06-02 20:00
新しい記事を公開しました！ぜひ読んでください。,2026-06-03 12:00
`;

function downloadTemplate() {
  const blob = new Blob(['\uFEFF' + CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'threads_schedule_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function SpreadsheetImport({ onImported }: Props) {
  const [step, setStep] = useState<Step>('input');
  const [mode, setMode] = useState<InputMode>('file');
  const [sheetsUrl, setSheetsUrl] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsed, setParsed] = useState<ParsedSpreadsheet | null>(null);
  const [sourceFile, setSourceFile] = useState('');
  const [contentCol, setContentCol] = useState('');
  const [dateCol, setDateCol] = useState('');
  const [importResult, setImportResult] = useState<{ scheduled: number; skipped: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ---- Preview ----
  const doPreview = useCallback(async (formData?: FormData, jsonBody?: object) => {
    setLoading(true);
    setError('');
    try {
      let res: Response;
      if (formData) {
        res = await fetch('/api/spreadsheet/preview', { method: 'POST', body: formData });
      } else {
        res = await fetch('/api/spreadsheet/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(jsonBody),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'プレビューに失敗しました');
      setParsed(data);
      setSourceFile(data.sourceFile ?? '');
      setContentCol(data.contentCol ?? '');
      setDateCol(data.dateCol ?? '');
      setStep('preview');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFileChange = (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    if (contentCol) fd.append('contentCol', contentCol);
    if (dateCol) fd.append('dateCol', dateCol);
    doPreview(fd);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileChange(file);
  };

  const handleUrlPreview = () => {
    if (!sheetsUrl.trim()) { setError('URLを入力してください'); return; }
    doPreview(undefined, { url: sheetsUrl, contentCol, dateCol });
  };

  // Re-parse with updated column mapping
  const handleRemap = () => {
    if (!sourceFile) return;
    if (mode === 'file') {
      fileRef.current?.click();
    } else {
      doPreview(undefined, { url: sheetsUrl, contentCol, dateCol });
    }
  };

  // ---- Import ----
  const handleImport = async (rowsToImport: SpreadsheetRow[]) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/spreadsheet/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: rowsToImport, sourceFile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'インポートに失敗しました');
      setImportResult({ scheduled: data.scheduled, skipped: data.skipped });
      setStep('done');
      onImported();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('input');
    setParsed(null);
    setError('');
    setImportResult(null);
    setSheetsUrl('');
    setContentCol('');
    setDateCol('');
  };

  // ============================
  //  STEP: input
  // ============================
  if (step === 'input') {
    return (
      <div className="space-y-4">
        {/* Mode tabs */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          {(['file', 'url'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              className={`flex-1 py-2 font-medium transition-colors ${
                mode === m
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              {m === 'file' ? '📁 CSVファイル' : '🔗 Google スプレッドシート'}
            </button>
          ))}
        </div>

        {mode === 'file' ? (
          <>
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-purple-400 bg-purple-50'
                  : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50/30'
              }`}
            >
              <p className="text-3xl mb-2">📊</p>
              <p className="text-sm font-medium text-gray-700">
                CSVファイルをドロップ、またはクリックして選択
              </p>
              <p className="text-xs text-gray-400 mt-1">CSV / TSV 対応 · UTF-8 推奨</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.tsv,.txt"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileChange(file);
                  e.target.value = '';
                }}
              />
            </div>

            {/* Template download */}
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <div>
                <p className="text-xs font-semibold text-blue-700">テンプレートをダウンロード</p>
                <p className="text-xs text-blue-500">必要な列形式のサンプル CSV</p>
              </div>
              <button
                onClick={downloadTemplate}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
              >
                ダウンロード
              </button>
            </div>

            {/* CSV format guide */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-600 space-y-1">
              <p className="font-semibold text-gray-700 mb-2">📋 CSV 形式</p>
              <p>必要な列（列名は自動検出）：</p>
              <ul className="list-disc list-inside space-y-1 mt-1">
                <li><span className="font-mono bg-white border border-gray-200 px-1 rounded">投稿内容</span> または <span className="font-mono bg-white border border-gray-200 px-1 rounded">content</span> — 最大500文字</li>
                <li><span className="font-mono bg-white border border-gray-200 px-1 rounded">投稿日時</span> または <span className="font-mono bg-white border border-gray-200 px-1 rounded">scheduled_at</span> — 例: <span className="font-mono">2026/06/01 09:00</span></li>
              </ul>
            </div>
          </>
        ) : (
          <>
            {/* Google Sheets URL input */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">Google スプレッドシートの URL</label>
              <input
                type="url"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={sheetsUrl}
                onChange={(e) => setSheetsUrl(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>

            {/* Sheets setup guide */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-800 space-y-2">
              <p className="font-semibold">⚠️ Google スプレッドシートの設定</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>スプレッドシートを開く</li>
                <li>「ファイル」→「ウェブに公開」</li>
                <li>「シート全体」「CSV」を選択して「公開」</li>
                <li>上記の URL をコピー&amp;ペースト</li>
              </ol>
            </div>

            <button
              onClick={handleUrlPreview}
              disabled={loading || !sheetsUrl.trim()}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-40 transition"
            >
              {loading ? '読み込み中…' : '🔍 プレビュー'}
            </button>
          </>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-4">
            <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            解析中…
          </div>
        )}
        {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded p-2">{error}</p>}
      </div>
    );
  }

  // ============================
  //  STEP: preview
  // ============================
  if (step === 'preview' && parsed) {
    const validRows = parsed.rows.filter((r) => r.valid);
    const errorRows = parsed.rows.filter((r) => !r.valid);

    return (
      <div className="space-y-4">
        {/* Summary bar */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2 text-xs">
            <span className="bg-green-100 text-green-700 border border-green-200 px-2 py-1 rounded-full font-medium">
              ✅ 有効: {parsed.validCount}行
            </span>
            {parsed.errorCount > 0 && (
              <span className="bg-red-100 text-red-700 border border-red-200 px-2 py-1 rounded-full font-medium">
                ❌ エラー: {parsed.errorCount}行
              </span>
            )}
          </div>
          <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600">
            ← やり直す
          </button>
        </div>

        {/* Column mapping */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-600">列マッピング（変更可能）</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500">投稿内容の列</label>
              <select
                value={contentCol}
                onChange={(e) => setContentCol(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 mt-0.5"
              >
                {parsed.headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500">日時の列</label>
              <select
                value={dateCol}
                onChange={(e) => setDateCol(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 mt-0.5"
              >
                {parsed.headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleRemap}
                disabled={loading}
                className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded mb-0.5"
              >
                再解析
              </button>
            </div>
          </div>
        </div>

        {/* Preview table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left text-gray-500 font-medium w-8">#</th>
                <th className="px-3 py-2 text-left text-gray-500 font-medium">投稿内容</th>
                <th className="px-3 py-2 text-left text-gray-500 font-medium w-28">予定日時</th>
                <th className="px-3 py-2 text-left text-gray-500 font-medium w-20">状態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {parsed.rows.map((row) => (
                <tr
                  key={row.rowIndex}
                  className={`${row.valid ? 'bg-white' : 'bg-red-50'}`}
                >
                  <td className="px-3 py-2 text-gray-400">{row.rowIndex}</td>
                  <td className="px-3 py-2">
                    <p className="text-gray-800 line-clamp-2 break-all">{row.content || <span className="text-gray-300 italic">空</span>}</p>
                  </td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                    {row.valid ? formatDate(row.scheduledAt) : (
                      <span className="text-gray-400">{row.rawDate || '—'}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {row.valid ? (
                      <span className="text-green-600">✅</span>
                    ) : (
                      <span className="text-red-500" title={row.error}>❌</span>
                    )}
                    {row.error && (
                      <p className="text-red-400 text-xs mt-0.5">{row.error}</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Error rows summary */}
        {errorRows.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 space-y-1">
            <p className="font-semibold">⚠️ スキップされる行</p>
            {errorRows.map((r) => (
              <p key={r.rowIndex}>行 {r.rowIndex}: {r.error}</p>
            ))}
          </div>
        )}

        {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded p-2">{error}</p>}

        {/* Import button */}
        {validRows.length > 0 && (
          <button
            onClick={() => handleImport(validRows)}
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-40 transition"
          >
            {loading ? 'インポート中…' : `📅 ${validRows.length}件をスケジュール登録`}
          </button>
        )}
      </div>
    );
  }

  // ============================
  //  STEP: done
  // ============================
  return (
    <div className="text-center py-12 space-y-3">
      <p className="text-5xl">🎉</p>
      <p className="text-base font-bold text-gray-800">インポート完了！</p>
      {importResult && (
        <div className="flex justify-center gap-3 text-sm">
          <span className="bg-green-100 text-green-700 border border-green-200 px-3 py-1.5 rounded-full font-medium">
            ✅ {importResult.scheduled}件 登録
          </span>
          {importResult.skipped > 0 && (
            <span className="bg-gray-100 text-gray-600 border border-gray-200 px-3 py-1.5 rounded-full font-medium">
              ⏭️ {importResult.skipped}件 スキップ
            </span>
          )}
        </div>
      )}
      <p className="text-xs text-gray-400">サーバーが自動的に投稿を実行します</p>
      <button
        onClick={reset}
        className="mt-2 text-sm text-purple-600 hover:underline font-medium"
      >
        さらにインポートする
      </button>
    </div>
  );
}
