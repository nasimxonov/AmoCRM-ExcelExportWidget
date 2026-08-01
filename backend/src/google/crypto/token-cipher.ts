import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { AppConfig } from '../../config/configuration';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

/**
 * Encrypts Google OAuth refresh/access tokens at rest. Unlike
 * AMOCRM_LONG_LIVED_TOKEN (an env-only secret), Google tokens are per-user
 * secrets stored in the database, so they're encrypted with an app-level key
 * (GOOGLE_TOKEN_ENCRYPTION_KEY) rather than stored in plaintext.
 */
@Injectable()
export class TokenCipher {
  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  private get key(): Buffer {
    return Buffer.from(this.configService.get('google', { infer: true }).tokenEncryptionKey, 'hex');
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
  }

  decrypt(ciphertext: string): string {
    const [ivHex, authTagHex, dataHex] = ciphertext.split(':');
    const decipher = createDecipheriv(ALGORITHM, this.key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8');
  }
}
