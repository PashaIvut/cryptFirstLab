import { CryptoUtils } from "./helpers.ts";

export class StreamCipher {
  name: string;

  constructor() {
    this.name = "Потоковый шифр (XOR)";
  }

  customPRNG(seed) {
    let x = seed[0];
    let y = seed[1];

    x ^= x << 23;
    x ^= x >> 17;
    x ^= y ^ (y >> 26);
    
    x ^= (x << 13) ^ (x >> 19);
    x = (x + y) | 0;
    
    y = ((y << 7) | (y >>> 25)) ^ x;

    return [x, y];
  }

  generateKeyStream(length, key, iv) {
    const keystream = new Uint8Array(length);

    let state = new Uint32Array(4);
    
    for (let i = 0; i < Math.min(key.length, 8); i++) {
      const byte = key[i];
      state[Math.floor(i / 2)] ^= (byte << ((i % 2) * 8)) ^ (byte * 0x9E3779B9);
    }
    
    for (let i = 0; i < Math.min(iv.length, 8); i++) {
      const byte = iv[i];
      state[2 + Math.floor(i / 2)] ^= (byte << ((i % 2) * 8)) ^ (byte * 0x85EBCA6B);
    }

    state[0] ^= 0x12345678;
    state[1] ^= 0x9ABCDEF0;
    state[2] ^= 0x13579BDF;
    state[3] ^= 0x2468ACE0;

    let position = 0;
    while (position < length) {
      const [x, y] = this.customPRNG([state[0], state[1]]);
      state[0] = x;
      state[1] = y;

      const [x2, y2] = this.customPRNG([state[2], state[3]]);
      state[2] = x2;
      state[3] = y2;

      const bytes = new Uint8Array(8);
      
      bytes[0] = (x >>> 24) & 0xff;
      bytes[1] = (x >>> 16) & 0xff;
      bytes[2] = (x >>> 8) & 0xff;
      bytes[3] = x & 0xff;
      
      bytes[4] = (x2 >>> 24) & 0xff;
      bytes[5] = (x2 >>> 16) & 0xff;
      bytes[6] = (x2 >>> 8) & 0xff;
      bytes[7] = x2 & 0xff;

      for (let i = 0; i < 8; i++) {
        bytes[i] ^= ((y >>> (i * 4)) & 0xf) << 4;
        bytes[i] ^= ((y2 >>> (i * 4)) & 0xf);
      }

      for (let i = 0; i < 8 && position < length; i++) {
        keystream[position++] = bytes[i];
      }
    }

    return keystream;
  }

  async encrypt(imageData, keyStr, iv) {
    const key = CryptoUtils.createKey(keyStr);
    const bytes = new Uint8Array(imageData.data);
    const keystream = this.generateKeyStream(bytes.length, key, iv);

    for (let i = 0; i < bytes.length; i++) {
      const positionFactor = (i * 0x9E3779B9) >>> 0;
      bytes[i] ^= keystream[i] ^ (positionFactor & 0xff);
    }

    return {
      data: bytes,
      width: imageData.width,
      height: imageData.height
    };
  }

  async decrypt(imageData, keyStr, iv) {
    return this.encrypt(imageData, keyStr, iv);
  }

  getMeta() {
    return {
      algo: "stream",
      iv: CryptoUtils.randomIV(),
      timestamp: Date.now(),
    };
  }
}