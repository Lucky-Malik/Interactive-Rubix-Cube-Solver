// Professional OpenCV-inspired Color Detection for Rubik's Cube
// Based on successful cube detection algorithms from research

class ColorDetection {
  constructor() {
    // Optimized HSV ranges for Rubik's cube colors (more accurate than RGB)
    this.hsvRanges = {
      'W': { hMin: 0, hMax: 180, sMin: 0, sMax: 30, vMin: 200, vMax: 255 },     // White
      'Y': { hMin: 20, hMax: 30, sMin: 100, sMax: 255, vMin: 100, vMax: 255 },  // Yellow  
      'R': { hMin: 0, hMax: 10, sMin: 120, sMax: 255, vMin: 100, vMax: 255 },   // Red
      'O': { hMin: 11, hMax: 25, sMin: 100, sMax: 255, vMin: 100, vMax: 255 },  // Orange
      'G': { hMin: 40, hMax: 80, sMin: 50, sMax: 255, vMin: 50, vMax: 255 },    // Green
      'B': { hMin: 90, hMax: 130, sMin: 50, sMax: 255, vMin: 50, vMax: 255 }    // Blue
    };

    // Backup RGB-based detection for difficult cases
    this.rgbCenters = {
      'W': [255, 255, 255],
      'Y': [255, 255, 0],
      'R': [255, 0, 0],
      'O': [255, 165, 0],
      'G': [0, 255, 0],
      'B': [0, 0, 255]
    };

    // User calibration data
    this.calibratedHSV = this.loadCalibration();
    
    // Detection parameters
    this.minContourArea = 100;
    this.maxContourArea = 10000;
    this.approxEpsilon = 0.02;
  }

  // Convert RGB to HSV (more reliable for color detection)
  rgbToHsv(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    let h = 0;
    let s = 0;
    const v = max;

    if (diff !== 0) {
      s = diff / max;
      
      if (max === r) {
        h = ((g - b) / diff) % 6;
      } else if (max === g) {
        h = (b - r) / diff + 2;
      } else {
        h = (r - g) / diff + 4;
      }
    }

    h = Math.round(h * 30); // Convert to 0-180 range (OpenCV standard)
    s = Math.round(s * 255);
    const v_val = Math.round(v * 255);

    // Handle negative hue
    if (h < 0) h += 180;

    return [h, s, v_val];
  }

  // Classify color using HSV ranges (primary method)
  classifyColorHSV(h, s, v) {
    let bestMatch = null;
    let bestScore = 0;

    const ranges = this.calibratedHSV || this.hsvRanges;

    for (const [colorName, range] of Object.entries(ranges)) {
      let score = 0;
      
      // Check if HSV values fall within range
      const hInRange = (h >= range.hMin && h <= range.hMax) || 
                       (range.hMin > range.hMax && (h >= range.hMin || h <= range.hMax)); // Handle red wrap-around
      const sInRange = s >= range.sMin && s <= range.sMax;
      const vInRange = v >= range.vMin && v <= range.vMax;

      if (hInRange) score += 0.5;
      if (sInRange) score += 0.3;
      if (vInRange) score += 0.2;

      // Additional scoring based on how close values are to center of range
      const hCenter = (range.hMax + range.hMin) / 2;
      const sCenter = (range.sMax + range.sMin) / 2;
      const vCenter = (range.vMax + range.vMin) / 2;

      score += (1 - Math.abs(h - hCenter) / 90) * 0.1;
      score += (1 - Math.abs(s - sCenter) / 128) * 0.1;
      score += (1 - Math.abs(v - vCenter) / 128) * 0.1;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = colorName;
      }
    }

