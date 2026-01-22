import crypto from 'crypto';
import { config } from '../config/env.js';

/**
 * Encryption utility for sensitive data like grid passwords
 */
export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private secretKey: Buffer;

  constructor() {
    // Use ENCRYPTION_SECRET from config (defaults to 'pzero' if not set)
    const secret = config.ENCRYPTION_SECRET;
    
    // Ensure the secret is 32 bytes for AES-256
    this.secretKey = crypto.createHash('sha256')
      .update(String(secret))
      .digest();
  }

  /**
   * Encrypt data
   */
  encrypt(data: any): { encrypted: string; iv: string; authTag: string } {
    try {
      // Convert data to JSON string
      const text = typeof data === 'string' ? data : JSON.stringify(data);
      
      // Generate a random initialization vector
      const iv = crypto.randomBytes(16);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv) as crypto.CipherGCM;
      
      // Encrypt the data
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get the authentication tag
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data
   */
  decrypt(encryptedData: { encrypted: string; iv: string; authTag: string }): any {
    try {
      // Create decipher
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.secretKey,
        Buffer.from(encryptedData.iv, 'hex')
      ) as crypto.DecipherGCM;
      
      // Set the authentication tag
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
      
      // Decrypt the data
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      // Try to parse as JSON, otherwise return as string
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt grid specifically
   */
  encryptGrid(grid: number[][]): { encrypted: string; iv: string; authTag: string } {
    const encryptedData = this.encrypt(grid);
    // Return the encryption object directly (will be stored as JSONB)
    return encryptedData;
  }

  /**
   * Decrypt grid specifically
   */
  decryptGrid(encryptedGrid: string): number[][] {
    try {
      const encryptedData = JSON.parse(encryptedGrid);
      return this.decrypt(encryptedData);
    } catch (error) {
      console.error('Failed to decrypt grid:', error);
      throw new Error('Invalid encrypted grid data');
    }
  }
}

export const encryptionService = new EncryptionService();