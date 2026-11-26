import crypto from 'crypto';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  type AuthenticatedRequest,
  createSessionToken,
  hashPassword,
  optionalAuth,
  requireAdmin,
  requireAuth,
  verifyEnvPasscode,
  verifyPassword,
} from './server/auth';
import db, { mapCollectionRow, mapUserRow, UPLOAD_PATHS } from './server/db';
import { parseEpubChapters } from './server/epub';
import type { CollectionItem, CollectionType, SiteSettings } from './src/types';

dotenv.config();

const PORT = 3000;
const app = express();

app.use(express.json({ limit: '10mb' }));

// Serve uploaded media safely with nosniff header
app.use(
  '/uploads',
  (_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  },
  express.static(UPLOAD_PATHS.root)
);

function isValidSafeUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('/src/assets/')) {
    return !trimmed.includes('..');
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host === '169.254.169.254' ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

const ALLOWED_UPLOAD_RULES: Record<
  string,
  { dir: string; exts: string[]; mimes: string[]; urlPrefix: string }
> = {
  cover: {
    dir: UPLOAD_PATHS.covers,
    exts: ['.jpg', '.jpeg', '.png', '.webp'],
    mimes: ['image/jpeg', 'image/png', 'image/webp'],
    urlPrefix: '/uploads/covers/',
  },
  document: {
    dir: UPLOAD_PATHS.documents,
    exts: ['.pdf', '.epub'],
    mimes: ['application/pdf', 'application/epub+zip', 'application/octet-stream'],
    urlPrefix: '/uploads/documents/',
  },
  audio: {
    dir: UPLOAD_PATHS.audio,
    exts: ['.mp3', '.wav', '.ogg', '.m4a'],
    mimes: ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'],
    urlPrefix: '/uploads/audio/',
  },
  video: {
    dir: UPLOAD_PATHS.videos,
    exts: ['.mp4', '.webm', '.ogv'],
    mimes: ['video/mp4', 'video/webm', 'video/ogg'],
    urlPrefix: '/uploads/videos/',
  },
};

const uploadStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const category = String(req.body?.category || req.query?.category || 'cover');
    const rule = ALLOWED_UPLOAD_RULES[category] || ALLOWED_UPLOAD_RULES.cover;
    cb(null, rule.dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = /^[.a-z0-9]{1,8}$/.test(ext) ? ext : '';
    cb(null, `${crypto.randomUUID()}${safeExt}`);
  },
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const category = String(req.body?.category || req.query?.category || 'cover');
    const rule = ALLOWED_UPLOAD_RULES[category];
    if (!rule) {
      return cb(new Error('Kategori unggahan tidak dikenali.'));
    }
    const ext = path.extname(file.originalname).toLowerCase();
    if (!rule.exts.includes(ext)) {
      return cb(new Error(`Format file tidak didukung untuk kategori ${category}.`));
    }
    cb(null, true);
  },
});

// ========================
// AUTH ROUTES
// ========================

app.get('/api/auth/admin/status', (_req, res) => {
  const row = db.prepare("SELECT COUNT(*) as total FROM users WHERE role = 'admin'").get() as { total: number };
  const envPasscode = (process.env.ADMIN_PASSCODE || '').trim();
  res.json({
    hasClaimedAdmin: row.total > 0,
    hasEnvPasscode: envPasscode.length > 0,
  });
});

