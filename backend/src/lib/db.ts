import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

function requiredEnv(name: string, fallback = ''): string {
  const value = process.env[name] ?? fallback;
  if (!value && fallback === '') {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function getPool(): mysql.Pool {
  if (pool) {
    return pool;
  }

  pool = mysql.createPool({
    host: requiredEnv('COFTEA_DB_HOST', '127.0.0.1'),
    port: Number(process.env.COFTEA_DB_PORT ?? 3306),
    database: requiredEnv('COFTEA_DB_NAME', 'coftea_db'),
    user: requiredEnv('COFTEA_DB_USER', 'root'),
    password: process.env.COFTEA_DB_PASSWORD ?? '',
    connectionLimit: 10,
    namedPlaceholders: true,
  });

  return pool;
}

export async function query<T>(sql: string, params?: Record<string, unknown> | unknown[]) {
  const [rows] = await getPool().query(sql, params);
  return rows as T;
}

export async function execute(sql: string, params?: Record<string, unknown> | unknown[]) {
  const [result] = await getPool().execute(sql, params);
  return result;
}
