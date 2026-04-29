import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) {
    return false;
  }

  if (/^[a-f0-9]{64}$/i.test(storedHash)) {
    return createHash('sha256').update(password).digest('hex') === storedHash;
  }

  const [scheme, salt, value] = storedHash.split('$');
  if (scheme !== 'scrypt' || !salt || !value) {
    return false;
  }

  const hashed = scryptSync(password, salt, 64);
  const stored = Buffer.from(value, 'hex');
  return hashed.length === stored.length && timingSafeEqual(hashed, stored);
}