app.post('/api/auth/admin/claim', (req, res) => {
  const envPasscode = (process.env.ADMIN_PASSCODE || '').trim();
  if (envPasscode.length > 0) {
    return res.status(403).json({
      error: 'Akses admin dikelola melalui ADMIN_PASSCODE pada konfigurasi server.',
    });
  }

  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (name.length < 2 || !email.includes('@') || password.length < 8) {
    return res.status(400).json({
      error: 'Masukkan nama lengkap, email valid, dan kata sandi minimal 8 karakter.',
    });
  }

  const claimTx = db.transaction(() => {
    const existingAdmin = db
      .prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
      .get();
    if (existingAdmin) {
      throw new Error('ADMIN_ALREADY_CLAIMED');
    }

    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as
      | { id: number }
      | undefined;
    const pwHash = hashPassword(password);

    let userId: number;
    if (existingEmail) {
      db.prepare(
        "UPDATE users SET name = ?, password_hash = ?, role = 'admin', status = 'active' WHERE id = ?"
      ).run(name, pwHash, existingEmail.id);
      userId = existingEmail.id;
    } else {
      const info = db
        .prepare(
          "INSERT INTO users (name, email, password_hash, role, status, bio) VALUES (?, ?, ?, 'admin', 'active', 'Pustakawan Utama Perpustakaan Rona Rasa')"
        )
        .run(name, email, pwHash);
      userId = Number(info.lastInsertRowid);
    }

    return db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown>;
  });

  try {
    const row = claimTx();
    const user = mapUserRow(row);
    const token = createSessionToken(user.id, 'admin');
    res.status(201).json({ user, token });
  } catch (err) {
    if (err instanceof Error && err.message === 'ADMIN_ALREADY_CLAIMED') {
      return res.status(409).json({ error: 'Akun pustakawan utama sudah diklaim sebelumnya.' });
    }
    res.status(500).json({ error: 'Gagal menyiapkan akun admin.' });
  }
});

app.post('/api/auth/admin/login', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const envPasscode = (process.env.ADMIN_PASSCODE || '').trim();

  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan kata sandi admin wajib diisi.' });
  }

  if (envPasscode.length > 0 && verifyEnvPasscode(password, envPasscode)) {
    let row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as
      | Record<string, unknown>
      | undefined;
    if (!row) {
      const pwHash = hashPassword(crypto.randomBytes(24).toString('hex'));
      const info = db
        .prepare(
          "INSERT INTO users (name, email, password_hash, role, status, bio) VALUES (?, ?, ?, 'admin', 'active', 'Pustakawan Perpustakaan Rona Rasa')"
        )
        .run(email.split('@')[0] || 'Pustakawan', email, pwHash);
      row = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid) as Record<
        string,
        unknown
      >;
    } else if (row.role !== 'admin') {
      db.prepare("UPDATE users SET role = 'admin', status = 'active' WHERE id = ?").run(row.id);
      row = db.prepare('SELECT * FROM users WHERE id = ?').get(row.id) as Record<string, unknown>;
    }
    const user = mapUserRow(row);
    const token = createSessionToken(user.id, 'admin');
    return res.json({ user, token });
  }

  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as
    | Record<string, unknown>
    | undefined;
  if (!row || row.role !== 'admin' || !verifyPassword(password, String(row.password_hash))) {
    return res.status(401).json({ error: 'Email atau kata sandi pustakawan tidak sesuai.' });
  }
  if (row.status === 'suspended') {
    return res.status(403).json({ error: 'Akun pustakawan ini sedang dinonaktifkan.' });
  }

  const user = mapUserRow(row);
  const token = createSessionToken(user.id, 'admin');
  res.json({ user, token });
});

app.post('/api/auth/register', (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const readingInterest = String(req.body?.readingInterest || '').trim();

  if (name.length < 2) {
    return res.status(400).json({ error: 'Nama lengkap minimal 2 karakter.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Format alamat email tidak valid.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Alamat email ini sudah terdaftar.' });
  }

  const pwHash = hashPassword(password);
  const info = db
    .prepare(
      "INSERT INTO users (name, email, password_hash, role, status, reading_interest) VALUES (?, ?, ?, 'member', 'active', ?)"
    )
    .run(name, email, pwHash, readingInterest);

  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid) as Record<
    string,
    unknown
  >;
  const user = mapUserRow(row);
  const token = createSessionToken(user.id, 'member');
  res.status(201).json({ user, token });
});

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });
  }

  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as
    | Record<string, unknown>
    | undefined;
  if (!row || !verifyPassword(password, String(row.password_hash))) {
    return res.status(401).json({ error: 'Email atau kata sandi salah.' });
  }
  if (row.status === 'suspended') {
    return res.status(403).json({ error: 'Akun Anda sedang dinonaktifkan oleh pustakawan.' });
  }

  const user = mapUserRow(row);
  const token = createSessionToken(user.id, user.role);
  res.json({ user, token });
});

