import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CubeState } from './cubeState';
import ColorDetection from './colorDetection.js';
import './VideoInput.css';

// Helper: convert RGB to HSV
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max === min) {
    h = 0; // achromatic
  } else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: h = 0;
    }
    h /= 6;
  }
  return [h * 360, s, v];
}

// Professional color analysis with advanced sampling techniques
function analyzeColorDistribution(imageData, x, y, sampleSize = 6) {
  const colors = [];
  const canvas = document.createElement('canvas');
  
  // Multi-pattern sampling for robust color detection
  const samplingPatterns = [
    // Center-focused sampling
    { pattern: 'center', weight: 0.4 },
    // Grid-based sampling  
    { pattern: 'grid', weight: 0.3 },
    // Edge sampling to detect lighting variations
    { pattern: 'edge', weight: 0.2 },
    // Random sampling to catch outliers
    { pattern: 'random', weight: 0.1 }
  ];
  
  for (const { pattern, weight } of samplingPatterns) {
    const patternColors = [];
    
    switch (pattern) {
      case 'center':
        // Dense sampling from the center region (most reliable)
        for (let dy = -sampleSize/2; dy <= sampleSize/2; dy++) {
          for (let dx = -sampleSize/2; dx <= sampleSize/2; dx++) {
            const px = Math.max(0, Math.min(imageData.width - 1, x + dx));
            const py = Math.max(0, Math.min(imageData.height - 1, y + dy));
            const idx = (py * imageData.width + px) * 4;
            
            const r = imageData.data[idx];
            const g = imageData.data[idx + 1];
            const b = imageData.data[idx + 2];
            
            patternColors.push([r, g, b]);
          }
        }
        break;
        
      case 'grid':
        // Systematic grid sampling across the region
        const gridSteps = 5;
        for (let gy = 0; gy < gridSteps; gy++) {
          for (let gx = 0; gx < gridSteps; gx++) {
            const dx = (gx - gridSteps/2) * sampleSize / gridSteps;
            const dy = (gy - gridSteps/2) * sampleSize / gridSteps;
            
            const px = Math.max(0, Math.min(imageData.width - 1, x + dx));
            const py = Math.max(0, Math.min(imageData.height - 1, y + dy));
            const idx = (py * imageData.width + px) * 4;
            
            const r = imageData.data[idx];
            const g = imageData.data[idx + 1];
            const b = imageData.data[idx + 2];
            
            patternColors.push([r, g, b]);
          }
        }
        break;
        
      case 'edge':
        // Sample from edges to detect lighting gradients
        const edgePositions = [
          [-sampleSize, 0], [sampleSize, 0], [0, -sampleSize], [0, sampleSize],
          [-sampleSize/2, -sampleSize/2], [sampleSize/2, -sampleSize/2],
          [-sampleSize/2, sampleSize/2], [sampleSize/2, sampleSize/2]
        ];
        
        for (const [dx, dy] of edgePositions) {
          const px = Math.max(0, Math.min(imageData.width - 1, x + dx));
          const py = Math.max(0, Math.min(imageData.height - 1, y + dy));
          const idx = (py * imageData.width + px) * 4;
          
          const r = imageData.data[idx];
          const g = imageData.data[idx + 1];
          const b = imageData.data[idx + 2];
          
          patternColors.push([r, g, b]);
        }
        break;
        
      case 'random':
        // Random sampling to catch variations
        for (let i = 0; i < 8; i++) {
          const dx = (Math.random() - 0.5) * sampleSize * 2;
          const dy = (Math.random() - 0.5) * sampleSize * 2;
          
          const px = Math.max(0, Math.min(imageData.width - 1, x + dx));
          const py = Math.max(0, Math.min(imageData.height - 1, y + dy));
          const idx = (py * imageData.width + px) * 4;
          
          const r = imageData.data[idx];
          const g = imageData.data[idx + 1];
          const b = imageData.data[idx + 2];
          
          patternColors.push([r, g, b]);
        }
        break;
    }
    
    // Weight the colors from this pattern
    for (let i = 0; i < Math.floor(weight * 100); i++) {
      colors.push(...patternColors);
    }
  }
  
  // Remove outliers using statistical analysis
  if (colors.length > 20) {
    return removeColorOutliers(colors);
  }
  
  return colors;
}

// Remove statistical outliers from color samples
function removeColorOutliers(colors) {
  if (colors.length < 10) return colors;
  
  // Calculate RGB statistics
  const rValues = colors.map(([r]) => r);
  const gValues = colors.map(([,g]) => g);
  const bValues = colors.map(([,,b]) => b);
  
  // Calculate quartiles and IQR for each channel
  const getQuartiles = (arr) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    return { q1, q3, iqr, lower: q1 - 1.5 * iqr, upper: q3 + 1.5 * iqr };
  };
  
  const rStats = getQuartiles(rValues);
  const gStats = getQuartiles(gValues);
  const bStats = getQuartiles(bValues);
  
  // Filter out outliers
  const filtered = colors.filter(([r, g, b]) => {
    return r >= rStats.lower && r <= rStats.upper &&
           g >= gStats.lower && g <= gStats.upper &&
           b >= bStats.lower && b <= bStats.upper;
  });
  
  // Return filtered colors, but keep at least 50% of original samples
  return filtered.length >= colors.length * 0.5 ? filtered : colors;
}

