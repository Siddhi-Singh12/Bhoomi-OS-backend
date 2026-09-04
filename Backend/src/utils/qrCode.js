/**
 * Zero-dependency QR Code Matrix Generator (Model 2, Version 4-M, Byte Mode)
 * Generates a 33x33 boolean matrix suitable for drawing directly in PDFKit.
 */

// GF(256) Tables
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
let val = 1;
for (let i = 0; i < 255; i++) {
  EXP[i] = val;
  EXP[i + 255] = val;
  LOG[val] = i;
  val = (val << 1) ^ (val >= 128 ? 0x11d : 0);
}

function gfMul(a, b) {
  return (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];
}

function rsPoly(numEc) {
  let poly = [1];
  for (let i = 0; i < numEc; i++) {
    const next = [1, EXP[i]];
    const res = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      res[j] ^= poly[j];
      res[j + 1] ^= gfMul(poly[j], next[1]);
    }
    poly = res;
  }
  return poly;
}

function calculateEC(data, numEc) {
  const gen = rsPoly(numEc);
  const msg = [...data, ...new Array(numEc).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return msg.slice(data.length);
}

function generateQRMatrix(text) {
  const V4_M = {
    size: 33,
    dataCodewords: 64,
    ecCodewordsPerBlock: 18,
    blocks: 2,
  };

  const str = String(text || '').slice(0, 60);
  const bytes = Buffer.from(str, 'utf8');

  let bits = '0100'; // Byte mode
  bits += bytes.length.toString(2).padStart(8, '0');
  for (const b of bytes) {
    bits += b.toString(2).padStart(8, '0');
  }
  bits += '0000'; // Terminator
  while (bits.length % 8 !== 0) bits += '0';

  const padBytes = ['11101100', '00010001'];
  let padIdx = 0;
  while (bits.length < V4_M.dataCodewords * 8) {
    bits += padBytes[padIdx % 2];
    padIdx++;
  }

  const dataBytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    dataBytes.push(parseInt(bits.substring(i, i + 8), 2));
  }

  const b1Data = dataBytes.slice(0, 32);
  const b2Data = dataBytes.slice(32, 64);
  const b1EC = calculateEC(b1Data, 18);
  const b2EC = calculateEC(b2Data, 18);

  const finalCodewords = [];
  for (let i = 0; i < 32; i++) {
    finalCodewords.push(b1Data[i]);
    finalCodewords.push(b2Data[i]);
  }
  for (let i = 0; i < 18; i++) {
    finalCodewords.push(b1EC[i]);
    finalCodewords.push(b2EC[i]);
  }

  const size = 33;
  const matrix = Array.from({ length: size }, () => Array(size).fill(null));

  function drawFinder(r0, c0) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const row = r0 + r;
        const col = c0 + c;
        if (row < 0 || row >= size || col < 0 || col >= size) continue;
        if (r === -1 || r === 7 || c === -1 || c === 7) {
          matrix[row][col] = 0;
        } else if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          matrix[row][col] = 1;
        } else {
          matrix[row][col] = 0;
        }
      }
    }
  }
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Alignment pattern at [26, 26]
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const row = 26 + r;
      const col = 26 + c;
      if (matrix[row][col] !== null) continue;
      if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
        matrix[row][col] = 1;
      } else {
        matrix[row][col] = 0;
      }
    }
  }

  // Timing lines
  for (let i = 8; i < size - 8; i++) {
    if (matrix[6][i] === null) matrix[6][i] = i % 2 === 0 ? 1 : 0;
    if (matrix[i][6] === null) matrix[i][6] = i % 2 === 0 ? 1 : 0;
  }

  // Dark module
  matrix[size - 8][8] = 1;

  // Format info space
  for (let i = 0; i < 9; i++) {
    if (matrix[8][i] === null) matrix[8][i] = 0;
    if (matrix[i][8] === null) matrix[i][8] = 0;
  }
  for (let i = size - 8; i < size; i++) {
    if (matrix[8][i] === null) matrix[8][i] = 0;
    if (matrix[i][8] === null) matrix[i][8] = 0;
  }

  // Zigzag data placement
  let bitIdx = 0;
  let allBits = '';
  for (const cw of finalCodewords) {
    allBits += cw.toString(2).padStart(8, '0');
  }
  allBits += '0000000'; // 7 remainder bits

  let dir = -1;
  let col = size - 1;
  while (col > 0) {
    if (col === 6) col--;
    let row = dir === -1 ? size - 1 : 0;
    while ((dir === -1 && row >= 0) || (dir === 1 && row < size)) {
      for (let c = 0; c < 2; c++) {
        const curCol = col - c;
        if (matrix[row][curCol] === null) {
          const bit = bitIdx < allBits.length ? parseInt(allBits[bitIdx], 10) : 0;
          bitIdx++;
          const mask = (row + curCol) % 2 === 0;
          matrix[row][curCol] = mask ? bit ^ 1 : bit;
        }
      }
      row += dir;
    }
    dir = -dir;
    col -= 2;
  }

  // Format string: Mask 0, Level M
  const formatStr = '101010000010010';
  for (let i = 0; i < 6; i++) matrix[8][i] = parseInt(formatStr[i], 10);
  matrix[8][7] = parseInt(formatStr[6], 10);
  matrix[8][8] = parseInt(formatStr[7], 10);
  matrix[7][8] = parseInt(formatStr[8], 10);
  for (let i = 9; i < 15; i++) matrix[14 - i][8] = parseInt(formatStr[i], 10);

  for (let i = 0; i < 7; i++) matrix[size - 1 - i][8] = parseInt(formatStr[i], 10);
  for (let i = 7; i < 15; i++) matrix[8][size - 15 + i] = parseInt(formatStr[i], 10);

  return matrix;
}

module.exports = { generateQRMatrix };