app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.authUser!.userId) as
    | Record<string, unknown>
    | undefined;
  if (!row || row.status === 'suspended') {
    return res.status(401).json({ error: 'Akun tidak ditemukan atau dinonaktifkan.' });
  }
  res.json({ user: mapUserRow(row) });
});

// ========================
// PUBLIC SITE & COLLECTIONS
// ========================

app.get('/api/site-settings', (_req, res) => {
  const row = db.prepare('SELECT data_json, updated_at FROM site_settings WHERE id = 1').get() as
    | { data_json: string; updated_at: string }
    | undefined;
  if (!row) {
    return res.status(404).json({ error: 'Pengaturan situs tidak ditemukan.' });
  }
  const parsed = JSON.parse(row.data_json) as SiteSettings;
  res.json({ ...parsed, updatedAt: row.updated_at });
});

app.get('/api/collections', optionalAuth, (req, res) => {
  const type = String(req.query.type || '').trim();
  const q = String(req.query.q || '').trim().toLowerCase();
  const genre = String(req.query.genre || '').trim();
  const subCategory = String(req.query.subCategory || '').trim();
  const year = String(req.query.year || '').trim();
  const featured = String(req.query.featured || '').trim();
  const sort = String(req.query.sort || 'newest').trim();

  const clauses: string[] = [];
  const params: Array<string | number> = [];

  if (type && ['book', 'poem', 'film', 'album'].includes(type)) {
    clauses.push('type = ?');
    params.push(type);
  }
  if (genre) {
    clauses.push('LOWER(genre) = LOWER(?)');
    params.push(genre);
  }
  if (subCategory) {
    clauses.push('LOWER(sub_category) = LOWER(?)');
    params.push(subCategory);
  }
  if (year && /^\d+$/.test(year)) {
    clauses.push('year = ?');
    params.push(Number(year));
  }
  if (featured === '1' || featured === 'true') {
    clauses.push('is_featured = 1');
  }
  if (q) {
    clauses.push(
      '(LOWER(title) LIKE ? OR LOWER(creator) LIKE ? OR LOWER(genre) LIKE ? OR LOWER(sub_category) LIKE ? OR LOWER(description) LIKE ? OR CAST(year AS TEXT) LIKE ?)'
    );
    const like = `%${q}%`;
    params.push(like, like, like, like, like, like);
  }

  let orderBy = 'created_at DESC, id DESC';
  if (sort === 'title') orderBy = 'title COLLATE NOCASE ASC';
  if (sort === 'year_desc') orderBy = 'year DESC, title COLLATE NOCASE ASC';
  if (sort === 'year_asc') orderBy = 'year ASC, title COLLATE NOCASE ASC';

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db
    .prepare(`SELECT * FROM collections ${whereSql} ORDER BY ${orderBy}`)
    .all(...params) as Array<Record<string, unknown>>;

  const items = rows.map(mapCollectionRow);
  res.json({ items });
});

