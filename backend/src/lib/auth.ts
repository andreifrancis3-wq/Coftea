import type { Role } from './constants.js';
import { getCookie, sendError, type ApiRequest, type ApiResponse } from './http.js';
import { getUserById, publicUser } from './users.js';
import { readSessionToken, sessionCookieName } from './session.js';

export async function requireAuth(req: ApiRequest, res: ApiResponse, roles?: Role[]) {
  const token = getCookie(req, sessionCookieName());
  const session = readSessionToken(token);

  if (!session) {
    sendError(res, 401, 'Authentication required.');
    return null;
  }

  const user = await getUserById(session.userId);
  if (!user || !user.is_active) {
    sendError(res, 401, 'Session expired.');
    return null;
  }

  if (roles && !roles.includes(user.role)) {
    sendError(res, 403, 'You do not have permission for this action.');
    return null;
  }

  return {
    session,
    user,
    publicUser: publicUser(user),
  };
}
