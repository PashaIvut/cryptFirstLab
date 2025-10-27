#!/usr/bin/env node

import { createReadStream, createWriteStream } from 'fs';
import sharp from 'sharp';
import { StreamCipher } from './xor-cipher.ts';
import { PermutationCipher } from './block-cipher.ts';
import { CryptoMetrics } from './analysis.ts';
import { CryptoUtils } from './helpers.ts';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CryptoPicCLI {
  streamCipher: StreamCipher;
  permutationCipher: PermutationCipher;

  constructor() {
    this.streamCipher = new StreamCipher();
    this.permutationCipher = new PermutationCipher();
  }

  async run() {
    const args = this.parseArgs();
    
    if (args.mode === 'encrypt') {
      await this.encrypt(args);
    } else if (args.mode === 'decrypt') {
      await this.decrypt(args);
    } else if (args.mode === 'analyze') {
      await this.analyze(args);
    }
  }

  parseArgs() {
    const args: any = {
      mode: null,
      input: null,
      output: null,
      algorithm: null,
      key: null,
      iv: null,
      nonce: null,
      meta: null,
      iterations: 10
    };

    for (let i = 2; i < process.argv.length; i++) {
      const arg = process.argv[i];
      
      if (arg === '--mode') {
        args.mode = process.argv[++i];
      } else if (arg === '--in') {
        args.input = process.argv[++i];
      } else if (arg === '--out') {
        args.output = process.argv[++i];
      } else if (arg === '--algo') {
        args.algorithm = process.argv[++i];
      } else if (arg === '--key') {
        args.key = process.argv[++i];
      } else if (arg === '--iv') {
        args.iv = process.argv[++i];
      } else if (arg === '--nonce') {
        args.nonce = process.argv[++i];
      } else if (arg === '--meta') {
        args.meta = process.argv[++i];
      } else if (arg === '--iterations') {
        args.iterations = parseInt(process.argv[++i]);
      }
    }

    return args;
  }

  async encrypt(args) {
    console.log('Шифрование изображения...');
    
    const imageBuffer = await sharp(args.input).raw().toBuffer();
    const metadata = await sharp(args.input).metadata();
    
    const imageData = {
      data: imageBuffer,
      width: metadata.width,
      height: metadata.height
    };
    
    let result, meta;
    
    if (args.algorithm === 'stream') {
      meta = this.streamCipher.getMeta();
      result = await this.streamCipher.encrypt(imageData, args.key, meta.iv);
    } else if (args.algorithm === 'perm-mix') {
      meta = this.permutationCipher.getMeta();
      result = await this.permutationCipher.encrypt(imageData, args.key, meta.iv, args.iterations);
    } else {
      throw new Error(`Неподдерживаемый алгоритм: ${args.algorithm}`);
    }

    const outputPath = args.output || this.generateOutputPath(args.input, args.algorithm, 'encrypted');
    
    await sharp(result.data, {
      raw: {
        width: result.width,
        height: result.height,
        channels: 3
      }
    }).png().toFile(outputPath);
    
    const metaPath = args.meta || this.generateMetaPath(outputPath);
    await this.saveMeta(metaPath, meta);
    
    console.log(`Изображение зашифровано: ${outputPath}`);
    console.log(`Метаданные сохранены: ${metaPath}`);
  }

  async decrypt(args) {
    console.log('Дешифрование изображения...');
    
    const imageBuffer = await sharp(args.input).raw().toBuffer();
    const metadata = await sharp(args.input).metadata();
    
    const imageData = {
      data: imageBuffer,
      width: metadata.width,
      height: metadata.height
    };
    
    const metaPath = args.meta || this.generateMetaPath(args.input);
    const meta = await this.loadMeta(metaPath);
    
    let result;
    
    if (meta.algo === 'stream') {
      const iv = this.hexToUint8Array(meta.iv);
      result = await this.streamCipher.decrypt(imageData, args.key, iv);
    } else if (meta.algo === 'permutation') {
      const iv = this.hexToUint8Array(meta.iv);
      result = await this.permutationCipher.decrypt(imageData, args.key, iv, args.iterations);
    } else {
      throw new Error(`Неподдерживаемый алгоритм: ${meta.algo}`);
    }

    const outputPath = args.output || this.generateOutputPath(args.input, meta.algo, 'decrypted');
    
    await sharp(result.data, {
      raw: {
        width: result.width,
        height: result.height,
        channels: 3
      }
    }).png().toFile(outputPath);
    
    console.log(`Изображение дешифровано: ${outputPath}`);
  }

  async analyze(args) {
    console.log('Анализ метрик...');
    
    const imageBuffer = await sharp(args.input).raw().toBuffer();
    const metadata = await sharp(args.input).metadata();
    
    const imageData = {
      data: imageBuffer,
      width: metadata.width,
      height: metadata.height
    };
    
    const entropy = CryptoMetrics.computeEntropy(imageData);
    const correlation = CryptoMetrics.computeCorrelation(imageData);
    console.log('\nРезультаты анализа:');
    console.log(`Энтропия: ${entropy.toFixed(4)} бит`);
    console.log(`Корреляция:`);
    console.log(`  Горизонтальная: ${correlation.horizontal.toFixed(4)}`);
    console.log(`  Вертикальная: ${correlation.vertical.toFixed(4)}`);
    console.log(`  Диагональная: ${correlation.diagonal.toFixed(4)}`);
  }

  generateOutputPath(inputPath, algorithm, suffix) {
    const ext = path.extname(inputPath);
    const base = path.basename(inputPath, ext);
    const dir = path.dirname(inputPath);
    return path.join(dir, `${base}_${algorithm}_${suffix}${ext}`);
  }

  generateMetaPath(outputPath) {
    const ext = path.extname(outputPath);
    const base = path.basename(outputPath, ext);
    const dir = path.dirname(outputPath);
    return path.join(dir, `${base}.meta.json`);
  }

  async saveFile(filePath, buffer) {
    const fs = await import('fs/promises');
    await fs.writeFile(filePath, buffer);
  }

  async saveMeta(metaPath: string, meta: any) {
    const metaObj = {
      ...meta,
      iv: Array.from(meta.iv).map((b: any) => b.toString(16).padStart(2, '0')).join('')
    };
    
    const fs = await import('fs/promises');
    await fs.writeFile(metaPath, JSON.stringify(metaObj, null, 2));
  }

  async loadMeta(metaPath) {
    const fs = await import('fs/promises');
    const content = await fs.readFile(metaPath, 'utf8');
    const meta = JSON.parse(content);
    if (typeof meta.iv === 'string') {
      meta.iv = this.hexToUint8Array(meta.iv);
    }
    return meta;
  }

  hexToUint8Array(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return bytes;
  }


}

const cli = new CryptoPicCLI();
cli.run().catch(console.error);