app.get('/api/collections/:id', optionalAuth, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID koleksi tidak valid.' });
  }
  const row = db.prepare('SELECT * FROM collections WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  if (!row) {
    return res.status(404).json({ error: 'Koleksi tidak ditemukan.' });
  }
  const item = mapCollectionRow(row);
  if (item.accessStatus === 'Khusus Anggota' && !req.authUser) {
    return res.status(403).json({
      error: 'Koleksi ini khusus untuk anggota Perpustakaan Rona Rasa. Silakan masuk terlebih dahulu.',
      requiresAuth: true,
      preview: {
        id: item.id,
        type: item.type,
        title: item.title,
        creator: item.creator,
        year: item.year,
        genre: item.genre,
        subCategory: item.subCategory,
        description: item.description,
        coverUrl: item.coverUrl,
        accessStatus: item.accessStatus,
      },
    });
  }
  res.json({ item });
});

// ========================
// MEMBER PROFILE, BOOKMARKS & READING HISTORY
// ========================

app.put('/api/user/profile', requireAuth, (req: AuthenticatedRequest, res) => {
  const name = String(req.body?.name || '').trim();
  const bio = String(req.body?.bio || '').trim();
  const readingInterest = String(req.body?.readingInterest || '').trim();

  if (name.length < 2) {
    return res.status(400).json({ error: 'Nama minimal 2 karakter.' });
  }

  db.prepare('UPDATE users SET name = ?, bio = ?, reading_interest = ? WHERE id = ?').run(
    name,
    bio,
    readingInterest,
    req.authUser!.userId
  );

  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.authUser!.userId) as Record<
    string,
    unknown
  >;
  res.json({ user: mapUserRow(row) });
});

app.get('/api/user/bookmarks', requireAuth, (req: AuthenticatedRequest, res) => {
  const rows = db
    .prepare(
      `SELECT b.id as b_id, b.user_id, b.collection_id, b.note, b.page_number, b.created_at as b_created_at,
              c.*
       FROM bookmarks b
       JOIN collections c ON c.id = b.collection_id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`
    )
    .all(req.authUser!.userId) as Array<Record<string, unknown>>;

  const bookmarks = rows.map((r) => ({
    id: Number(r.b_id),
    userId: Number(r.user_id),
    collectionId: Number(r.collection_id),
    note: String(r.note || ''),
    pageNumber: Number(r.page_number || 1),
    createdAt: String(r.b_created_at),
    collection: mapCollectionRow(r),
  }));

  res.json({ bookmarks });
});

app.post('/api/user/bookmarks', requireAuth, (req: AuthenticatedRequest, res) => {
  const collectionId = Number(req.body?.collectionId);
  const note = String(req.body?.note || '').trim();
  const pageNumber = Math.max(1, Number(req.body?.pageNumber || 1));

  if (!Number.isInteger(collectionId) || collectionId <= 0) {
    return res.status(400).json({ error: 'ID koleksi tidak valid.' });
  }

  const col = db.prepare('SELECT id FROM collections WHERE id = ?').get(collectionId);
  if (!col) {
    return res.status(404).json({ error: 'Koleksi tidak ditemukan.' });
  }

  db.prepare(
    `INSERT INTO bookmarks (user_id, collection_id, note, page_number)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, collection_id)
     DO UPDATE SET note = excluded.note, page_number = excluded.page_number, created_at = datetime('now')`
  ).run(req.authUser!.userId, collectionId, note, pageNumber);

  res.status(201).json({ saved: true });
});

app.delete('/api/user/bookmarks/:collectionId', requireAuth, (req: AuthenticatedRequest, res) => {
  const collectionId = Number(req.params.collectionId);
  db.prepare('DELETE FROM bookmarks WHERE user_id = ? AND collection_id = ?').run(
    req.authUser!.userId,
    collectionId
  );
  res.json({ removed: true });
});

