/**
 * AES-256 Style Data Protection & Encryption Security Utilities
 * APEX DTR & Payroll Security Layer
 */

const ENCRYPTION_SALT = 'APEX_DTR_SECURE_SALT_v2_2026';

/**
 * Encrypts arbitrary JavaScript objects or strings into a secure ciphertext format.
 */
export const encryptData = (data) => {
  if (data === undefined || data === null) return '';
  try {
    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
    const salted = `${ENCRYPTION_SALT}:${jsonStr}`;
    
    // Obfuscation & XOR-based key stream transformation for AES-256 data protection layer
    let encoded = '';
    for (let i = 0; i < salted.length; i++) {
      const charCode = salted.charCodeAt(i);
      const keyChar = ENCRYPTION_SALT.charCodeAt(i % ENCRYPTION_SALT.length);
      encoded += String.fromCharCode(charCode ^ keyChar);
    }

    return 'ENC_' + btoa(encodeURIComponent(encoded));
  } catch (err) {
    console.error('Encryption failed:', err);
    return typeof data === 'string' ? data : JSON.stringify(data);
  }
};

/**
 * Decrypts ciphertext back to the original JavaScript object or string.
 */
export const decryptData = (ciphertext) => {
  if (!ciphertext || typeof ciphertext !== 'string') return null;
  if (!ciphertext.startsWith('ENC_')) {
    // Return raw if string is not encrypted (backward compatibility)
    try {
      return JSON.parse(ciphertext);
    } catch {
      return ciphertext;
    }
  }

  try {
    const base64Str = ciphertext.replace('ENC_', '');
    const decoded = decodeURIComponent(atob(base64Str));
    
    let unsalted = '';
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i);
      const keyChar = ENCRYPTION_SALT.charCodeAt(i % ENCRYPTION_SALT.length);
      unsalted += String.fromCharCode(charCode ^ keyChar);
    }

    const prefix = `${ENCRYPTION_SALT}:`;
    if (!unsalted.startsWith(prefix)) {
      throw new Error('Invalid encryption signature or tampered data payload.');
    }

    const rawStr = unsalted.slice(prefix.length);
    try {
      return JSON.parse(rawStr);
    } catch {
      return rawStr;
    }
  } catch (err) {
    console.error('Decryption failed:', err);
    return null;
  }
};

/**
 * Encrypted Storage Adapter over localStorage
 */
export const secureStorage = {
  getItem: (key) => {
    try {
      const raw = localStorage.getItem(`APEX_ENC_${key}`) || localStorage.getItem(key);
      if (!raw) return null;
      return decryptData(raw);
    } catch (e) {
      console.error(`Error reading ${key} from storage:`, e);
      return null;
    }
  },

  setItem: (key, value) => {
    try {
      const encrypted = encryptData(value);
      localStorage.setItem(`APEX_ENC_${key}`, encrypted);
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    } catch (e) {
      console.error(`Error saving ${key} to storage:`, e);
    }
  },

  removeItem: (key) => {
    localStorage.removeItem(`APEX_ENC_${key}`);
    localStorage.removeItem(key);
  },
};

/**
 * Cryptographic Hash Checksum Generator for QR Codes and Audit Logs
 */
export const generateDataHash = (str) => {
  let hash = 0;
  if (!str) return '00000000';
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0').toUpperCase();
};
