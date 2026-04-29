export type ApiRequest = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
  headers?: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string>;
};

export type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  end: (body?: string) => void;
  setHeader: (name: string, value: string | string[]) => void;
};

export function parseJsonBody<T>(body: unknown): T {
  if (typeof body === 'string') {
    return JSON.parse(body) as T;
  }
  return (body ?? {}) as T;
}

export function getCookie(req: ApiRequest, name: string): string | null {
  if (req.cookies?.[name]) {
    return req.cookies[name] ?? null;
  }

  const cookieHeader = req.headers?.cookie;
  const raw = Array.isArray(cookieHeader) ? cookieHeader.join('; ') : cookieHeader;
  if (!raw) {
    return null;
  }

  const match = raw
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export function sendError(res: ApiResponse, code: number, message: string) {
  res.status(code).json({ success: false, message });
}

export function allowMethods(req: ApiRequest, res: ApiResponse, methods: string[]): boolean {
  if (req.method && methods.includes(req.method)) {
    return true;
  }
  res.setHeader('Allow', methods);
  sendError(res, 405, 'Method not allowed.');
  return false;
}