app.get('/api/user/reading-history', requireAuth, (req: AuthenticatedRequest, res) => {
  const rows = db
    .prepare(
      `SELECT h.id as h_id, h.user_id, h.collection_id, h.current_page, h.total_pages, h.chapter_index,
              h.progress_percent, h.last_read_at, c.*
       FROM reading_history h
       JOIN collections c ON c.id = h.collection_id
       WHERE h.user_id = ?
       ORDER BY h.last_read_at DESC`
    )
    .all(req.authUser!.userId) as Array<Record<string, unknown>>;

  const history = rows.map((r) => ({
    id: Number(r.h_id),
    userId: Number(r.user_id),
    collectionId: Number(r.collection_id),
    currentPage: Number(r.current_page),
    totalPages: Number(r.total_pages),
    chapterIndex: Number(r.chapter_index),
    progressPercent: Number(r.progress_percent),
    lastReadAt: String(r.last_read_at),
    collection: mapCollectionRow(r),
  }));

  res.json({ history });
});

app.post('/api/user/reading-history', requireAuth, (req: AuthenticatedRequest, res) => {
  const collectionId = Number(req.body?.collectionId);
  const currentPage = Math.max(1, Number(req.body?.currentPage || 1));
  const totalPages = Math.max(1, Number(req.body?.totalPages || 1));
  const chapterIndex = Math.max(0, Number(req.body?.chapterIndex || 0));
  const progressPercent = Math.min(100, Math.max(0, Math.round((currentPage / totalPages) * 100)));

  if (!Number.isInteger(collectionId) || collectionId <= 0) {
    return res.status(400).json({ error: 'ID koleksi tidak valid.' });
  }

  db.prepare(
    `INSERT INTO reading_history (user_id, collection_id, current_page, total_pages, chapter_index, progress_percent, last_read_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, collection_id)
     DO UPDATE SET current_page = excluded.current_page,
                   total_pages = excluded.total_pages,
                   chapter_index = excluded.chapter_index,
                   progress_percent = excluded.progress_percent,
                   last_read_at = datetime('now')`
  ).run(req.authUser!.userId, collectionId, currentPage, totalPages, chapterIndex, progressPercent);

  res.json({ saved: true, progressPercent });
});

// ========================
// ADMIN ROUTES (RBAC PROTECTED)
// ========================

app.get('/api/admin/stats', requireAdmin, (_req, res) => {
  const books = (db.prepare("SELECT COUNT(*) as c FROM collections WHERE type = 'book'").get() as { c: number }).c;
  const poems = (db.prepare("SELECT COUNT(*) as c FROM collections WHERE type = 'poem'").get() as { c: number }).c;
  const films = (db.prepare("SELECT COUNT(*) as c FROM collections WHERE type = 'film'").get() as { c: number }).c;
  const albums = (db.prepare("SELECT COUNT(*) as c FROM collections WHERE type = 'album'").get() as { c: number }).c;
  const users = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  const recent = (
    db
      .prepare("SELECT COUNT(*) as c FROM collections WHERE created_at >= datetime('now', '-30 days')")
      .get() as { c: number }
  ).c;

  res.json({
    totalBooks: books,
    totalPoems: poems,
    totalFilms: films,
    totalAlbums: albums,
    totalUsers: users,
    recentlyAddedCount: recent,
  });
});

app.post('/api/admin/upload', requireAdmin, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Gagal mengunggah berkas.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada berkas yang dipilih.' });
    }

    const category = String(req.body?.category || req.query?.category || 'cover');
    const rule = ALLOWED_UPLOAD_RULES[category] || ALLOWED_UPLOAD_RULES.cover;
    const fileUrl = `${rule.urlPrefix}${req.file.filename}`;
    const ext = path.extname(req.file.filename).toLowerCase();

    if (category === 'document' && ext === '.epub') {
      const resolvedPath = path.resolve(rule.dir, req.file.filename);
      if (resolvedPath.startsWith(UPLOAD_PATHS.documents + path.sep)) {
        const chapters = await parseEpubChapters(resolvedPath);
        return res.status(201).json({
          url: fileUrl,
          filename: req.file.originalname,
          format: 'EPUB',
          extractedChapters: chapters,
        });
      }
    }

    res.status(201).json({
      url: fileUrl,
      filename: req.file.originalname,
      format: ext === '.pdf' ? 'PDF' : ext.replace('.', '').toUpperCase(),
    });
  });
});

