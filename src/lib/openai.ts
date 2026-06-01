/**
 * OpenAI client (GenSpark proxy compatible).
 * Loads config from ~/.genspark_llm.yaml or env vars.
 */
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import os from 'os';
import yaml from 'js-yaml';

interface GsLlmConfig {
  openai?: {
    api_key?: string;
    base_url?: string;
  };
}

let cached: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (cached) return cached;

  // Candidate API keys (in priority order)
  const candidates: (string | undefined)[] = [];

  // 1. GSK_TOKEN (the working token format on this sandbox)
  if (process.env.GSK_TOKEN) candidates.push(process.env.GSK_TOKEN);

  // 2. OPENAI_API_KEY env var
  if (process.env.OPENAI_API_KEY) candidates.push(process.env.OPENAI_API_KEY);

  // 3. ~/.genspark_llm.yaml api_key (skip placeholders)
  let baseURL = process.env.OPENAI_BASE_URL;
  try {
    const configPath = path.join(os.homedir(), '.genspark_llm.yaml');
    if (fs.existsSync(configPath)) {
      const cfg = yaml.load(fs.readFileSync(configPath, 'utf-8')) as GsLlmConfig;
      const rawKey = cfg?.openai?.api_key;
      if (rawKey && !rawKey.startsWith('${')) candidates.push(rawKey);
      baseURL = baseURL || cfg?.openai?.base_url;
    }
  } catch {
    /* ignore */
  }

  // Prefer keys that look like gsk-* (GenSpark proxy format)
  const apiKey =
    candidates.find((k) => k && k.startsWith('gsk-')) ||
    candidates.find((k) => !!k);

  if (!apiKey) {
    throw new Error(
      'OpenAI API key が設定されていません。GenSpark の API Keys タブから注入してください。'
    );
  }

  cached = new OpenAI({ apiKey, baseURL });
  return cached;
}

export const DEFAULT_MODEL = 'gpt-5-mini';
