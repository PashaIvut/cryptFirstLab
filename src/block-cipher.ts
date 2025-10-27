import { CryptoUtils } from "./helpers.ts";

export class PermutationCipher {
  name: string;

  constructor() {
    this.name = "Перестановочный шифр";
  }

  shuffleBlocks(array, key, iv) {
    const shuffled = [...array];
    const seed = this.createSeed(key, iv);

    for (let pass = 0; pass < 3; pass++) {
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = this.linearGenerator(seed + pass * 1000) % (i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        
        if (i % 7 === 0) {
          const k = this.linearGenerator(seed + i) % shuffled.length;
          [shuffled[i], shuffled[k]] = [shuffled[k], shuffled[i]];
        }
      }
    }

    return shuffled;
  }

  createSeed(key, iv) {
    let seed = 0;
    
    for (let i = 0; i < key.length; i++) {
      seed = (seed * 31 + key[i] * (i + 1)) | 0;
      seed ^= (seed << 13) | (seed >>> 19);
    }
    
    for (let i = 0; i < iv.length; i++) {
      seed = (seed * 17 + iv[i] * (i + 2)) | 0;
      seed ^= (seed << 7) | (seed >>> 25);
    }
    
    seed ^= 0x9E3779B9;
    seed = (seed * 0x85EBCA6B) | 0;
    
    return seed;
  }

  linearGenerator(seed) {
    seed = (seed * 1664525 + 1013904223) | 0;
    seed ^= (seed << 13) | (seed >>> 19);
    seed = (seed * 0x9E3779B9) | 0;
    return Math.abs(seed);
  }

  processBlocks(imageData, key, iv, iterations, encrypt = true) {
    const width = imageData.width;
    const height = imageData.height;
    const blockSize = 8;

    const blocksW = Math.floor(width / blockSize);
    const blocksH = Math.floor(height / blockSize);

    let blockIndices = Array.from({ length: blocksW * blocksH }, (_, i) => i);

    for (let iter = 0; iter < iterations; iter++) {
      blockIndices = this.shuffleBlocks(
        blockIndices,
        key,
        new Uint8Array([iter, iter >> 8, iter >> 16, iter >> 24])
      );
      
      if (iter % 3 === 0) {
        const reverseIndices = [...blockIndices].reverse();
        blockIndices = this.shuffleBlocks(
          reverseIndices,
          key,
          new Uint8Array([iter + 1000])
        );
      }
    }

    if (!encrypt) {
      const inverseIndices = new Array(blockIndices.length);
      blockIndices.forEach((newPos, oldPos) => {
        inverseIndices[newPos] = oldPos;
      });
      blockIndices = inverseIndices;
    }

    const result = {
      data: new Uint8Array(imageData.data),
      width: width,
      height: height
    };

    for (let by = 0; by < blocksH; by++) {
      for (let bx = 0; bx < blocksW; bx++) {
        const oldIndex = by * blocksW + bx;
        const newIndex = blockIndices[oldIndex];

        const newBx = newIndex % blocksW;
        const newBy = Math.floor(newIndex / blocksW);

        for (let y = 0; y < blockSize; y++) {
          for (let x = 0; x < blockSize; x++) {
            const srcX = bx * blockSize + x;
            const srcY = by * blockSize + y;
            const destX = newBx * blockSize + x;
            const destY = newBy * blockSize + y;

            if (
              srcX < width &&
              srcY < height &&
              destX < width &&
              destY < height
            ) {
              const srcIdx = (srcY * width + srcX) * 3;
              const destIdx = (destY * width + destX) * 3;

              const keyOffset = (srcIdx + destIdx) % key.length;
              const positionFactor = (srcIdx + destIdx) * 0x9E3779B9;
              
              result.data[destIdx] =
                imageData.data[srcIdx] ^ key[keyOffset] ^ (positionFactor & 0xff);
              result.data[destIdx + 1] =
                imageData.data[srcIdx + 1] ^ key[(keyOffset + 1) % key.length] ^ ((positionFactor >> 8) & 0xff);
              result.data[destIdx + 2] =
                imageData.data[srcIdx + 2] ^ key[(keyOffset + 2) % key.length] ^ ((positionFactor >> 16) & 0xff);
            }
          }
        }
      }
    }

    return result;
  }

  async encrypt(imageData, keyStr, iv, iterations = 10) {
    const key = CryptoUtils.createKey(keyStr);
    return this.processBlocks(imageData, key, iv, iterations, true);
  }

  async decrypt(imageData, keyStr, iv, iterations = 10) {
    const key = CryptoUtils.createKey(keyStr);
    return this.processBlocks(imageData, key, iv, iterations, false);
  }

  getMeta() {
    return {
      algo: "permutation",
      iv: CryptoUtils.randomIV(),
      timestamp: Date.now(),
    };
  }
}