app.post('/api/admin/collections', requireAdmin, (req, res) => {
  const body = req.body as Partial<CollectionItem>;
  const type = body.type as CollectionType;
  if (!['book', 'poem', 'film', 'album'].includes(type)) {
    return res.status(400).json({ error: 'Jenis koleksi harus book, poem, film, atau album.' });
  }
  const title = String(body.title || '').trim();
  const creator = String(body.creator || '').trim();
  const year = Number(body.year || new Date().getFullYear());
  const genre = String(body.genre || '').trim();
  const subCategory = String(body.subCategory || '').trim();
  const description = String(body.description || '').trim();
  const coverUrl = String(body.coverUrl || '').trim();
  const fileUrl = String(body.fileUrl || '').trim();
  const mediaUrl = String(body.mediaUrl || '').trim();
  const accessStatus = String(body.accessStatus || 'Tersedia Terbuka');
  const isFeatured = body.isFeatured ? 1 : 0;
  const metadata = body.metadata || {};

  if (!title || !creator || !genre || !description) {
    return res.status(400).json({ error: 'Judul, pencipta/pengarang, genre, dan deskripsi wajib diisi.' });
  }
  if (!isValidSafeUrl(coverUrl) || !isValidSafeUrl(fileUrl) || !isValidSafeUrl(mediaUrl)) {
    return res.status(400).json({ error: 'Tautan media atau sampul tidak valid atau tidak aman.' });
  }

  const info = db
    .prepare(
      `INSERT INTO collections (
        type, title, creator, year, genre, sub_category, description,
        cover_url, file_url, media_url, access_status, is_featured, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      type,
      title,
      creator,
      year,
      genre,
      subCategory,
      description,
      coverUrl,
      fileUrl,
      mediaUrl,
      accessStatus,
      isFeatured,
      JSON.stringify(metadata)
    );

  const row = db.prepare('SELECT * FROM collections WHERE id = ?').get(info.lastInsertRowid) as Record<
    string,
    unknown
  >;
  res.status(201).json({ item: mapCollectionRow(row) });
});

app.put('/api/admin/collections/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM collections WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) {
    return res.status(404).json({ error: 'Koleksi tidak ditemukan.' });
  }

  const body = req.body as Partial<CollectionItem>;
  const type = (body.type || existing.type) as CollectionType;
  const title = String(body.title ?? existing.title).trim();
  const creator = String(body.creator ?? existing.creator).trim();
  const year = Number(body.year ?? existing.year);
  const genre = String(body.genre ?? existing.genre).trim();
  const subCategory = String(body.subCategory ?? existing.sub_category).trim();
  const description = String(body.description ?? existing.description).trim();
  const coverUrl = String(body.coverUrl ?? existing.cover_url).trim();
  const fileUrl = String(body.fileUrl ?? existing.file_url).trim();
  const mediaUrl = String(body.mediaUrl ?? existing.media_url).trim();
  const accessStatus = String(body.accessStatus ?? existing.access_status);
  const isFeatured =
    typeof body.isFeatured === 'boolean' ? (body.isFeatured ? 1 : 0) : Number(existing.is_featured);
  const metadata = body.metadata ?? JSON.parse(String(existing.metadata_json || '{}'));

  if (!isValidSafeUrl(coverUrl) || !isValidSafeUrl(fileUrl) || !isValidSafeUrl(mediaUrl)) {
    return res.status(400).json({ error: 'Tautan media atau sampul tidak valid atau tidak aman.' });
  }

  db.prepare(
    `UPDATE collections
     SET type = ?, title = ?, creator = ?, year = ?, genre = ?, sub_category = ?,
         description = ?, cover_url = ?, file_url = ?, media_url = ?, access_status = ?,
         is_featured = ?, metadata_json = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    type,
    title,
    creator,
    year,
    genre,
    subCategory,
    description,
    coverUrl,
    fileUrl,
    mediaUrl,
    accessStatus,
    isFeatured,
    JSON.stringify(metadata),
    id
  );

  const updated = db.prepare('SELECT * FROM collections WHERE id = ?').get(id) as Record<
    string,
    unknown
  >;
  res.json({ item: mapCollectionRow(updated) });
});

