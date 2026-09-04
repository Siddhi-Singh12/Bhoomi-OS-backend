const PDFDocument = require('pdfkit');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Computes a deterministic SHA-256 cryptographic evidence hash from analysis & land metrics
 */
function computeEvidenceHash(packetData) {
  const payload = {
    analysis_id: packetData.analysis_id,
    farmer_name: packetData.farmer_name,
    agristack_id: packetData.agristack_id,
    farm_id: packetData.farm_id,
    crop_type: packetData.claim_crop_type,
    area_hectares: packetData.claim_area_hectares,
    loss_percent: packetData.claim_loss_percent,
    ndvi: packetData.ndvi,
    ndwi: packetData.ndwi,
    rainfall_mm: packetData.rainfall_mm,
    temperature_c: packetData.temperature_c,
    stress_type: packetData.stress_type,
    rule_triggered: packetData.rule_triggered,
    timestamp: packetData.generated_at || new Date().toISOString(),
  };

  const rawString = JSON.stringify(payload, Object.keys(payload).sort());
  const hash = crypto.createHash('sha256').update(rawString).digest('hex');
  return `0x${hash}`;
}

/**
 * Returns an evidence summary sentence that actually matches the detected
 * stress type, instead of always describing a drought scenario.
 */
function getEvidenceSummary(stressType, ruleTriggered) {
  const type = (stressType || 'NONE').toUpperCase();

  if (type === 'DROUGHT') {
    return 'Sensed multi-band reflectance exhibits vegetative moisture deficit coinciding with a dry spell and elevated thermal radiation, consistent with drought stress indicators.';
  }
  if (type === 'PEST_RISK') {
    return 'Sensed spectral signatures indicate vegetation stress patterns consistent with elevated pest-risk conditions, alongside recent rainfall and moisture levels.';
  }
  return `NDVI and weather signals for this period are within the expected normal range. No stress threshold was crossed (rule: ${ruleTriggered || 'N/A'}).`;
}

/**
 * Generates a high-quality PMFBY Proof Packet PDF document as a Buffer
 */
