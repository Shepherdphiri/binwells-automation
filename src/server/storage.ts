import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {Pool, type PoolConfig} from 'pg';
import type {
  BrandSettings,
  FaqItem,
  GalleryImage,
  NewsItem,
  QuoteInquiry,
  ServiceItem,
} from '../types.ts';

export interface AdminCredential {
  salt: string;
  hash: string;
  claimedAt: string;
}

export interface PersistedStore {
  brand: BrandSettings;
  services: ServiceItem[];
  news: NewsItem[];
  gallery: GalleryImage[];
  faqs: FaqItem[];
  inquiries: QuoteInquiry[];
  adminCredential: AdminCredential | null;
}

export type StorageMode = 'postgres' | 'local';

interface StorageOptions {
  dataDir: string;
  uploadsDir: string;
  storePath: string;
  createInitialStore: () => PersistedStore;
  normalizeStore: (raw: Partial<PersistedStore>) => PersistedStore;
}

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const SAFE_UPLOAD_NAME_RE = /^[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp)$/i;

const EXT_TO_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

let pool: Pool | null = null;
let activeMode: StorageMode = 'local';
let storageOpts: StorageOptions | null = null;
let writeQueue: Promise<void> = Promise.resolve();
const memorySessions = new Map<string, number>();

function resolvePgSslConfig(databaseUrl: string): PoolConfig['ssl'] {
  try {
    const parsed = new URL(databaseUrl);
    const sslMode = (parsed.searchParams.get('sslmode') || '').toLowerCase();
    if (sslMode === 'disable') {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    const isLocalHost =
      host === 'localhost' || host === '127.0.0.1' || host === '::1' || !host.includes('.');
    if (isLocalHost && sslMode !== 'require' && sslMode !== 'verify-full') {
      return false;
    }
    return {rejectUnauthorized: false};
  } catch {
    return {rejectUnauthorized: false};
  }
}

export function getStorageMode(): StorageMode {
  return activeMode;
}

function readLocalStoreFile(storePath: string): Partial<PersistedStore> | null {
  try {
    if (fs.existsSync(storePath)) {
      const raw = fs.readFileSync(storePath, 'utf8');
      return JSON.parse(raw) as Partial<PersistedStore>;
    }
  } catch (err) {
    console.error('Failed to read local store.json:', err);
  }
  return null;
}

function writeLocalStoreFile(storePath: string, nextStore: PersistedStore): void {
  const tmpPath = `${storePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(nextStore, null, 2), 'utf8');
  fs.renameSync(tmpPath, storePath);
}

async function seedLocalUploadsToPostgres(pgPool: Pool, uploadsDir: string): Promise<void> {
  try {
    if (!fs.existsSync(uploadsDir)) return;
    const entries = fs.readdirSync(uploadsDir);
    for (const filename of entries) {
      if (!SAFE_UPLOAD_NAME_RE.test(filename)) continue;
      const resolved = path.resolve(uploadsDir, filename);
      if (!resolved.startsWith(uploadsDir + path.sep)) continue;
      const stat = fs.statSync(resolved);
      if (!stat.isFile() || stat.size === 0 || stat.size > 3 * 1024 * 1024) continue;
      const ext = path.extname(filename).toLowerCase();
      const mimeType = EXT_TO_MIME[ext];
      if (!mimeType) continue;
      const buffer = fs.readFileSync(resolved);
      await pgPool.query(
        `INSERT INTO media_files (filename, mime_type, data, size_bytes)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (filename) DO NOTHING`,
        [filename, mimeType, buffer, buffer.length],
      );
    }
  } catch (err) {
    console.error('Non-fatal error migrating local uploads to PostgreSQL:', err);
  }
}

export async function initStorage(opts: StorageOptions): Promise<PersistedStore> {
  storageOpts = opts;
  fs.mkdirSync(opts.dataDir, {recursive: true});
  fs.mkdirSync(opts.uploadsDir, {recursive: true});

  const databaseUrl = (process.env.DATABASE_URL || '').trim();
  if (!databaseUrl) {
    activeMode = 'local';
    const localRaw = readLocalStoreFile(opts.storePath);
    if (localRaw) {
      const normalized = opts.normalizeStore(localRaw);
      writeLocalStoreFile(opts.storePath, normalized);
      return normalized;
    }
    const initial = opts.createInitialStore();
    writeLocalStoreFile(opts.storePath, initial);
    return initial;
  }

  const pgPool = new Pool({
    connectionString: databaseUrl,
    ssl: resolvePgSslConfig(databaseUrl),
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
  });

  pgPool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client:', err);
  });

  try {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS site_state (
        id TEXT PRIMARY KEY,
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS media_files (
        filename TEXT PRIMARY KEY,
        mime_type TEXT NOT NULL,
        data BYTEA NOT NULL,
        size_bytes INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS admin_sessions (
        token TEXT PRIMARY KEY,
        expires_at TIMESTAMPTZ NOT NULL
      );
    `);

    await pgPool.query(`DELETE FROM admin_sessions WHERE expires_at <= NOW();`);

    const existingRes = await pgPool.query<{payload: Partial<PersistedStore>}>(
      `SELECT payload FROM site_state WHERE id = 'main' LIMIT 1`,
    );

    let hydrated: PersistedStore;
    if (existingRes.rows.length > 0 && existingRes.rows[0]?.payload) {
      hydrated = opts.normalizeStore(existingRes.rows[0].payload);
      await pgPool.query(
        `UPDATE site_state SET payload = $1::jsonb, updated_at = NOW() WHERE id = 'main'`,
        [JSON.stringify(hydrated)],
      );
    } else {
      const localRaw = readLocalStoreFile(opts.storePath);
      hydrated = localRaw ? opts.normalizeStore(localRaw) : opts.createInitialStore();
      await pgPool.query(
        `INSERT INTO site_state (id, payload, updated_at)
         VALUES ('main', $1::jsonb, NOW())
         ON CONFLICT (id) DO NOTHING`,
        [JSON.stringify(hydrated)],
      );
      await seedLocalUploadsToPostgres(pgPool, opts.uploadsDir);
    }

    pool = pgPool;
    activeMode = 'postgres';
    console.log('Storage initialized: PostgreSQL (DATABASE_URL)');
    return hydrated;
  } catch (err) {
    console.error('PostgreSQL initialization failed; falling back to local file storage:', err);
    await pgPool.end().catch(() => {});
    pool = null;
    activeMode = 'local';
    const localRaw = readLocalStoreFile(opts.storePath);
    if (localRaw) {
      const normalized = opts.normalizeStore(localRaw);
      writeLocalStoreFile(opts.storePath, normalized);
      return normalized;
    }
    const initial = opts.createInitialStore();
    writeLocalStoreFile(opts.storePath, initial);
    return initial;
  }
}