app.delete('/api/admin/collections/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM collections WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) {
    return res.status(404).json({ error: 'Koleksi tidak ditemukan.' });
  }

  // Safely clean up any uploaded file strictly within UPLOAD_PATHS.root
  for (const field of ['cover_url', 'file_url', 'media_url'] as const) {
    const val = String(existing[field] || '');
    if (val.startsWith('/uploads/') && !val.includes('sampel_')) {
      const rel = val.replace(/^\/uploads\//, '');
      const resolved = path.resolve(UPLOAD_PATHS.root, rel);
      if (resolved.startsWith(UPLOAD_PATHS.root + path.sep) && fs.existsSync(resolved)) {
        try {
          fs.unlinkSync(resolved);
        } catch {
          // ignore cleanup failure
        }
      }
    }
  }

  db.prepare('DELETE FROM collections WHERE id = ?').run(id);
  res.json({ deleted: true });
});

app.put('/api/admin/site-settings', requireAdmin, (req, res) => {
  const currentRow = db.prepare('SELECT data_json FROM site_settings WHERE id = 1').get() as
    | { data_json: string }
    | undefined;
  const current = currentRow ? (JSON.parse(currentRow.data_json) as SiteSettings) : ({} as SiteSettings);

  const incoming = req.body as Partial<SiteSettings>;
  if (incoming.heroBannerUrl && !isValidSafeUrl(incoming.heroBannerUrl)) {
    return res.status(400).json({ error: 'URL banner beranda tidak valid.' });
  }
  if (incoming.aboutImageUrl && !isValidSafeUrl(incoming.aboutImageUrl)) {
    return res.status(400).json({ error: 'URL gambar halaman About tidak valid.' });
  }

  const nextSettings: SiteSettings = {
    ...current,
    ...incoming,
    updatedAt: new Date().toISOString(),
  };

  db.prepare("UPDATE site_settings SET data_json = ?, updated_at = datetime('now') WHERE id = 1").run(
    JSON.stringify(nextSettings)
  );

  res.json(nextSettings);
});

app.get('/api/admin/users', requireAdmin, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT u.*, (SELECT COUNT(*) FROM bookmarks b WHERE b.user_id = u.id) as bookmark_count
       FROM users u
       ORDER BY u.created_at DESC`
    )
    .all() as Array<Record<string, unknown>>;

  const users = rows.map((r) => ({
    ...mapUserRow(r),
    bookmarkCount: Number(r.bookmark_count || 0),
  }));

  res.json({ users });
});

app.patch('/api/admin/users/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
  const targetId = Number(req.params.id);
  if (targetId === req.authUser!.userId) {
    return res.status(400).json({
      error: 'Demi keamanan akses, Anda tidak dapat mengubah peran atau status akun Anda sendiri.',
    });
  }

  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId) as
    | Record<string, unknown>
    | undefined;
  if (!existing) {
    return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
  }

  const role = req.body?.role === 'admin' || req.body?.role === 'member' ? req.body.role : existing.role;
  const status =
    req.body?.status === 'active' || req.body?.status === 'suspended' ? req.body.status : existing.status;

  db.prepare('UPDATE users SET role = ?, status = ? WHERE id = ?').run(role, status, targetId);

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId) as Record<
    string,
    unknown
  >;
  res.json({ user: mapUserRow(updated) });
});

// ========================
// VITE / STATIC SERVING
// ========================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Perpustakaan Rona Rasa berjalan di http://localhost:${PORT}`);
  });
}

startServer();