async function generateProofPacketPDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `Bhoomi OS Proof Packet - Claim #${data.analysis_id}`,
          Author: 'Bhoomi OS Verified Evidence Layer',
          Subject: 'PMFBY Agricultural Stress & Calamity Claim Evidence',
        },
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const primaryColor = '#1B4D3E'; // Forest Green
      const secondaryColor = '#2D6A4F';
      const accentColor = '#D4A373';
      const darkColor = '#1F2937';
      const lightBg = '#F4F7F5';
      const dangerColor = '#B91C1C';

      // --- HEADER SECTION ---
      doc.rect(40, 40, 515, 60).fill(primaryColor);

      doc.fillColor('#FFFFFF').fontSize(18).font('Helvetica-Bold')
        .text('BHOOMI OS — AGRICULTURAL EVIDENCE LAYER', 55, 52);

      doc.fontSize(10).font('Helvetica')
        .text('Automated Sentinel-2 & Meteorological Proof Packet for PMFBY Claims', 55, 75);

      doc.fillColor(darkColor);

      // Sub-header info bar
      doc.rect(40, 105, 515, 24).fill(lightBg);
      doc.fillColor('#374151').fontSize(9).font('Helvetica-Bold')
        .text(`PACKET ID: PKT-${data.id || data.analysis_id}`, 50, 112)
        .text(`CLAIM DATE: ${new Date(data.generated_at || Date.now()).toLocaleDateString('en-IN')}`, 240, 112)
        .text(`STATUS: VERIFIED EVIDENCE`, 420, 112);

      let yPos = 140;

      // Helper for Section Titles
      function renderSectionTitle(title, y) {
        doc.rect(40, y, 515, 18).fill('#E5EBE7');
        doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold')
          .text(title, 50, y + 4);
        return y + 26;
      }

      // Helper for 2-column info grid
      function renderGridRow(label1, val1, label2, val2, y) {
        doc.fillColor('#4B5563').fontSize(9).font('Helvetica-Bold').text(label1, 50, y);
        doc.fillColor('#111827').font('Helvetica').text(String(val1 ?? 'N/A'), 150, y);

        if (label2) {
          doc.fillColor('#4B5563').font('Helvetica-Bold').text(label2, 300, y);
          doc.fillColor('#111827').font('Helvetica').text(String(val2 ?? 'N/A'), 410, y);
        }
        return y + 18;
      }

      // --- SECTION 1: FARMER & LAND REGISTRY ---
      // NOTE: fallbacks below only fire when a field is genuinely missing
      // from the DB record — they must never silently replace a real null
      // with a fake-looking value for anything that reads like an official
      // identifier. agristack_id intentionally has NO fake-ID fallback.
      yPos = renderSectionTitle('1. FARMER & AGRISTACK REGISTRY DETAILS', yPos);
      yPos = renderGridRow(
        'Farmer Name:', data.farmer_name || 'N/A',
        'AgriStack ID:', data.agristack_id || 'Not linked (MVP mock)',
        yPos
      );
      yPos = renderGridRow('Phone Number:', data.farmer_phone || 'N/A', 'Farmer ID (Local):', `FRM-${data.farmer_id || 'N/A'}`, yPos);
      yPos = renderGridRow('Crop Sown:', data.claim_crop_type || 'Not specified', 'Total Area:', `${data.claim_area_hectares ?? 'N/A'} Hectares`, yPos);

      yPos += 8;

      // --- SECTION 2: REMOTE SENSING & SPECTRAL AUDIT ---
      yPos = renderSectionTitle('2. SENTINEL-2 L2A SPECTRAL AUDIT (COPERNICUS SATELLITE)', yPos);
      yPos = renderGridRow(
        'Canopy NDVI:', data.ndvi != null ? `${data.ndvi} (Vegetation Index)` : 'N/A',
        'Baseline Expected:', '0.500 NDVI',
        yPos
      );
      yPos = renderGridRow(
        'Water Index (NDWI):', data.ndwi != null ? `${data.ndwi} (Moisture Index)` : 'N/A',
        'Vegetation Deficit:', data.ndvi != null ? `${Math.max(0, Math.round(((0.5 - data.ndvi) / 0.5) * 100))}% Below Norm` : 'N/A',
        yPos
      );
      yPos = renderGridRow('Satellite Mission:', 'Copernicus Sentinel-2 Harmonized', 'Spatial Resolution:', '10m Multi-spectral Pixel', yPos);

      yPos += 8;

      // --- SECTION 3: METEOROLOGICAL TELEMETRY AUDIT ---
      yPos = renderSectionTitle('3. METEOROLOGICAL TELEMETRY AUDIT (OPEN-METEO 7-DAY)', yPos);
      yPos = renderGridRow(
        'Cumulative 7d Rain:', data.rainfall_mm != null ? `${data.rainfall_mm} mm` : 'N/A',
        'Drought Threshold:', '< 10.0 mm (Deficit)',
        yPos
      );
      yPos = renderGridRow(
        'Avg Max Temp:', data.temperature_c != null ? `${data.temperature_c} °C` : 'N/A',
        'Heat Index Stress:', data.temperature_c > 35 ? 'HIGH (Exceeds 35°C)' : (data.temperature_c != null ? 'NORMAL' : 'N/A'),
        yPos
      );

      yPos += 8;

      // --- SECTION 4: STRESS DETERMINATION & RULE CONCLUSION ---
      yPos = renderSectionTitle('4. AUTOMATED STRESS DETERMINATION & PMFBY CLAIM ADVICE', yPos);

      const stressType = (data.stress_type || 'NONE').toUpperCase();
      const isDrought = stressType === 'DROUGHT';
      const stressBadgeColor = isDrought ? dangerColor : primaryColor;

      doc.rect(50, yPos, 140, 22).fill(stressBadgeColor);
      doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold')
        .text(`STRESS: ${stressType}`, 60, yPos + 6);

      doc.fillColor(darkColor).fontSize(9).font('Helvetica')
        .text(`Triggered Rule: ${data.rule_triggered || 'N/A'}`, 210, yPos + 6);
      yPos += 30;

      // claim_loss_percent should reflect the actual detected stress —
      // expected to already be set correctly upstream in
      // proofPacket.controller.js; we just avoid inventing a non-zero
      // number here if it's missing rather than showing a fake default.
      const lossPercent = data.claim_loss_percent != null ? data.claim_loss_percent : 0;

      yPos = renderGridRow(
        'Assessed Crop Loss:', `${lossPercent}% Estimated Yield Loss`,
        'Confidence Score:', `${Math.round((data.confidence ?? 0) * 100)}% Verified`,
        yPos
      );

      doc.fillColor('#374151').fontSize(8.5).font('Helvetica-Oblique')
        .text(`Evidence Summary: ${getEvidenceSummary(data.stress_type, data.rule_triggered)}`, 50, yPos, { width: 490 });

      yPos += 32;

      // --- SECTION 5: CRYPTOGRAPHIC VERIFICATION & IMMUTABLE HASH ---
      yPos = renderSectionTitle('5. CRYPTOGRAPHIC VERIFICATION & AUDIT HASH', yPos);

      const hash = data.evidence_hash || computeEvidenceHash(data);

      doc.rect(40, yPos, 515, 45).fill('#F0FDF4').stroke('#86EFAC');
      doc.fillColor('#166534').fontSize(8).font('Helvetica-Bold')
        .text('SHA-256 EVIDENCE INTEGRITY HASH (TAMPER-EVIDENT):', 50, yPos + 8);

      doc.fillColor('#14532D').fontSize(8).font('Courier')
        .text(hash, 50, yPos + 22, { width: 495 });

      yPos += 55;

      // --- FOOTER ---
      // Removed the fabricated "Compliant with PMFBY Localized Calamity
      // Guidelines 2026" claim — compliance with such a guideline has not
      // been verified, and stating it as fact would be misleading.
      doc.rect(40, 770, 515, 30).fill('#FAFAFA');
      doc.fillColor('#6B7280').fontSize(7.5).font('Helvetica')
        .text('Generated by Bhoomi OS Verified Evidence Layer | MVP demonstration — not an officially validated PMFBY document', 50, 778)
        .text('This digital proof packet is automatically sealed with satellite telemetry and weather sensor timestamps.', 50, 788);

      doc.end();
    } catch (err) {
      logger.error(`Error generating Proof Packet PDF: ${err.message}`);
      reject(err);
    }
  });
}

module.exports = {
  generateProofPacketPDF,
  computeEvidenceHash,
};