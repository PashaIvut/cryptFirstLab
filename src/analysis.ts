export class CryptoMetrics {
  static computeEntropy(imageData) {
    const histogram = new Array(256).fill(0);
    const bytes = new Uint8Array(imageData.data);
    const totalBytes = bytes.length;

    for (let i = 0; i < totalBytes; i += 3) {
      histogram[bytes[i]]++;
      histogram[bytes[i + 1]]++;
      histogram[bytes[i + 2]]++;
    }

    let entropy = 0;
    const totalPixels = (totalBytes / 3) * 3;

    for (let i = 0; i < 256; i++) {
      if (histogram[i] > 0) {
        const probability = histogram[i] / totalPixels;
        entropy -= probability * Math.log2(probability);
      }
    }

    return entropy;
  }

  static computeCorrelation(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;

    let horizontalSum = 0, verticalSum = 0, diagonalSum = 0;
    let horizontalCount = 0, verticalCount = 0, diagonalCount = 0;

    let totalSum = 0;
    let pixelCount = 0;
    
    for (let i = 0; i < data.length; i += 3) {
      totalSum += (data[i] + data[i + 1] + data[i + 2]) / 3;
      pixelCount++;
    }
    const mean = totalSum / pixelCount;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 3;
        const currentPixel = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

        if (x < width - 1) {
          const nextIdx = (y * width + x + 1) * 3;
          const nextPixel = (data[nextIdx] + data[nextIdx + 1] + data[nextIdx + 2]) / 3;
          horizontalSum += Math.abs(currentPixel - nextPixel);
          horizontalCount++;
        }

        if (y < height - 1) {
          const nextIdx = ((y + 1) * width + x) * 3;
          const nextPixel = (data[nextIdx] + data[nextIdx + 1] + data[nextIdx + 2]) / 3;
          verticalSum += Math.abs(currentPixel - nextPixel);
          verticalCount++;
        }

        if (x < width - 1 && y < height - 1) {
          const nextIdx = ((y + 1) * width + x + 1) * 3;
          const nextPixel = (data[nextIdx] + data[nextIdx + 1] + data[nextIdx + 2]) / 3;
          diagonalSum += Math.abs(currentPixel - nextPixel);
          diagonalCount++;
        }
      }
    }

    return {
      horizontal: horizontalSum / horizontalCount / 255,
      vertical: verticalSum / verticalCount / 255,
      diagonal: diagonalSum / diagonalCount / 255,
    };
  }

  static calculateNPCRUACI(enc1, enc2) {
    const data1 = new Uint8Array(enc1.data);
    const data2 = new Uint8Array(enc2.data);

    let changedPixels = 0;
    let totalDifference = 0;
    const totalPixels = data1.length / 3;

    for (let i = 0; i < data1.length; i += 3) {
      const r1 = data1[i], g1 = data1[i + 1], b1 = data1[i + 2];
      const r2 = data2[i], g2 = data2[i + 1], b2 = data2[i + 2];

      if (r1 !== r2 || g1 !== g2 || b1 !== b2) {
        changedPixels++;
      }

      totalDifference += Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
    }

    const npcr = (changedPixels / totalPixels) * 100;
    const uaci = (totalDifference / (totalPixels * 3 * 255)) * 100;

    return { npcr, uaci };
  }

  static calculateHistogram(imageData) {
    const histogram = {
      r: new Array(256).fill(0),
      g: new Array(256).fill(0),
      b: new Array(256).fill(0),
    };

    const data = imageData.data;

    for (let i = 0; i < data.length; i += 3) {
      histogram.r[data[i]]++;
      histogram.g[data[i + 1]]++;
      histogram.b[data[i + 2]]++;
    }

    return histogram;
  }

  static calculateKeySensitivity(originalImageData, key1, key2, algorithm, iv, iterations = 10) {
    return {
      bitChangeRate: 0,
      npcr: 0,
      uaci: 0
    };
  }

  static calculateStatistics(imageData) {
    const data = imageData.data;
    let sum = 0;
    let sumSquares = 0;
    let pixelCount = 0;

    for (let i = 0; i < data.length; i += 3) {
      const pixel = (data[i] + data[i + 1] + data[i + 2]) / 3;
      sum += pixel;
      sumSquares += pixel * pixel;
      pixelCount++;
    }

    const mean = sum / pixelCount;
    const variance = (sumSquares / pixelCount) - (mean * mean);
    const stdDev = Math.sqrt(variance);

    return {
      mean: mean,
      variance: variance,
      standardDeviation: stdDev,
      pixelCount: pixelCount
    };
  }

  static compareImages(img1, img2) {
    const entropy1 = this.computeEntropy(img1);
    const entropy2 = this.computeEntropy(img2);
    
    const corr1 = this.computeCorrelation(img1);
    const corr2 = this.computeCorrelation(img2);
    
    const { npcr, uaci } = this.calculateNPCRUACI(img1, img2);
    
    const stats1 = this.calculateStatistics(img1);
    const stats2 = this.calculateStatistics(img2);

    return {
      entropy: { original: entropy1, encrypted: entropy2 },
      correlation: { original: corr1, encrypted: corr2 },
      npcr: npcr,
      uaci: uaci,
      statistics: { original: stats1, encrypted: stats2 }
    };
  }
}