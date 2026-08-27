const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Local storage directory for generated PDF proof packets
const PROOFS_DIR = path.join(__dirname, '../../public/proofs');

// Ensure directory exists
if (!fs.existsSync(PROOFS_DIR)) {
  fs.mkdirSync(PROOFS_DIR, { recursive: true });
}

/**
 * Saves a binary PDF buffer to disk and returns the relative URL
 */
async function saveProofPacketPDF(filename, pdfBuffer) {
  try {
    const filePath = path.join(PROOFS_DIR, filename);
    await fs.promises.writeFile(filePath, pdfBuffer);
    logger.info(`Saved Proof Packet PDF: ${filename} (${pdfBuffer.length} bytes)`);
    return `/proofs/${filename}`;
  } catch (err) {
    logger.error(`Failed to save PDF to disk: ${err.message}`);
    throw err;
  }
}

/**
 * Checks if a proof PDF exists and returns absolute path
 */
function getProofPacketFilePath(filename) {
  const safeFilename = path.basename(filename);
  const filePath = path.join(PROOFS_DIR, safeFilename);
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  return null;
}

module.exports = {
  saveProofPacketPDF,
  getProofPacketFilePath,
  PROOFS_DIR,
};
