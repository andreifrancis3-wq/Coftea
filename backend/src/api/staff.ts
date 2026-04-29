import { requireAuth } from '../lib/auth.js';
import { allowMethods, parseJsonBody, sendError, type ApiRequest, type ApiResponse } from '../lib/http.js';
import {
  createStaffAccount,
  listStaffAccounts,
  removeStaffAccount,
  updateStaffPassword,
} from '../lib/users.js';

export async function staffHandler(req: ApiRequest, res: ApiResponse) {
  if (!allowMethods(req, res, ['GET', 'POST', 'PATCH', 'DELETE'])) {
    return;
  }

  const auth = await requireAuth(req, res, ['admin']);
  if (!auth) {
    return;
  }

  if (req.method === 'GET') {
    const staff = await listStaffAccounts();
    res.status(200).json({ success: true, staff });
    return;
  }

  const body = parseJsonBody<{ id?: number; username?: string; password?: string }>(req.body);

  try {
    if (req.method === 'POST') {
      if (!body.username || !body.password) {
        sendError(res, 400, 'Username and password are required.');
        return;
      }
      const staff = await createStaffAccount(body.username, body.password);
      res.status(201).json({ success: true, staff });
      return;
    }

    if (!body.id) {
      sendError(res, 400, 'Staff user id is required.');
      return;
    }

    if (req.method === 'PATCH') {
      if (!body.password) {
        sendError(res, 400, 'A new password is required.');
        return;
      }
      await updateStaffPassword(Number(body.id), body.password);
      res.status(200).json({ success: true });
      return;
    }

    await removeStaffAccount(Number(body.id));
    res.status(200).json({ success: true });
  } catch (error) {
    sendError(res, 400, error instanceof Error ? error.message : 'Unable to manage staff account.');
  }
}