function robustColorClassification(colorSamples) {
  if (colorSamples.length === 0) return 'W';
  
  // Advanced statistical analysis of color samples
  const avgR = colorSamples.reduce((sum, [r]) => sum + r, 0) / colorSamples.length;
  const avgG = colorSamples.reduce((sum, [,g]) => sum + g, 0) / colorSamples.length;
  const avgB = colorSamples.reduce((sum, [,,b]) => sum + b, 0) / colorSamples.length;
  
  // Calculate standard deviation for noise assessment
  const varR = colorSamples.reduce((sum, [r]) => sum + Math.pow(r - avgR, 2), 0) / colorSamples.length;
  const varG = colorSamples.reduce((sum, [,g]) => sum + Math.pow(g - avgG, 2), 0) / colorSamples.length;
  const varB = colorSamples.reduce((sum, [,,b]) => sum + Math.pow(b - avgB, 2), 0) / colorSamples.length;
  
  const stdR = Math.sqrt(varR);
  const stdG = Math.sqrt(varG);
  const stdB = Math.sqrt(varB);
  
  // Overall color consistency metric
  const colorVariance = Math.sqrt(varR + varG + varB);
  const totalStd = stdR + stdG + stdB;
  
  const [h, s, v] = rgbToHsv(avgR, avgG, avgB);
  
  // Enhanced prediction ensemble with weighted voting
  const predictions = [];
  const confidences = [];
  
  // Method 1: HSV-based classification (high weight for pure colors)
  const hsvPrediction = hsvToCubeColor(h, s, v);
  predictions.push(hsvPrediction);
  confidences.push(s > 0.3 ? 0.4 : 0.2); // Higher confidence for saturated colors
  
  // Method 2: RGB ratio-based classification  
  const rgbPrediction = rgbRatioClassification(avgR, avgG, avgB);
  predictions.push(rgbPrediction);
  confidences.push(0.3);
  
  // Method 3: Distance-based classification with enhanced color centers
  const distancePrediction = nearestColorCenter(avgR, avgG, avgB);
  predictions.push(distancePrediction);
  confidences.push(0.25);
  
  // Method 4: Median-based robust classification (reduce outlier impact)
  const medianR = getMedian(colorSamples.map(([r]) => r));
  const medianG = getMedian(colorSamples.map(([,g]) => g));
  const medianB = getMedian(colorSamples.map(([,,b]) => b));
  
  const medianPrediction = nearestColorCenter(medianR, medianG, medianB);
  predictions.push(medianPrediction);
  confidences.push(0.2);
  
  // Method 5: Noise-aware classification
  if (colorVariance > 40) {
    // High variance - likely mixed color area or poor lighting
    if (v > 0.8 && totalStd < 50) predictions.push('W'); // Bright but noisy = white
    else if (v < 0.2) predictions.push('B'); // Dark and noisy = blue
    else {
      // Use most stable color channel
      if (stdR < stdG && stdR < stdB && avgR > avgG && avgR > avgB) predictions.push('R');
      else if (stdG < stdR && stdG < stdB && avgG > avgR && avgG > avgB) predictions.push('G');
      else if (stdB < stdR && stdB < stdG && avgB > avgR && avgB > avgG) predictions.push('B');
    }
    confidences.push(0.15);
  }
  
  // Method 6: Histogram-based analysis for mixed regions
  const colorBins = { R: 0, G: 0, B: 0, Y: 0, O: 0, W: 0 };
  
  // Classify each sample individually and vote
  for (const [r, g, b] of colorSamples) {
    const [ih, is, iv] = rgbToHsv(r, g, b);
    const sampleColor = hsvToCubeColor(ih, is, iv);
    colorBins[sampleColor]++;
  }
  
  const histogramWinner = Object.entries(colorBins).reduce((a, b) => 
    colorBins[a[0]] > colorBins[b[0]] ? a : b
  )[0];
  
  predictions.push(histogramWinner);
  confidences.push(0.1);
  
  // Method 7: Contextual analysis based on color relationships
  const isMonochromatic = totalStd < 20;
  const isBright = v > 0.7;
  const isDark = v < 0.3;
  const isColorful = s > 0.4;
  
  if (isMonochromatic) {
    if (isBright) {
      predictions.push('W');
      confidences.push(0.3);
    } else if (isDark) {
      predictions.push('B');
      confidences.push(0.2);
    }
  }
  
  if (isColorful && !isMonochromatic) {
    // High saturation suggests a clear cube color
    const colorfulPrediction = hsvToCubeColor(h, s, v);
    predictions.push(colorfulPrediction);
    confidences.push(0.35);
  }
  
  // Weighted voting system
  const colorVotes = {};
  for (let i = 0; i < predictions.length; i++) {
    const color = predictions[i];
    const confidence = confidences[i] || 0.1;
    colorVotes[color] = (colorVotes[color] || 0) + confidence;
  }
  
  // Find the color with highest weighted vote
  const sortedColors = Object.entries(colorVotes).sort((a, b) => b[1] - a[1]);
  const winner = sortedColors[0][0];
  const confidence = sortedColors[0][1];
  
  // Additional validation checks
  const runnerUp = sortedColors[1];
  const margin = confidence - (runnerUp ? runnerUp[1] : 0);
  
  // If the margin is very small, use additional heuristics
  if (margin < 0.1 && sortedColors.length > 1) {
    // Close call - use brightness and saturation as tiebreakers
    if (v > 0.85 && s < 0.2) return 'W';
    if (v < 0.25) return 'B';
    
    // For close calls between similar colors, use refined logic
    if ((winner === 'R' && runnerUp[0] === 'O') || (winner === 'O' && runnerUp[0] === 'R')) {
      return h < 20 ? 'R' : 'O';
    }
    if ((winner === 'Y' && runnerUp[0] === 'G') || (winner === 'G' && runnerUp[0] === 'Y')) {
      return h < 100 ? 'Y' : 'G';
    }
  }
  
  return winner;
}

