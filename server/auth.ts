import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';

const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
    ? process.env.SESSION_SECRET
    : crypto.randomBytes(32).toString('hex');

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export interface TokenPayload {
  userId: number;
  role: 'member' | 'admin';
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  authUser?: {
    userId: number;
    role: 'member' | 'admin';
  };
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export function verifyEnvPasscode(candidate: string, expected: string): boolean {
  const a = Buffer.from(candidate, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function createSessionToken(userId: number, role: 'member' | 'admin'): string {
  const payload: TokenPayload = {
    userId,
    role,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string): TokenPayload | null {
  try {
    const [encoded, sig] = token.split('.');
    if (!encoded || !sig) return null;
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
    const a = Buffer.from(sig, 'utf8');
    const b = Buffer.from(expectedSig, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as TokenPayload;
    if (!decoded.userId || !decoded.role || !decoded.exp || decoded.exp < Date.now()) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (token) {
    const payload = verifySessionToken(token);
    if (payload) {
      req.authUser = { userId: payload.userId, role: payload.role };
    }
  }
  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Silakan masuk terlebih dahulu untuk mengakses fitur ini.' });
  }
  const payload = verifySessionToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Sesi Anda telah berakhir atau tidak valid. Silakan masuk kembali.' });
  }
  req.authUser = { userId: payload.userId, role: payload.role };
  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Autentikasi admin diperlukan.' });
  }
  const payload = verifySessionToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Sesi admin tidak valid atau telah berakhir.' });
  }
  if (payload.role !== 'admin') {
    return res.status(403).json({ error: 'Akses ditolak. Halaman ini khusus untuk pustakawan atau admin.' });
  }
  req.authUser = { userId: payload.userId, role: payload.role };
  next();
}
