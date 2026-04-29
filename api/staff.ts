import { staffHandler } from '../backend/src/api/staff.js';

export default async function handler(req: any, res: any) {
  await staffHandler(req, res);
}
