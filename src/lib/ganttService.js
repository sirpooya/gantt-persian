import { supabase, SUPABASE_URL, SUPABASE_HAS_KEY } from './supabase.js';

const STORAGE_BUCKET = 'gantt-data';
const JSON_FILE = 'gantt-data.json';
const ASSIGNEE_FILE = 'assignee.json';
const CATEGORY_FILE = 'category.json';
const LOCAL_STORAGE_KEY = 'gantt-data::v1';

// Public (unauthenticated) URLs for read-only JSON resources in Supabase Storage
const PUBLIC_BUCKET_BASE =
  'https://frmkcwwwaaygrqtcttqb.supabase.co/storage/v1/object/public/gantt-data';
const PUBLIC_GANTT_URL =
  `${PUBLIC_BUCKET_BASE}/gantt-data.json`;
const PUBLIC_CATEGORY_URL =
  `${PUBLIC_BUCKET_BASE}/category.json`;
const PUBLIC_ASSIGNEE_URL =
  `${PUBLIC_BUCKET_BASE}/assignee.json`;

function resolveAssigneeAvatarUrl(avatar) {
  if (!avatar) return '';
  const s = String(avatar);
  if (/^https?:\/\//i.test(s)) return s;

  // Supabase storage public avatars live under `${PUBLIC_BUCKET_BASE}/avatars/*.png`
  if (s.startsWith('/data/avatars/')) {
    return `${PUBLIC_BUCKET_BASE}/avatars/${s.slice('/data/avatars/'.length)}`;
  }
  if (s.startsWith('data/avatars/')) {
    return `${PUBLIC_BUCKET_BASE}/avatars/${s.slice('data/avatars/'.length)}`;
  }
  if (s.startsWith('/avatars/')) {
    return `${PUBLIC_BUCKET_BASE}${s}`;
  }
  if (s.startsWith('avatars/')) {
    return `${PUBLIC_BUCKET_BASE}/${s}`;
  }

  // If it's a site-relative path that's not the old dev path, keep it as-is.
  return s;
}

function normalizeData(input) {
  return {
    tasks: Array.isArray(input?.tasks) ? input.tasks : [],
    links: Array.isArray(input?.links) ? input.links : [],
  };
}

function hasSupabaseConfig() {
  // Allow either explicit env URL or the default project URL, as long as a key exists.
  return Boolean(SUPABASE_URL) && Boolean(SUPABASE_HAS_KEY);
}

function readLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return { ok: false, data: { tasks: [], links: [] } };
    return { ok: true, data: normalizeData(JSON.parse(raw)) };
  } catch {
    return { ok: false, data: { tasks: [], links: [] } };
  }
}

function writeLocal(data) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalizeData(data)));
    return true;
  } catch {
    return false;
  }
}

async function tryLoadFromPublicUrl() {
  try {
    // Prefer the explicit public URL (no auth/policy issues).
    const res = await fetch(PUBLIC_GANTT_URL, { cache: 'no-store' });
    if (!res.ok) return { ok: false, error: new Error(`Public fetch failed: ${res.status} ${res.statusText}`) };
    const parsed = normalizeData(await res.json());
    return { ok: true, data: parsed };
  } catch (error) {
    return { ok: false, error };
  }
}

async function fetchPublicJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Public fetch failed: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function loadCategories() {
  try {
    const data = await fetchPublicJson(PUBLIC_CATEGORY_URL);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('Error loading categories from public URL:', e);
    return [];
  }
}

export async function loadAssignees() {
  try {
    const data = await fetchPublicJson(PUBLIC_ASSIGNEE_URL);
    const arr = Array.isArray(data) ? data : [];
    return arr.map((a) => ({
      ...a,
      avatar: resolveAssigneeAvatarUrl(a?.avatar),
    }));
  } catch (e) {
    console.error('Error loading assignees from public URL:', e);
    return [];
  }
}

function normalizeAssignees(input) {
  const arr = Array.isArray(input) ? input : [];
  return arr
    .filter(Boolean)
    .map((a) => ({
      id: a?.id !== undefined && a?.id !== null ? String(a.id) : '',
      label: a?.label ?? '',
      avatar: a?.avatar ?? '',
    }))
    .filter((a) => a.id);
}

function normalizeCategories(input) {
  const arr = Array.isArray(input) ? input : [];
  return arr
    .filter(Boolean)
    .map((c) => ({
      id: c?.id !== undefined && c?.id !== null ? String(c.id) : '',
      name: c?.name ?? '',
      color: c?.color ?? '',
    }))
    .filter((c) => c.id);
}

export async function saveAssignees(assignees) {
  if (!hasSupabaseConfig()) {
    return {
      ok: false,
      backend: 'supabase',
      error: new Error('Supabase key not configured (set VITE_SUPABASE_PUBLISHABLE_KEY)'),
    };
  }

  try {
    const normalized = normalizeAssignees(assignees);
    const jsonString = JSON.stringify(normalized, null, 2);
    const body = new Blob([jsonString], { type: 'application/json' });
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(ASSIGNEE_FILE, body, {
      contentType: 'application/json',
      upsert: true,
    });
    if (error) throw error;
    return { ok: true, backend: 'supabase' };
  } catch (error) {
    console.error('Error saving assignees to Supabase Storage:', error);
    return { ok: false, backend: 'supabase', error };
  }
}