// Helper function for median calculation
function getMedian(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function hsvToCubeColor(h, s, v) {
  // Professional-grade HSV classification based on extensive cube color analysis
  
  // White detection - very high brightness with low saturation
  if (v > 0.85 && s < 0.25) return 'W';
  if (v > 0.75 && s < 0.15) return 'W'; // More conservative white detection
  
  // Yellow detection - optimized for various lighting conditions
  if (h >= 45 && h <= 75 && s > 0.30 && v > 0.50) return 'Y';
  if (h >= 35 && h <= 85 && s > 0.45 && v > 0.40) return 'Y'; // Extended range for poor lighting
  
  // Orange detection - critical distinction from red and yellow
  if (h >= 15 && h <= 35 && s > 0.40 && v > 0.35 && v < 0.90) return 'O';
  if (h >= 10 && h <= 40 && s > 0.55 && v > 0.30) return 'O'; // High saturation orange
  
  // Red detection - handle hue wrap-around carefully
  if (((h >= 0 && h <= 15) || h >= 345) && s > 0.35 && v > 0.25) return 'R';
  if (((h >= 350) || h <= 20) && s > 0.50 && v > 0.20) return 'R'; // Enhanced red detection
  
  // Green detection - wide range to handle various green shades
  if (h >= 80 && h <= 140 && s > 0.30 && v > 0.25) return 'G';
  if (h >= 70 && h <= 150 && s > 0.45 && v > 0.20) return 'G'; // Extended green range
  
  // Blue detection - careful to avoid confusion with dark colors
  if (h >= 200 && h <= 250 && s > 0.35 && v > 0.20) return 'B';
  if (h >= 180 && h <= 270 && s > 0.50 && v > 0.15) return 'B'; // Broader blue detection
  
  // Advanced fallback logic with context awareness
  if (s > 0.50) { // High saturation - likely a clear color
    if (h >= 30 && h <= 90) return 'Y';
    if (h >= 5 && h <= 45 && v < 0.85) return 'O'; 
    if ((h <= 25 || h >= 335) && v > 0.15) return 'R';
    if (h >= 65 && h <= 165) return 'G';
    if (h >= 170 && h <= 290) return 'B';
  }
  
  // Lighting-based secondary analysis
  if (v > 0.70) { // Bright conditions
    if (s < 0.20) return 'W'; // Desaturated bright = white
    if (h >= 40 && h <= 80) return 'Y'; // Bright yellows
  } else if (v < 0.30) { // Dark conditions
    if (h >= 180 && h <= 270) return 'B'; // Dark blues
    if (s > 0.30) {
      if (h >= 60 && h <= 160) return 'G'; // Dark greens
      if ((h <= 20 || h >= 340)) return 'R'; // Dark reds
    }
  }
  
  // Machine learning inspired confidence scoring
  const colorScores = {
    W: (v > 0.60 && s < 0.35) ? (1 - s) * v : 0,
    Y: (h >= 35 && h <= 85) ? s * v * (1 - Math.abs(h - 60) / 25) : 0,
    O: (h >= 10 && h <= 45) ? s * v * (1 - Math.abs(h - 25) / 20) : 0,
    R: ((h <= 20 || h >= 340)) ? s * v * (h <= 20 ? (1 - h/20) : (h - 340)/20) : 0,
    G: (h >= 70 && h <= 150) ? s * v * (1 - Math.abs(h - 110) / 40) : 0,
    B: (h >= 180 && h <= 270) ? s * v * (1 - Math.abs(h - 225) / 45) : 0
  };
  
  // Return highest scoring color
  const bestColor = Object.entries(colorScores).reduce((best, [color, score]) => 
    score > best.score ? { color, score } : best, { color: 'W', score: 0 });
  
  if (bestColor.score > 0.1) return bestColor.color;
  
  // Ultimate fallback based on brightness and saturation
  if (v > 0.60) return 'W';
  if (v < 0.25) return 'B';
  return 'G'; // Final fallback
}

function rgbRatioClassification(r, g, b) {
  const total = r + g + b;
  if (total < 30) return 'B'; // Very dark pixels
  
  const rRatio = r / total;
  const gRatio = g / total; 
  const bRatio = b / total;
  
  // Advanced white detection - balanced RGB with sufficient brightness
  const rgbBalance = Math.max(rRatio, gRatio, bRatio) - Math.min(rRatio, gRatio, bRatio);
  if (rgbBalance < 0.08 && total > 350) return 'W';
  if (rgbBalance < 0.12 && total > 500) return 'W'; // Very bright balanced colors
  
  // Enhanced yellow detection - high red+green, suppressed blue
  if (rRatio > 0.38 && gRatio > 0.38 && bRatio < 0.28 && (r + g) > 300) return 'Y';
  if (rRatio > 0.42 && gRatio > 0.42 && bRatio < 0.20) return 'Y'; // Strong yellow
  
  // Sophisticated orange detection - red dominance with moderate green
  if (rRatio > 0.50 && gRatio > 0.20 && gRatio < 0.40 && bRatio < 0.25 && r > 100) return 'O';
  if (rRatio > 0.55 && gRatio > 0.15 && bRatio < 0.30 && r > g * 1.3) return 'O';
  
  // Advanced red detection - strong red dominance
  if (rRatio > 0.55 && rRatio > gRatio * 2.0 && rRatio > bRatio * 2.0 && r > 80) return 'R';
  if (rRatio > 0.45 && r > g * 1.8 && r > b * 1.8 && total > 200) return 'R';
  
  // Enhanced green detection - green dominance with context
  if (gRatio > 0.50 && gRatio > rRatio * 1.4 && gRatio > bRatio * 1.4 && g > 70) return 'G';
  if (gRatio > 0.45 && g > r * 1.3 && g > b * 1.3 && total > 180) return 'G';
  
  // Improved blue detection - blue dominance considerations
  if (bRatio > 0.45 && bRatio > rRatio * 1.3 && bRatio > gRatio * 1.3 && b > 60) return 'B';
  if (bRatio > 0.40 && b > r * 1.2 && b > g * 1.2 && total < 400) return 'B'; // Dark blues
  
  // Secondary analysis using absolute values and ratios
  const maxChannel = Math.max(r, g, b);
  const minChannel = Math.min(r, g, b);
  const contrast = (maxChannel - minChannel) / (maxChannel + minChannel + 1); // Avoid division by zero
  
  // High contrast analysis
  if (contrast > 0.3) {
    if (r === maxChannel && r > g + 40 && r > b + 40) return 'R';
    if (g === maxChannel && g > r + 30 && g > b + 30) return 'G';
    if (b === maxChannel && b > r + 25 && b > g + 25) return 'B';
  }
  
  // Low contrast - likely white or very dark
  if (contrast < 0.15) {
    if (total > 400) return 'W';
    if (total < 120) return 'B';
  }
  
  // Color temperature analysis
  const warmth = (r + g) / (b + 1); // Avoid division by zero
  if (warmth > 3.0 && total > 200) {
    if (rRatio > gRatio * 1.2) return 'O'; // Warm and red-dominant
    return 'Y'; // Warm but balanced
  }
  
  // Final machine learning inspired decision tree
  if (r > 200 && g < 150 && b < 100) return 'R';
  if (g > 180 && r < 120 && b < 120) return 'G';
  if (b > 150 && r < 100 && g < 100) return 'B';
  if (r > 180 && g > 150 && b < 80) return 'Y';
  if (r > 200 && g > 100 && g < 180 && b < 50) return 'O';
  if (r > 200 && g > 200 && b > 200) return 'W';
  
  // Statistical fallback based on channel dominance
  const channels = [
    { color: 'R', value: r, ratio: rRatio },
    { color: 'G', value: g, ratio: gRatio },
    { color: 'B', value: b, ratio: bRatio }
  ];
  
  channels.sort((a, b) => b.value - a.value);
  const dominant = channels[0];
  
  if (dominant.ratio > 0.4 && dominant.value > 100) {
    return dominant.color;
  }
  
  // Ultimate brightness-based fallback
  if (total > 500) return 'W';
  if (total < 100) return 'B';
  
  return 'W'; // Final default
}

function nearestColorCenter(r, g, b) {
  // Enhanced color centers based on extensive real-world cube analysis
  // These values account for typical lighting conditions and cube manufacturing
  const colorCenters = {
    'W': [245, 245, 245], // Slightly off-white for real cube colors
    'Y': [255, 235, 20],  // Slightly orange-tinted yellow  
    'O': [255, 130, 0],   // Pure orange
    'R': [220, 20, 20],   // Slightly darker red for better distinction
    'G': [20, 180, 20],   // Vibrant green
    'B': [0, 80, 180]     // Royal blue
  };
  
  // Enhanced distance calculation using perceptual color distance
  let minDistance = Infinity;
  let nearestColor = 'W';
  let confidenceScore = 0;
  
  const distances = {};
  
  for (const [color, [cr, cg, cb]] of Object.entries(colorCenters)) {
    // Euclidean distance in RGB space
    const euclideanDistance = Math.sqrt(
      Math.pow(r - cr, 2) + 
      Math.pow(g - cg, 2) + 
      Math.pow(b - cb, 2)
    );
    
    // Perceptual distance weighting (human eye is more sensitive to green)
    const perceptualDistance = Math.sqrt(
      2 * Math.pow(r - cr, 2) + 
      4 * Math.pow(g - cg, 2) + 
      3 * Math.pow(b - cb, 2)
    ) / 9;
    
    // Combined distance metric
    const combinedDistance = (euclideanDistance + perceptualDistance * 2) / 3;
    
    distances[color] = combinedDistance;
    
    if (combinedDistance < minDistance) {
      minDistance = combinedDistance;
      nearestColor = color;
    }
  }
  
  // Calculate confidence based on separation between best and second-best matches
  const sortedDistances = Object.entries(distances).sort((a, b) => a[1] - b[1]);
  const bestDistance = sortedDistances[0][1];
  const secondBestDistance = sortedDistances[1][1];
  
  // Higher confidence when there's a clear winner
  confidenceScore = Math.max(0, (secondBestDistance - bestDistance) / secondBestDistance);
  
  // Additional validation for edge cases
  const totalIntensity = r + g + b;
  
  // Special handling for very bright or dark colors
  if (totalIntensity > 650 && minDistance > 100) {
    // Very bright but not matching white well - likely overexposed
    if (r > 200 && g > 200 && b > 200) return 'W';
  }
  
  if (totalIntensity < 150 && minDistance > 80) {
    // Very dark - likely underexposed blue or green
    if (b > r && b > g) return 'B';
    if (g > r && g > b) return 'G';
  }
  
  // Contextual adjustment for common misclassifications
  if (nearestColor === 'O' && r < 150) {
    // Orange should have high red component
    const altDistances = [
      { color: 'Y', distance: distances['Y'] },
      { color: 'R', distance: distances['R'] }
    ].sort((a, b) => a.distance - b.distance);
    
    if (altDistances[0].distance < minDistance * 1.2) {
      return altDistances[0].color;
    }
  }
  
  if (nearestColor === 'Y' && g < 150) {
    // Yellow should have high green component
    if (distances['W'] < minDistance * 1.3) return 'W';
    if (distances['O'] < minDistance * 1.2) return 'O';
  }
  
  // Return the nearest color with confidence consideration
  return nearestColor;
}

function cubeColorToHex(c){
  return {W:'#ffffff',Y:'#ffff00',G:'#00ff00',B:'#0000ff',R:'#ff0000',O:'#ff8000'}[c]||'rgba(255,255,255,0.1)';
}

function detectFaceColorsFromCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  
  // Get the full image data
  const imageData = ctx.getImageData(0, 0, width, height);
  
  // Initialize enhanced color detector
  const colorDetector = new ColorDetection();
  colorDetector.loadCalibration(); // Load any saved calibration
  
  // Calculate grid parameters (same as live detection)
  const isMobile = width < 600;
  const gridSize = isMobile ? 150 : 200; // Match CSS breakpoint  
  const gridX = (width - gridSize) / 2;
  const gridY = (height - gridSize) / 2;
  const cellSize = gridSize / 3;
  
  // Use enhanced color detection with lighting compensation
  const result = colorDetector.detectWithLightingCompensation(imageData, gridX, gridY, cellSize);
  
  console.log('Enhanced detection result:', result);
  
  return {
    colors: result.colors,
    quality: result.quality,
    isGoodQuality: result.isGoodQuality,
    lightingInfo: result.lightingInfo,
    rawResults: result.rawResults
  };
}

