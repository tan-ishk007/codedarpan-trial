import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashPassword(password: string, salt = randomBytes(16).toString('hex')) {
  return { salt, hash: scryptSync(password, salt, 64).toString('hex') };
}
export function verifyPassword(password: string, salt: string, hash: string): boolean {
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export function issueToken(userId: string, secret: string, now = Date.now(), ttlMs = 12 * 60 * 60 * 1000): string {
  const payload = Buffer.from(`${userId}\n${Math.floor((now + ttlMs) / 1000)}`).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}
export function verifyToken(token: string, secret: string, now = Date.now()): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const expected = createHmac('sha256', secret).update(parts[0]).digest();
  let supplied: Buffer;
  try { supplied = Buffer.from(parts[1], 'base64url'); } catch { return null; }
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    const [userId, expires] = Buffer.from(parts[0], 'base64url').toString().split('\n');
    if (!userId || !/^\d+$/.test(expires || '') || Number(expires) * 1000 <= now) return null;
    return userId;
  } catch { return null; }
}
