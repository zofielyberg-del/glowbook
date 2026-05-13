
import { createHash } from 'crypto';

/**
 * Simple password hashing using SHA-256.
 * For a production system, use bcrypt or argon2.
 * This is sufficient for testing and demo purposes.
 */
const SALT = 'glowbook_salt_2026';

export function hashPassword(password: string): string {
    return createHash('sha256').update(SALT + password).digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
    return hashPassword(password) === hash;
}