export async function saveStore(nextStore: PersistedStore): Promise<void> {
  const opts = storageOpts;
  if (!opts) {
    throw new Error('Storage has not been initialized.');
  }

  const run = async () => {
    if (activeMode === 'postgres' && pool) {
      await pool.query(
        `INSERT INTO site_state (id, payload, updated_at)
         VALUES ('main', $1::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE
         SET payload = EXCLUDED.payload, updated_at = NOW()`,
        [JSON.stringify(nextStore)],
      );
      return;
    }
    writeLocalStoreFile(opts.storePath, nextStore);
  };

  const nextTask = writeQueue.then(run, run);
  writeQueue = nextTask.catch(() => {});
  await nextTask;
}

export async function saveMediaFile(
  filename: string,
  mimeType: string,
  buffer: Buffer,
): Promise<void> {
  if (!SAFE_UPLOAD_NAME_RE.test(filename)) {
    throw new Error('Invalid media filename.');
  }
  const opts = storageOpts;
  if (!opts) {
    throw new Error('Storage has not been initialized.');
  }

  if (activeMode === 'postgres' && pool) {
    await pool.query(
      `INSERT INTO media_files (filename, mime_type, data, size_bytes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (filename) DO UPDATE
       SET mime_type = EXCLUDED.mime_type,
           data = EXCLUDED.data,
           size_bytes = EXCLUDED.size_bytes`,
      [filename, mimeType, buffer, buffer.length],
    );
    return;
  }

  const targetPath = path.resolve(opts.uploadsDir, filename);
  if (!targetPath.startsWith(opts.uploadsDir + path.sep)) {
    throw new Error('Invalid upload destination.');
  }
  fs.writeFileSync(targetPath, buffer);
}

