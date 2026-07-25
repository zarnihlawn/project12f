import dns from 'node:dns';
import { building } from '$app/env';
import { DATABASE_URL } from '$app/env/private';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

/** Prefer IPv4 — many networks advertise Neon AAAA records but cannot route IPv6. */
dns.setDefaultResultOrder('ipv4first');

type Db = ReturnType<typeof createDb>;

function normalizeDatabaseUrl(url: string) {
	// channel_binding can break some clients; sslmode=require is enough for Neon.
	return url.replace(/[&?]channel_binding=require/gi, '');
}

function createDb() {
	if (!DATABASE_URL) {
		throw new Error('DATABASE_URL is not set');
	}

	const pool = new pg.Pool({
		connectionString: normalizeDatabaseUrl(DATABASE_URL),
		max: 10,
		idleTimeoutMillis: 20_000,
		connectionTimeoutMillis: 15_000,
		ssl: { rejectUnauthorized: true }
	});

	pool.on('error', (err) => {
		console.error('[db] unexpected pool error', err);
	});

	return drizzle(pool, { schema });
}

/**
 * During `vite build` analysis env may be unset — export a stub so module init does not fail.
 * Real connections only happen at runtime.
 */
export const db: Db = building
	? (new Proxy({} as Db, {
			get(_t, prop) {
				if (prop === 'then') return undefined;
				throw new Error('Database is unavailable during build');
			}
		}) as Db)
	: createDb();
