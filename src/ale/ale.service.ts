import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class AleService {
  private privateKey: string;
  public publicKey: string;

  constructor() {
    const keys = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    this.publicKey = keys.publicKey;
    this.privateKey = keys.privateKey;
  }

  decryptSessionKey(encryptedKeyBase64: string): Buffer {
    return crypto.privateDecrypt(
      {
        key: this.privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      },
      Buffer.from(encryptedKeyBase64, 'base64'),
    );
  }

  decryptPayload(
    encryptedPayloadBase64: string,
    aesKey: Buffer,
    ivBase64: string,
  ): any {
    try {
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        aesKey,
        Buffer.from(ivBase64, 'base64'),
      );

      let decrypted = decipher.update(encryptedPayloadBase64, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error: any) {
      console.error('AES Decryption Error:', error.message);
      // Re-throw so the interceptor catches it
      throw error;
    }
  }

  encryptPayload(payload: any, aesKey: Buffer, ivBase64: string): string {
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      aesKey,
      Buffer.from(ivBase64, 'base64'),
    );
    let encrypted = cipher.update(JSON.stringify(payload), 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
  }
}
