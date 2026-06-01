/**
 * Simple JSON-file based data store (no native module needed)
 */
import fs from 'fs';
import path from 'path';
import { ScheduledPost, ThreadsConfig, NoteArticle } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// ---------- Posts ----------

export function loadPosts(): ScheduledPost[] {
  ensureDir();
  if (!fs.existsSync(POSTS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(POSTS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

export function savePosts(posts: ScheduledPost[]): void {
  ensureDir();
  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
}

export function addPost(post: ScheduledPost): void {
  const posts = loadPosts();
  posts.push(post);
  savePosts(posts);
}

export function updatePost(id: string, update: Partial<ScheduledPost>): boolean {
  const posts = loadPosts();
  const idx = posts.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  posts[idx] = { ...posts[idx], ...update, updatedAt: new Date().toISOString() };
  savePosts(posts);
  return true;
}

export function deletePost(id: string): boolean {
  const posts = loadPosts();
  const next = posts.filter((p) => p.id !== id);
  if (next.length === posts.length) return false;
  savePosts(next);
  return true;
}

export function getPost(id: string): ScheduledPost | undefined {
  return loadPosts().find((p) => p.id === id);
}

// ---------- Config ----------

export function loadConfig(): ThreadsConfig | null {
  ensureDir();
  if (!fs.existsSync(CONFIG_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

export function saveConfig(config: ThreadsConfig): void {
  ensureDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function clearConfig(): void {
  if (fs.existsSync(CONFIG_FILE)) fs.unlinkSync(CONFIG_FILE);
}

// ---------- Notes (note記事の下書き) ----------

export function loadNotes(): NoteArticle[] {
  ensureDir();
  if (!fs.existsSync(NOTES_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(NOTES_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

export function saveNotes(notes: NoteArticle[]): void {
  ensureDir();
  fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2));
}

export function addNote(note: NoteArticle): void {
  const notes = loadNotes();
  notes.push(note);
  saveNotes(notes);
}

export function updateNote(id: string, update: Partial<NoteArticle>): boolean {
  const notes = loadNotes();
  const idx = notes.findIndex((n) => n.id === id);
  if (idx === -1) return false;
  notes[idx] = { ...notes[idx], ...update, updatedAt: new Date().toISOString() };
  saveNotes(notes);
  return true;
}

export function deleteNote(id: string): boolean {
  const notes = loadNotes();
  const next = notes.filter((n) => n.id !== id);
  if (next.length === notes.length) return false;
  saveNotes(next);
  return true;
}

export function getNote(id: string): NoteArticle | undefined {
  return loadNotes().find((n) => n.id === id);
}
