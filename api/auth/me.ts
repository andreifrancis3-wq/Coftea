import { meHandler } from '../../backend/src/api/auth.js';

export default async function handler(req: any, res: any) {
  await meHandler(req, res);
}
