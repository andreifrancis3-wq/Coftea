import { createSessionToken, authCookie, clearAuthCookie } from '../lib/session.js';
import { allowMethods, parseJsonBody, sendError, type ApiRequest, type ApiResponse } from '../lib/http.js';
import { authenticateUser, createCustomer, getUserById, publicUser } from '../lib/users.js';
import { getCookie } from '../lib/http.js';
import { readSessionToken, sessionCookieName } from '../lib/session.js';

export async function loginHandler(req: ApiRequest, res: ApiResponse) {
  if (!allowMethods(req, res, ['POST'])) {
    return;
  }

  const body = parseJsonBody<{ username?: string; password?: string }>(req.body);
  if (!body.username || !body.password) {
    sendError(res, 400, 'Username and password are required.');
    return;
  }

  const user = await authenticateUser(body.username, body.password);
  if (!user) {
    sendError(res, 401, 'Invalid username or password.');
    return;
  }

  res.setHeader('Set-Cookie', authCookie(createSessionToken(user.id, user.username, user.role)));
  res.status(200).json({ success: true, user: publicUser(user) });
}

export async function registerHandler(req: ApiRequest, res: ApiResponse) {
  if (!allowMethods(req, res, ['POST'])) {
    return;
  }

  const body = parseJsonBody<{ username?: string; password?: string }>(req.body);
  if (!body.username || !body.password) {
    sendError(res, 400, 'Username and password are required.');
    return;
  }

  try {
    const user = await createCustomer(body.username, body.password);
    if (!user) {
      throw new Error('Account creation failed.');
    }

    res.setHeader('Set-Cookie', authCookie(createSessionToken(user.id, user.username, user.role)));
    res.status(201).json({ success: true, user: publicUser(user) });
  } catch (error) {
    sendError(res, 400, error instanceof Error ? error.message : 'Unable to register.');
  }
}

export async function logoutHandler(req: ApiRequest, res: ApiResponse) {
  if (!allowMethods(req, res, ['POST'])) {
    return;
  }

  res.setHeader('Set-Cookie', clearAuthCookie());
  res.status(200).json({ success: true });
}

export async function meHandler(req: ApiRequest, res: ApiResponse) {
  if (!allowMethods(req, res, ['GET'])) {
    return;
  }

  const token = getCookie(req, sessionCookieName());
  const session = readSessionToken(token);
  if (!session) {
    res.status(200).json({ success: true, user: null });
    return;
  }

  const user = await getUserById(session.userId);
  res.status(200).json({ success: true, user: user ? publicUser(user) : null });
}
