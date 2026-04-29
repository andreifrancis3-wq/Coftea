import { ensureBootstrapped } from './bootstrap.js';
import { execute, query } from './db.js';
import { hashPassword, verifyPassword } from './passwords.js';
import type { Role } from './constants.js';

export type UserRecord = {
  id: number;
  username: string;
  display_name: string;
  password_hash: string;
  role: Role;
  is_active: number;
  created_at: string;
};

export function publicUser(user: UserRecord) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    role: user.role,
    isActive: Boolean(user.is_active),
    createdAt: user.created_at,
  };
}

export async function getUserById(id: number) {
  await ensureBootstrapped();
  const rows = await query<UserRecord[]>('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  return rows[0] ?? null;
}

export async function getUserByUsername(username: string) {
  await ensureBootstrapped();
  const rows = await query<UserRecord[]>('SELECT * FROM users WHERE username = ? LIMIT 1', [
    username.trim().toLowerCase(),
  ]);
  return rows[0] ?? null;
}

export async function authenticateUser(username: string, password: string) {
  const user = await getUserByUsername(username);
  if (!user || !user.is_active) {
    return null;
  }
  return verifyPassword(password, user.password_hash) ? user : null;
}

export async function createCustomer(username: string, password: string) {
  await ensureBootstrapped();
  const normalized = username.trim().toLowerCase();
  if (normalized.length < 3) {
    throw new Error('Username must be at least 3 characters.');
  }
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }
  if (await getUserByUsername(normalized)) {
    throw new Error('That username is already taken.');
  }

  await execute(
    'INSERT INTO users (username, display_name, password_hash, role, is_active) VALUES (?, ?, ?, "customer", 1)',
    [normalized, normalized, hashPassword(password)],
  );
  return getUserByUsername(normalized);
}

export async function listStaffAccounts() {
  await ensureBootstrapped();
  const rows = await query<UserRecord[]>(
    'SELECT * FROM users WHERE role IN ("admin", "staff") ORDER BY FIELD(role, "admin", "staff"), created_at DESC',
  );
  return rows.map(publicUser);
}

export async function createStaffAccount(username: string, password: string) {
  await ensureBootstrapped();
  const normalized = username.trim().toLowerCase();
  if (normalized.length < 3) {
    throw new Error('Username must be at least 3 characters.');
  }
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }
  if (await getUserByUsername(normalized)) {
    throw new Error('That username is already taken.');
  }

  await execute(
    'INSERT INTO users (username, display_name, password_hash, role, is_active) VALUES (?, ?, ?, "staff", 1)',
    [normalized, `Staff ${normalized}`, hashPassword(password)],
  );

  const user = await getUserByUsername(normalized);
  return user ? publicUser(user) : null;
}

export async function updateStaffPassword(userId: number, password: string) {
  await ensureBootstrapped();
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }
  await execute('UPDATE users SET password_hash = ? WHERE id = ? AND role = "staff"', [
    hashPassword(password),
    userId,
  ]);
}

export async function removeStaffAccount(userId: number) {
  await ensureBootstrapped();
  await execute('DELETE FROM users WHERE id = ? AND role = "staff"', [userId]);
}
