import crypto from 'crypto';

// Encryption key from environment variable
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';
const IV_LENGTH = 16; // For AES, this is always 16

export function encrypt(text: string): string {
  if (!text) return '';
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc', 
    Buffer.from(ENCRYPTION_KEY), 
    iv
  );
  
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
  if (!text) return '';
  
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift() || '', 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString();
} 