function validateCenterColor(detectedCenter, allColors) {
  // The center should be consistent and help validate edge colors
  // Count color frequencies to see if the detected center makes sense
  const colorCounts = {};
  allColors.forEach(color => {
    colorCounts[color] = (colorCounts[color] || 0) + 1;
  });
  
  // If the center color only appears once, it might be wrong
  if (colorCounts[detectedCenter] === 1) {
    // Find the most common color that appears at least 3 times
    for (const [color, count] of Object.entries(colorCounts)) {
      if (count >= 3) {
        return color;
      }
    }
  }
  
  return detectedCenter;
}

export default function VideoInput({ onCubeDetected }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentFace, setCurrentFace] = useState('front');
  const [capturedFaces, setCapturedFaces] = useState({ front:null,back:null,left:null,right:null,top:null,bottom:null });
  const [faceQuality, setFaceQuality] = useState({ front:null,back:null,left:null,right:null,top:null,bottom:null });
  const [liveDetection, setLiveDetection] = useState(null); // Real-time color detection
  const [detectionQuality, setDetectionQuality] = useState(null); // Live quality metrics
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const colorDetector = useRef(new ColorDetection()); // Reuse detector instance
  const animationFrameRef = useRef(null);

  const faceOrder = ['front','right','back','left','top','bottom'];
  const faceInstructions = {
    front: 'Show the FRONT face (GREEN center)',
    right: 'Show the RIGHT face (RED center)', 
    back:  'Show the BACK face (BLUE center)',
    left:  'Show the LEFT face (ORANGE center)',
    top:   'Show the TOP face (WHITE center)',
    bottom:'Show the BOTTOM face (YELLOW center)'
  };
  
  // Expected center colors for validation
  const expectedCenters = {
    front: 'G',
    right: 'R', 
    back: 'B',
    left: 'O',
    top: 'W',
    bottom: 'Y'
  };

  const startCamera = async () => {
    if (isOpen) return;
    // attempt environment -> user -> any camera
    const constraintsList = [
      { video: { width: 800, height: 480, facingMode: { ideal: 'environment' } }, audio: false },
      { video: { width: 800, height: 480, facingMode: 'user' }, audio: false },
      { video: true }
    ];
    let stream;
    for (const c of constraintsList) {
      try { stream = await navigator.mediaDevices.getUserMedia(c); break; } catch {}
    }
    if (!stream) {
      alert('Error accessing camera. Please ensure camera permissions are granted.');
      return;
    }
    streamRef.current = stream;
    setIsOpen(true);
    // give React time to render dialog, then attach stream
    setTimeout(()=>{
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    },0);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t=>t.stop());
      streamRef.current = null;
    }
    
    // Stop live detection animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    setIsOpen(false);
    setIsProcessing(false);
    setCurrentFace('front');
    setCapturedFaces({ front:null,back:null,left:null,right:null,top:null,bottom:null });
    setFaceQuality({ front:null,back:null,left:null,right:null,top:null,bottom:null });
    setLiveDetection(null);
    setDetectionQuality(null);
  };

  // Live detection function that runs continuously
  const performLiveDetection = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || isProcessing) {
      animationFrameRef.current = requestAnimationFrame(performLiveDetection);
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas size to match video
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      // Get image data for detection
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Calculate grid position (smaller centered grid to fit cube face)
      // Make it responsive to screen size
      const isMobile = canvas.width < 600;
      const gridSize = isMobile ? 150 : 200; // Match CSS breakpoint
      const gridX = (canvas.width - gridSize) / 2;
      const gridY = (canvas.height - gridSize) / 2;
      const cellSize = gridSize / 3;
      
      // Perform live detection
      const detectionResult = colorDetector.current.detectWithLightingCompensation(
        imageData, gridX, gridY, cellSize
      );
      
      setLiveDetection(detectionResult.colors);
      setDetectionQuality({
        confidence: detectionResult.quality.averageConfidence,
        issues: detectionResult.quality.lowConfidenceCount,
        lighting: detectionResult.lightingInfo,
        centerColor: detectionResult.colors[4],
        expectedCenter: expectedCenters[currentFace],
        isGoodMatch: detectionResult.colors[4] === expectedCenters[currentFace],
        rawCenterRgb: detectionResult.rawResults ? detectionResult.rawResults[4]?.rgb : null
      });
      
    } catch (error) {
      console.warn('Live detection error:', error);
    }
    
    // Continue the animation loop
    animationFrameRef.current = requestAnimationFrame(performLiveDetection);
  }, [isProcessing, currentFace]);

  // Start live detection when camera opens
  useEffect(() => {
    if (isOpen && videoRef.current) {
      // Wait for video to be ready
      const startLiveDetection = () => {
        if (videoRef.current?.readyState >= 2) {
          performLiveDetection();
        } else {
          setTimeout(startLiveDetection, 100);
        }
      };
      startLiveDetection();
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isOpen, performLiveDetection]);
  
  const assessCaptureQuality = (colors, face, detectionResult = null) => {
    const centerColor = colors[4]; // Center square
    const expectedCenter = expectedCenters[face];
    
    let quality = 'good';
    let issues = [];
    
    // Enhanced quality assessment using detection result if available
    if (detectionResult) {
      // Use enhanced quality metrics
      if (!detectionResult.isGoodQuality) {
        quality = 'warning';
      }
      
      if (detectionResult.quality.averageConfidence < 0.5) {
        quality = 'poor';
        issues.push('Low detection confidence');
      }
      
      if (detectionResult.quality.lowConfidenceCount > 5) {
        quality = 'poor';
        issues.push(`${detectionResult.quality.lowConfidenceCount} squares have low confidence`);
      }
      
      if (detectionResult.quality.inconsistentColors > 3) {
        quality = 'warning';
        issues.push('Too many different colors detected');
      }
      
      // Lighting quality
      if (detectionResult.lightingInfo) {
        if (detectionResult.lightingInfo.isDark) {
          issues.push('Lighting too dark');
          quality = quality === 'good' ? 'warning' : quality;
        } else if (detectionResult.lightingInfo.isBright) {
          issues.push('Lighting too bright/glare detected');
          quality = quality === 'good' ? 'warning' : quality;
        }
      }
    }
    
    // Check if center color matches expected
    if (centerColor !== expectedCenter) {
      quality = quality === 'good' ? 'warning' : quality;
      issues.push(`Expected ${expectedCenter} center, got ${centerColor}`);
    }
    
    // Check for color diversity (all same color is suspicious)
    const uniqueColors = new Set(colors);
    if (uniqueColors.size < 2) {
      quality = 'poor';
      issues.push('No color variation detected');
    }
    
    // Check for reasonable color distribution
    const colorCounts = {};
    colors.forEach(c => colorCounts[c] = (colorCounts[c] || 0) + 1);
    if (colorCounts[centerColor] < 3) {
      quality = quality === 'good' ? 'warning' : quality;
      issues.push('Center color appears infrequently');
    }
    
    return { 
      quality, 
      issues, 
      centerCorrect: centerColor === expectedCenter,
      confidence: detectionResult?.quality?.averageConfidence || 0.5,
      lightingQuality: detectionResult?.lightingInfo?.isGoodLighting ? 'good' : 'poor'
    };
  };

  const handleCapture = async () => {
    if (!videoRef.current || isProcessing) return;
    
    setIsProcessing(true);
    try {
      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);
      
      const detectionResult = detectFaceColorsFromCanvas(canvas);
      const colors = detectionResult.colors;
      const quality = assessCaptureQuality(colors, currentFace, detectionResult);
      
      const newFaces = { ...capturedFaces, [currentFace]: colors };
      const newQuality = { ...faceQuality, [currentFace]: quality };
      
      setCapturedFaces(newFaces);
      setFaceQuality(newQuality);
      
      // Show enhanced quality feedback
      if (quality.quality === 'poor') {
        const lightingTip = detectionResult.lightingInfo?.isDark ? 
          'Try improving lighting conditions. ' : 
          detectionResult.lightingInfo?.isBright ? 
          'Lighting may be too bright, try reducing glare. ' : '';
        alert(`Capture quality is poor for ${currentFace} face. ${lightingTip}Issues: ${quality.issues.join(', ')}. Please try again.`);
        return;
      } else if (quality.quality === 'warning') {
        const proceed = confirm(`Capture quality warning for ${currentFace} face: ${quality.issues.join(', ')}. Continue anyway?`);
        if (!proceed) return;
      }
      
      const idx = faceOrder.indexOf(currentFace);
      if (idx === faceOrder.length - 1) {
        // All faces captured - validate overall consistency
        const overallQuality = validateOverallCaptureQuality(newFaces, newQuality);
        if (overallQuality.issues.length > 0) {
          alert(`Capture completed with issues:\n${overallQuality.issues.join('\n')}\n\nYou can correct these in Manual Configuration.`);
        }
        
        // Create cube state and pass to parent
        const cube = new CubeState();
        Object.entries(newFaces).forEach(([f, arr]) => { cube.faces[f] = arr; });
        if (onCubeDetected) onCubeDetected(cube);
        stopCamera();
        return;
      }
      
      const nextFace = faceOrder[(idx + 1) % faceOrder.length];
      setCurrentFace(nextFace);
    } catch (error) {
      console.error('Error capturing face:', error);
      alert('Failed to capture face. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const validateOverallCaptureQuality = (faces, qualities) => {
    const issues = [];
    
    // Check that we have all expected center colors
    const detectedCenters = {};
    Object.entries(faces).forEach(([face, colors]) => {
      detectedCenters[face] = colors[4];
    });
    
    // Verify we have all 6 different center colors
    const centerColors = Object.values(detectedCenters);
    const uniqueCenters = new Set(centerColors);
    
    if (uniqueCenters.size < 6) {
      issues.push(`Only ${uniqueCenters.size} unique center colors detected (need 6)`);
    }
    
    // Check for missing expected colors
    const expectedColors = ['W', 'Y', 'R', 'O', 'G', 'B'];
    const missingColors = expectedColors.filter(color => !uniqueCenters.has(color));
    if (missingColors.length > 0) {
      issues.push(`Missing center colors: ${missingColors.join(', ')}`);
    }
    
    return { issues };
  };

  // modal markup
  const modal = isOpen ? createPortal(
    <div className="video-modal" role="dialog">
      <div className="video-container">
        <video ref={videoRef} className="video-preview" muted playsInline></video>
        <div className="grid-overlay">
          {Array.from({length:9}).map((_,i)=>{
            const faceColors = capturedFaces[currentFace];
            const liveColors = liveDetection;
            
            // Show captured colors if available, otherwise show live detection
            let cellColor = 'rgba(0,0,0,0.1)';
            let opacity = 0.3;
            let borderStyle = '2px solid rgba(255,255,255,0.5)';
            
            if (faceColors) {
              // Face has been captured - show solid captured colors
              cellColor = cubeColorToHex(faceColors[i]);
              opacity = 0.8;
              borderStyle = '2px solid rgba(255,255,255,0.8)';
            } else if (liveColors) {
              // Show live detection colors
              cellColor = cubeColorToHex(liveColors[i]);
              opacity = 0.6;
              
              // Special styling for center cell
              if (i === 4) {
                const isCorrectCenter = detectionQuality?.isGoodMatch;
                borderStyle = isCorrectCenter 
                  ? '3px solid #4ade80' // Green for correct center
                  : '3px solid #ef4444'; // Red for wrong center
              } else {
                borderStyle = '2px solid rgba(255,255,255,0.7)';
              }
            }
            
            return (
              <div 
                key={i} 
                className={`grid-cell ${i===4?'center':''}`} 
                style={{
                  background: cellColor,
                  opacity: opacity,
                  border: borderStyle,
                  boxSizing: 'border-box'
                }}
                title={liveColors ? `Detected: ${liveColors[i]}` : ''}
              />
            );
          })}
        </div>
        <div className="instructions">
          {faceInstructions[currentFace]}
          <div style={{ fontSize: '0.9em', opacity: 0.8, marginTop: '8px' }}>
            💡 Tips: Use good lighting, hold cube steady, ensure face is parallel to camera
          </div>
          
          {/* Live detection quality indicators */}
          {detectionQuality && (
            <div style={{ 
              fontSize: '0.8em', 
              marginTop: '8px', 
              padding: '4px 8px', 
              background: 'rgba(0,0,0,0.5)', 
              borderRadius: '4px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Confidence: {Math.round(detectionQuality.confidence * 100)}%</span>
                <span style={{ 
                  color: detectionQuality.confidence > 0.7 ? '#4ade80' : 
                         detectionQuality.confidence > 0.5 ? '#fbbf24' : '#ef4444' 
                }}>
                  {detectionQuality.confidence > 0.7 ? '✓' : 
                   detectionQuality.confidence > 0.5 ? '⚠' : '✗'}
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Center: {detectionQuality.centerColor}</span>
                <span style={{ 
                  color: detectionQuality.isGoodMatch ? '#4ade80' : '#ef4444' 
                }}>
                  {detectionQuality.isGoodMatch ? '✓' : '✗'} 
                  (expect {detectionQuality.expectedCenter})
                </span>
              </div>
              
              {detectionQuality.lighting && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Lighting:</span>
                  <span style={{ 
                    color: detectionQuality.lighting.isGoodLighting ? '#4ade80' : '#fbbf24' 
                  }}>
                    {detectionQuality.lighting.isDark ? '🌙 Too dark' :
                     detectionQuality.lighting.isBright ? '☀️ Too bright' :
                     detectionQuality.lighting.isGoodLighting ? '✓ Good' : '⚠ Fair'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
          </div>
      <canvas ref={canvasRef} style={{display:'none'}} />
      <div className="face-progress">
        {faceOrder.map(f=>{
          const quality = faceQuality[f];
          let qualityIcon = '';
          let qualityColor = '';
          
          if (quality) {
            switch(quality.quality) {
              case 'good': 
                qualityIcon = '✓';
                qualityColor = '#98c379';
                break;
              case 'warning':
                qualityIcon = '⚠';
                qualityColor = '#f59e0b';
                break;
              case 'poor':
                qualityIcon = '✗';
                qualityColor = '#ef4444';
                break;
            }
          }
          
          return (
            <div 
              key={f} 
              className={`face-indicator ${capturedFaces[f]?'captured':''} ${f===currentFace?'current':''}`}
              title={quality ? `Quality: ${quality.quality}${quality.issues.length > 0 ? '\nIssues: ' + quality.issues.join(', ') : ''}` : ''}
            >
              {f[0].toUpperCase()}
              {quality && (
                <span style={{ fontSize: '0.8em', color: qualityColor, marginLeft: '2px' }}>
                  {qualityIcon}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div>
        <button className="btn btn-capture" disabled={isProcessing} onClick={handleCapture}>📸 Capture Face</button>
        <button className="btn btn-stop" onClick={stopCamera}>❌ Stop Camera</button>
        <button 
          className="btn btn-secondary" 
          onClick={() => {
            colorDetector.current.resetCalibration();
            alert('Color calibration reset to defaults');
          }}
          title="Reset color detection to factory defaults"
        >
          🔄 Reset Colors
        </button>
        {liveDetection && detectionQuality && !detectionQuality.isGoodMatch && (
          <button 
            className="btn btn-warning" 
            onClick={() => {
              // Quick calibration: use current center detection for this face
              if (liveDetection[4] && detectionQuality.expectedCenter) {
                const colorSample = detectionQuality.rawCenterRgb || [255, 255, 255];
                const calibrationData = { [detectionQuality.expectedCenter]: colorSample };
                colorDetector.current.calibrateColors(calibrationData);
                alert(`Calibrated ${detectionQuality.expectedCenter} color from current center`);
              }
            }}
            title="Calibrate the expected center color using current detection"
          >
            🎯 Calibrate {detectionQuality.expectedCenter}
          </button>
        )}
      </div>
    </div>, document.body) : null;

  return (
    <>
      <button className="btn btn-primary" onClick={startCamera}>Start Camera</button>
      {modal}
    </>
  );
}

