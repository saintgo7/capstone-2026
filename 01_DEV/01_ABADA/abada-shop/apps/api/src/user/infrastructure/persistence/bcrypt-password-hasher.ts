import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { PasswordHasher } from '../../application/port/password-hasher.js';

const scryptAsync = promisify(scrypt);
const KEY_LEN = 64;

// scrypt-based password hasher using Node.js built-in crypto (no extra deps)
// Hash format: scrypt:<salt_hex>:<hash_hex>
export class SimplePasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = (await scryptAsync(plain, salt, KEY_LEN)) as Buffer;
    return `scrypt:${salt}:${derivedKey.toString('hex')}`;
  }

  async verify(plain: string, storedHash: string): Promise<boolean> {
    if (storedHash.startsWith('sha256:')) {
      // Legacy SHA256 hashes are no longer valid - requires password reset
      return false;
    }
    const parts = storedHash.split(':');
    if (parts.length !== 3 || parts[0] !== 'scrypt') {
      return false;
    }
    const [, salt, hashHex] = parts;
    const storedBuf = Buffer.from(hashHex!, 'hex');
    const derivedKey = (await scryptAsync(plain, salt!, KEY_LEN)) as Buffer;
    if (derivedKey.length !== storedBuf.length) return false;
    return timingSafeEqual(derivedKey, storedBuf);
  }
}