export async function getMediaFile(
  filename: string,
): Promise<{mimeType: string; data: Buffer} | null> {
  if (!SAFE_UPLOAD_NAME_RE.test(filename)) {
    return null;
  }

  if (activeMode === 'postgres' && pool) {
    try {
      const result = await pool.query<{mime_type: string; data: Buffer}>(
        `SELECT mime_type, data FROM media_files WHERE filename = $1 LIMIT 1`,
        [filename],
      );
      if (result.rows.length > 0 && result.rows[0]?.data) {
        return {
          mimeType: result.rows[0].mime_type,
          data: result.rows[0].data,
        };
      }
    } catch (err) {
      console.error('Failed to read media file from PostgreSQL:', err);
    }
  }

  const opts = storageOpts;
  if (!opts) return null;
  const resolved = path.resolve(opts.uploadsDir, filename);
  if (!resolved.startsWith(opts.uploadsDir + path.sep)) {
    return null;
  }
  if (!fs.existsSync(resolved)) {
    return null;
  }
  const ext = path.extname(filename).toLowerCase();
  const mimeType = EXT_TO_MIME[ext];
  if (!mimeType) return null;
  return {
    mimeType,
    data: fs.readFileSync(resolved),
  };
}

function cleanupExpiredMemorySessions(): void {
  const now = Date.now();
  for (const [token, expiresAt] of memorySessions.entries()) {
    if (expiresAt <= now) {
      memorySessions.delete(token);
    }
  }
}

export async function createAdminSession(): Promise<string> {
  cleanupExpiredMemorySessions();
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAtMs = Date.now() + SESSION_TTL_MS;
  memorySessions.set(token, expiresAtMs);

  if (activeMode === 'postgres' && pool) {
    await pool.query(
      `INSERT INTO admin_sessions (token, expires_at)
       VALUES ($1, $2)
       ON CONFLICT (token) DO UPDATE SET expires_at = EXCLUDED.expires_at`,
      [token, new Date(expiresAtMs).toISOString()],
    );
  }
  return token;
}

export async function validateAdminSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  cleanupExpiredMemorySessions();

  const cachedExpiry = memorySessions.get(token);
  if (cachedExpiry && cachedExpiry > Date.now()) {
    return true;
  }

  if (activeMode === 'postgres' && pool) {
    try {
      const result = await pool.query<{expires_at: Date | string}>(
        `SELECT expires_at FROM admin_sessions WHERE token = $1 AND expires_at > NOW() LIMIT 1`,
        [token],
      );
      if (result.rows.length > 0) {
        const expMs = new Date(result.rows[0].expires_at).getTime();
        if (expMs > Date.now()) {
          memorySessions.set(token, expMs);
          return true;
        }
      }
    } catch (err) {
      console.error('Failed to verify session in PostgreSQL:', err);
    }
  }

  return false;
}

export async function revokeAdminSession(token: string): Promise<void> {
  memorySessions.delete(token);
  if (activeMode === 'postgres' && pool) {
    try {
      await pool.query(`DELETE FROM admin_sessions WHERE token = $1`, [token]);
    } catch (err) {
      console.error('Failed to delete session in PostgreSQL:', err);
    }
  }
}
