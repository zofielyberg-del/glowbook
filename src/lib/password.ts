import { pbkdf2Sync, randomBytes, createHash } from 'crypto';

const LEGACY_SALT = 'glowbook_salt_2026';
const PBKDF2_ITERATIONS = 100000;
const KEY_LEN = 64;
const DIGEST = 'sha512';

/**
 * Enterprise-grade OWASP PBKDF2-SHA512 password hashing with cryptographically
 * random salt and 100,000 iterations (resistant to GPU/ASIC brute force attacks).
 */
export function hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LEN, DIGEST).toString('hex');
    return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${hash}`;
}

/**
 * Verifies password against PBKDF2 hash, with automatic backwards compatibility
 * for legacy salted SHA-256 hashes so existing users never get locked out.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
    if (!storedHash || !password) return false;

    // 1. Check for PBKDF2 format: pbkdf2$<iterations>$<salt>$<hash>
    if (storedHash.startsWith('pbkdf2$')) {
        const parts = storedHash.split('$');
        if (parts.length === 4) {
            const iterations = parseInt(parts[1], 10);
            const salt = parts[2];
            const originalHash = parts[3];
            const testHash = pbkdf2Sync(password, salt, iterations, KEY_LEN, DIGEST).toString('hex');
            return testHash === originalHash;
        }
    }

    // 2. Backwards compatibility fallback: legacy salted SHA-256
    const legacyTest = createHash('sha256').update(LEGACY_SALT + password).digest('hex');
    return legacyTest === storedHash;
}
