export class CryptoUtils {
  static createKey(str, length = 16) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);

    let hash = new Uint8Array(length);
    let accumulator = 0;
    
    accumulator = str.length;
    
    for (let i = 0; i < length; i++) {
      const byte = data[i % data.length];
      accumulator = (accumulator * 31 + byte + i) | 0;
      hash[i] = (byte ^ (i * 7) ^ (accumulator & 0xff)) & 0xff;
      
      if (i % 3 === 0) {
        hash[i] ^= (accumulator >> 8) & 0xff;
      }
      if (i % 5 === 0) {
        hash[i] ^= (accumulator >> 16) & 0xff;
      }
      
      const charPos = i % str.length;
      hash[i] ^= str.charCodeAt(charPos) & 0xff;
    }

    return hash;
  }

  static randomIV(length = 16) {
    const iv = new Uint8Array(length);
    
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(iv);
    } else {
      const crypto = require('crypto');
      const randomBytes = crypto.randomBytes(length);
      iv.set(randomBytes);
    }
    
    return iv;
  }

  static async hashData(data) {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest(
        "SHA-256",
        encoder.encode(data)
      );
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } else {
      const crypto = require('crypto');
      return crypto.createHash('sha256').update(data).digest('hex');
    }
  }

  static flipBit(key, bitIndex) {
    const newKey = new Uint8Array(key);
    const byteIndex = Math.floor(bitIndex / 8);
    const bitInByte = bitIndex % 8;
    newKey[byteIndex] ^= 1 << bitInByte;
    return newKey;
  }

  static hexToUint8Array(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  static uint8ArrayToHex(bytes: Uint8Array) {
    return Array.from(bytes)
      .map((b: number) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  static verifyReversibility(original, decrypted) {
    const originalBytes = new Uint8Array(original.data);
    const decryptedBytes = new Uint8Array(decrypted.data);

    let differences = 0;
    for (let i = 0; i < originalBytes.length; i++) {
      if (originalBytes[i] !== decryptedBytes[i]) {
        differences++;
      }
    }

    return {
      identical: differences === 0,
      differences: differences,
      totalBytes: originalBytes.length,
      accuracy: ((originalBytes.length - differences) / originalBytes.length) * 100
    };
  }
}