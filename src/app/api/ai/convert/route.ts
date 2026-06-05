/**
 * POST /api/ai/convert
 * note 記事本文を Threads 用の短い投稿文に変換する。
 *
 * body: { title?: string, body: string, style?: 'casual' | 'professional' | 'hook' }
 * response: { text: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient, DEFAULT_MODEL } from '@/lib/openai';

const STYLE_GUIDE: Record<string, string> = {
  casual: 'カジュアルでフレンドリーな口調。絵文字を1〜2個使う。',
  professional: '落ち着いた知的なトーン。絵文字は最小限。',
  hook: '冒頭で強く惹きつけるフック文を作り、続きが気になる構成。',
};

export async function POST(req: NextRequest) {
  try {
    const { title, body, style = 'casual' } = (await req.json()) as {
      title?: string;
      body?: string;
      style?: 'casual' | 'professional' | 'hook';
    };

    if (!body || typeof body !== 'string' || body.trim() === '') {
      return NextResponse.json({ error: 'body is required' }, { status: 400 });
    }

    const styleHint = STYLE_GUIDE[style] || STYLE_GUIDE.casual;

    const client = getOpenAIClient();

    const sys =
      'あなたはSNSコピーライターです。与えられたnote記事を、Threads向けの短い投稿文に変換します。\n' +
      '制約:\n' +
      '- 必ず日本語\n' +
      '- 最大450文字（500文字未満必須）\n' +
      '- 改行を適度に入れて読みやすく\n' +
      '- ハッシュタグは末尾に最大3個\n' +
      '- 記事への誘導文を入れる（「続きはnoteで」など）\n' +
      `- 文体: ${styleHint}`;

    const user = `# 記事タイトル\n${title || '(無題)'}\n\n# 記事本文\n${body}`;

    const completion = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
    });

    let text = completion.choices[0]?.message?.content?.trim() || '';

    // 念のため500文字制限を強制
    if (text.length > 500) text = text.slice(0, 497) + '...';

    return NextResponse.json({ text });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