export async function saveCategories(categories) {
  if (!hasSupabaseConfig()) {
    return {
      ok: false,
      backend: 'supabase',
      error: new Error('Supabase key not configured (set VITE_SUPABASE_PUBLISHABLE_KEY)'),
    };
  }

  try {
    const normalized = normalizeCategories(categories);
    const jsonString = JSON.stringify(normalized, null, 2);
    const body = new Blob([jsonString], { type: 'application/json' });
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(CATEGORY_FILE, body, {
      contentType: 'application/json',
      upsert: true,
    });
    if (error) throw error;
    return { ok: true, backend: 'supabase' };
  } catch (error) {
    console.error('Error saving categories to Supabase Storage:', error);
    return { ok: false, backend: 'supabase', error };
  }
}

/**
 * Load Gantt data from Supabase Storage (JSON file)
 * Falls back to localStorage when Supabase isn't configured or fails.
 * @returns {Promise<{ok: boolean, backend: 'supabase'|'local'|'empty', tasks: Array, links: Array, error?: any}>}
 */
export async function loadGanttData() {
  try {
    const local = readLocal();
    if (!hasSupabaseConfig()) {
      const d = local.ok ? local.data : { tasks: [], links: [] };
      return { ok: true, backend: local.ok ? 'local' : 'empty', ...d };
    }

    // Prefer the public bucket URL when available.
    // This matches what you see in the browser and avoids Storage SELECT policy issues.
    const pubFirst = await tryLoadFromPublicUrl();
    if (pubFirst.ok) {
      writeLocal(pubFirst.data);
      console.log('✅ Loaded from Supabase public URL:', {
        tasksCount: pubFirst.data.tasks.length,
        linksCount: pubFirst.data.links.length,
      });
      return { ok: true, backend: 'supabase', ...pubFirst.data };
    }

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(JSON_FILE);

    if (error) {
      // File doesn't exist yet, return empty structure
      if (error.statusCode === '404' || error.message?.includes('not found') || error.statusCode === 404) {
        const d = local.ok ? local.data : { tasks: [], links: [] };
        console.log('⚠️ No Gantt data file found in Supabase Storage (404); falling back to', local.ok ? 'localStorage' : 'empty');
        return { ok: true, backend: local.ok ? 'local' : 'empty', ...d };
      }
      console.warn('⚠️ Supabase Storage download error; falling back to localStorage:', error);
      const d = local.ok ? local.data : { tasks: [], links: [] };
      return { ok: true, backend: local.ok ? 'local' : 'empty', ...d, error: pubFirst.error || error };
    }

    if (!data) {
      const d = local.ok ? local.data : { tasks: [], links: [] };
      return { ok: true, backend: local.ok ? 'local' : 'empty', ...d };
    }

    // Parse the JSON file
    const text = await data.text();
    const parsed = normalizeData(JSON.parse(text));
    console.log('✅ Loaded from Supabase Storage:', {
      tasksCount: Array.isArray(parsed.tasks) ? parsed.tasks.length : 0,
      linksCount: Array.isArray(parsed.links) ? parsed.links.length : 0,
      rawTextLength: text.length,
    });

    // Keep a local backup for offline/dev without Supabase.
    writeLocal(parsed);
    return { ok: true, backend: 'supabase', ...parsed };
  } catch (error) {
    console.error('Error loading Gantt data from Supabase Storage:', error);
    const local = readLocal();
    const d = local.ok ? local.data : { tasks: [], links: [] };
    return { ok: true, backend: local.ok ? 'local' : 'empty', ...d, error };
  }
}

// Viewer-only: read from the public URL and DO NOT write localStorage or call storage.download().
export async function loadGanttDataPublicOnly() {
  try {
    const res = await fetch(PUBLIC_GANTT_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Public fetch failed: ${res.status} ${res.statusText}`);
    const parsed = normalizeData(await res.json());
    return { ok: true, backend: 'supabase', ...parsed };
  } catch (error) {
    console.error('Error loading Gantt data from public URL:', error);
    return { ok: false, backend: 'supabase', tasks: [], links: [], error };
  }
}

/**
 * Save Gantt data to Supabase Storage (JSON file)
 * @param {Object} ganttData - {tasks: Array, links: Array}
 * Saves to localStorage first, then attempts Supabase (if configured).
 * @returns {Promise<{ok: boolean, backend: 'supabase'|'local', error?: any}>}
 */
export async function saveGanttData(ganttData) {
  const normalized = normalizeData(ganttData);
  const localOk = writeLocal(normalized);

  if (!hasSupabaseConfig()) {
    if (!localOk) {
      return { ok: false, backend: 'local', error: new Error('Failed to write to localStorage') };
    }
    return { ok: true, backend: 'local' };
  }

  try {
    const jsonString = JSON.stringify(normalized, null, 2);
    const body = new Blob([jsonString], { type: 'application/json' });

    // Upload/overwrite the JSON file
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(JSON_FILE, body, {
        contentType: 'application/json',
        upsert: true, // Overwrite if exists
      });

    if (error) throw error;
    return { ok: true, backend: 'supabase' };
  } catch (error) {
    console.error('Error saving Gantt data to Supabase Storage (local backup kept):', error);
    if (localOk) return { ok: true, backend: 'local', error };
    return { ok: false, backend: 'local', error };
  }
}