    return { color: bestMatch, confidence: bestScore };
  }

  // Extract dominant color from region using histogram analysis
  getDominantColorFromRegion(imageData, x, y, width, height) {
    const pixels = [];
    const data = imageData.data;
    const imgWidth = imageData.width;

    // Sample pixels from the region (every 2nd pixel for performance)
    for (let dy = 0; dy < height; dy += 2) {
      for (let dx = 0; dx < width; dx += 2) {
        const pixelX = Math.floor(x + dx);
        const pixelY = Math.floor(y + dy);
        
        if (pixelX >= 0 && pixelX < imgWidth && pixelY >= 0 && pixelY < imageData.height) {
          const idx = (pixelY * imgWidth + pixelX) * 4;
          if (idx + 2 < data.length) {
            pixels.push([data[idx], data[idx + 1], data[idx + 2]]);
          }
        }
      }
    }

    if (pixels.length === 0) return { color: 'W', confidence: 0 };

    // Use median color to reduce noise impact
    const medianR = this.getMedian(pixels.map(p => p[0]));
    const medianG = this.getMedian(pixels.map(p => p[1]));
    const medianB = this.getMedian(pixels.map(p => p[2]));

    return this.classifyColor(medianR, medianG, medianB);
  }

  // Get median value from array (more robust than average)
  getMedian(arr) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  // Main color classification with multiple fallback methods
  classifyColor(r, g, b) {
    // Method 1: HSV-based classification (primary)
    const [h, s, v] = this.rgbToHsv(r, g, b);
    const hsvResult = this.classifyColorHSV(h, s, v);
    
    if (hsvResult.confidence > 0.6) {
      return hsvResult;
    }

    // Method 2: RGB distance-based classification (fallback)
    let bestColor = 'W';
    let minDistance = Infinity;

    for (const [colorName, [cr, cg, cb]] of Object.entries(this.rgbCenters)) {
      const distance = Math.sqrt(
        Math.pow(r - cr, 2) + 
        Math.pow(g - cg, 2) + 
        Math.pow(b - cb, 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        bestColor = colorName;
      }
    }

    // Calculate confidence based on distance
    const maxDistance = Math.sqrt(3 * 255 * 255);
    const confidence = Math.max(0, (maxDistance - minDistance) / maxDistance);

    return { color: bestColor, confidence: confidence };
  }

  // Advanced detection with noise reduction and morphological operations
  analyzeGridRegion(imageData, gridX, gridY, cellSize) {
    const results = [];
    const qualityMetrics = {
      averageConfidence: 0,
      lowConfidenceCount: 0,
      noiseLevel: 0
    };

    // Analyze each of the 9 squares with improved sampling
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const x = gridX + col * cellSize;
        const y = gridY + row * cellSize;
        
        // Sample from center 60% of each square to avoid edges
        const padding = cellSize * 0.2;
        const sampleX = x + padding;
        const sampleY = y + padding;
        const sampleWidth = cellSize - 2 * padding;
        const sampleHeight = cellSize - 2 * padding;

        // Get dominant color with noise reduction
        const colorResult = this.getDominantColorFromRegion(
          imageData, sampleX, sampleY, sampleWidth, sampleHeight
        );
        
        results.push({
          position: row * 3 + col,
          color: colorResult.color,
          confidence: colorResult.confidence,
          rgb: this.rgbCenters[colorResult.color] || [128, 128, 128]
        });

        if (colorResult.confidence < 0.7) {
          qualityMetrics.lowConfidenceCount++;
        }
      }
    }

    // Calculate overall quality metrics
    qualityMetrics.averageConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    
    // Check color consistency
    const colorCounts = {};
    results.forEach(r => {
      colorCounts[r.color] = (colorCounts[r.color] || 0) + 1;
    });
    
    const uniqueColors = Object.keys(colorCounts).length;
    qualityMetrics.noiseLevel = uniqueColors > 4 ? (uniqueColors - 4) / 2 : 0;

    return {
      colors: results.map(r => r.color),
      quality: qualityMetrics,
      isGoodQuality: qualityMetrics.averageConfidence > 0.7 && 
                     qualityMetrics.lowConfidenceCount < 3 && 
                     qualityMetrics.noiseLevel < 0.3,
      rawResults: results
    };
  }

  // Enhanced detection with automatic lighting compensation
  detectWithLightingCompensation(imageData, gridX, gridY, cellSize) {
    // Analyze overall lighting conditions
    const lightingInfo = this.analyzeLighting(imageData);
    
    // Temporarily adjust HSV ranges based on lighting
    const originalRanges = JSON.parse(JSON.stringify(this.hsvRanges));
    
    if (lightingInfo.isDark) {
      // Expand value ranges for dark conditions
      Object.keys(this.hsvRanges).forEach(color => {
        this.hsvRanges[color].vMin = Math.max(0, this.hsvRanges[color].vMin - 50);
      });
    } else if (lightingInfo.isBright) {
      // Adjust saturation for bright conditions
      Object.keys(this.hsvRanges).forEach(color => {
        this.hsvRanges[color].sMin = Math.max(0, this.hsvRanges[color].sMin - 30);
        this.hsvRanges[color].vMax = Math.min(255, this.hsvRanges[color].vMax + 30);
      });
    }

    const result = this.analyzeGridRegion(imageData, gridX, gridY, cellSize);
    
    // Restore original ranges
    this.hsvRanges = originalRanges;
    
    result.lightingInfo = lightingInfo;
    return result;
  }

  // Analyze lighting conditions using histogram analysis
  analyzeLighting(imageData) {
    const data = imageData.data;
    let totalBrightness = 0;
    let brightnessHistogram = new Array(256).fill(0);
    let sampleCount = 0;

    // Sample every 20th pixel for performance
    for (let i = 0; i < data.length; i += 80) { // 4 channels * 20 pixels
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Calculate luminance
      const brightness = Math.floor(0.299 * r + 0.587 * g + 0.114 * b);
      totalBrightness += brightness;
      brightnessHistogram[brightness]++;
      sampleCount++;
    }

    const averageBrightness = totalBrightness / sampleCount;
    
    // Find histogram peaks to detect lighting quality
    let darkPixels = brightnessHistogram.slice(0, 85).reduce((a, b) => a + b, 0);
    let brightPixels = brightnessHistogram.slice(170, 256).reduce((a, b) => a + b, 0);
    
    const darkRatio = darkPixels / sampleCount;
    const brightRatio = brightPixels / sampleCount;

    return {
      averageBrightness,
      isDark: averageBrightness < 80 || darkRatio > 0.6,
      isBright: averageBrightness > 180 || brightRatio > 0.6,
      isGoodLighting: averageBrightness >= 100 && averageBrightness <= 160 && darkRatio < 0.3 && brightRatio < 0.3,
      darkRatio,
      brightRatio
    };
  }

  // Calibrate HSV ranges based on user samples
  calibrateColors(colorSamples) {
    const newRanges = JSON.parse(JSON.stringify(this.hsvRanges));
    
    for (const [colorName, rgbSample] of Object.entries(colorSamples)) {
      if (this.hsvRanges[colorName]) {
        const [h, s, v] = this.rgbToHsv(rgbSample[0], rgbSample[1], rgbSample[2]);
        
        // Expand ranges around the sample
        const hRange = 15;
        const sRange = 30;
        const vRange = 30;
        
        newRanges[colorName] = {
          hMin: Math.max(0, h - hRange),
          hMax: Math.min(180, h + hRange),
          sMin: Math.max(0, s - sRange),
          sMax: Math.min(255, s + sRange),
          vMin: Math.max(0, v - vRange),
          vMax: Math.min(255, v + vRange)
        };
      }
    }
    
    this.calibratedHSV = newRanges;
    this.saveCalibration();
  }

  // Load saved calibration
  loadCalibration() {
    try {
      const saved = localStorage.getItem('cubeHSVCalibration');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.warn('Could not load HSV calibration:', e);
      return null;
    }
  }

  // Save calibration
  saveCalibration() {
    try {
      localStorage.setItem('cubeHSVCalibration', JSON.stringify(this.calibratedHSV));
    } catch (e) {
      console.warn('Could not save HSV calibration:', e);
    }
  }

  // Reset to default ranges
  resetCalibration() {
    this.calibratedHSV = null;
    try {
      localStorage.removeItem('cubeHSVCalibration');
    } catch (e) {
      console.warn('Could not remove HSV calibration:', e);
    }
  }
}

export default ColorDetection;
