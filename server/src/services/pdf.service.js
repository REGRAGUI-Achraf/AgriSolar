const PDFDocument = require('pdfkit');
const { v4: uuidv4 } = require('uuid');

// ============================================================================
// CONSTANTES CORPORATE
// ============================================================================

const COLORS = {
  primary: '#1b5e20', // Vert Émeraude Foncé
  text: '#333333', // Gris Anthracite
  lightGray: '#f9f9f9', // Gris Clair pour alternance
  border: '#cccccc', // Bordures de tableaux
  white: '#ffffff',
};

const PAGE_WIDTH = 595; // A4
const PAGE_HEIGHT = 842; // A4
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

// ============================================================================
// FONCTION PRINCIPALE
// ============================================================================

/**
 * Génère un devis PDF complet en 2 pages
 * @param {Object} quoteData - Les données du devis
 * @returns {PDFDocument} Flux PDF prêt à être envoyé
 */
const generateQuotePDF = (quoteData) => {
  const data = normalizeQuoteData(quoteData);
  const pdf = new PDFDocument({ size: 'A4', margin: MARGIN });

  // PAGE 1
  drawPage1(pdf, data);

  // PAGE 2
  pdf.addPage();
  drawPage2(pdf, data);

  pdf.end();
  return pdf;
};

// ============================================================================
// PAGE 1 : IDENTITÉ & SYNTHÈSE TECHNIQUE
// ============================================================================

const drawPage1 = (pdf, data) => {
  let y = MARGIN;

  // Header
  drawHeaderPage1(pdf, y, data);
  y += 100;

  // Client
  drawClientInfo(pdf, y, data);
  y += 100;

  // Dimensioning Report
  drawDimensioningSection(pdf, y, data);
};

const drawHeaderPage1 = (pdf, y, data) => {
  // Bande verte
  pdf.rect(0, y, PAGE_WIDTH, 80).fill(COLORS.primary);

  // Titre
  pdf
    .fontSize(28)
    .font('Helvetica-Bold')
    .fillColor(COLORS.white)
    .text('AGRISOLAR', MARGIN, y + 12, { width: CONTENT_WIDTH });

  // Sous-titre
  pdf
    .fontSize(12)
    .font('Helvetica')
    .fillColor(COLORS.white)
    .text('DEVIS TECHNIQUE', MARGIN, y + 45, { width: CONTENT_WIDTH });

  // Infos droite
  const rightX = PAGE_WIDTH - MARGIN - 150;
  pdf
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor(COLORS.white)
    .text(`Devis: ${data.quoteId}`, rightX, y + 12, { width: 140, align: 'right' });

  const today = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  pdf
    .fontSize(9)
    .font('Helvetica')
    .text(`Date: ${today}`, rightX, y + 30, { width: 140, align: 'right' });

  pdf.text(`Commercial: ${data.commercialName}`, rightX, y + 45, { width: 140, align: 'right' });
};

const drawClientInfo = (pdf, y, data) => {
  pdf
    .fontSize(14)
    .font('Helvetica-Bold')
    .fillColor(COLORS.primary)
    .text('CLIENT', MARGIN, y);

  y += 25;

  pdf
    .moveTo(MARGIN, y - 5)
    .lineTo(PAGE_WIDTH - MARGIN, y - 5)
    .stroke(COLORS.border);

  pdf
    .fontSize(12)
    .font('Helvetica-Bold')
    .fillColor(COLORS.text)
    .text(data.client.name, MARGIN, y);

  y += 20;

  pdf
    .fontSize(10)
    .font('Helvetica')
    .fillColor(COLORS.text)
    .text(`Téléphone: ${data.client.phone || 'N/A'}`, MARGIN, y);

  y += 16;

  pdf.text(
    `Localisation: Lat ${(data.client.latitude || 0).toFixed(4)} / Lon ${(data.client.longitude || 0).toFixed(4)}`,
    MARGIN,
    y
  );

  y += 20;
  pdf
    .moveTo(MARGIN, y)
    .lineTo(PAGE_WIDTH - MARGIN, y)
    .stroke(COLORS.border);
};

const drawDimensioningSection = (pdf, y, data) => {
  pdf
    .fontSize(14)
    .font('Helvetica-Bold')
    .fillColor(COLORS.primary)
    .text('RAPPORT DE DIMENSIONNEMENT', MARGIN, y);

  y += 30;

  const tableData = [
    { label: 'Surface d\'irrigation', value: `${data.inputs.irrigationSurface}`, unit: 'ha' },
    { label: 'Type de culture', value: data.inputs.cropType, unit: '' },
    { label: 'Volume d\'eau requis', value: `${(data.inputs.dailyWaterNeed || 0).toFixed(1)}`, unit: 'm³/jour' },
    { label: 'Profondeur du puits', value: `${data.inputs.wellDepth}`, unit: 'm' },
    { label: 'HMT calculée', value: `${(data.result.hmt || 0).toFixed(1)}`, unit: 'm' },
    { label: 'Puissance crête requise', value: `${(data.result.pvPower || 0).toFixed(2)}`, unit: 'kWc' },
  ];

  const colWidth1 = 250;
  const colWidth2 = 150;
  const colWidth3 = 100;
  const rowHeight = 22;

  // En-têtes
  drawTableRow(pdf, y, ['Paramètre', 'Valeur', 'Unité'], [colWidth1, colWidth2, colWidth3], true);
  y += rowHeight;

  // Lignes
  tableData.forEach((row, idx) => {
    const isAlt = idx % 2 === 0;
    if (isAlt) {
      pdf.rect(MARGIN, y, CONTENT_WIDTH, rowHeight).fill(COLORS.lightGray);
    }
    drawTableRow(pdf, y, [row.label, row.value, row.unit], [colWidth1, colWidth2, colWidth3], false);
    y += rowHeight;
  });

  // Bordure finale
  pdf
    .moveTo(MARGIN, y)
    .lineTo(PAGE_WIDTH - MARGIN, y)
    .stroke(COLORS.border);
};

const drawTableRow = (pdf, y, cells, colWidths, isHeader) => {
  pdf.fontSize(isHeader ? 11 : 10).font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fillColor(COLORS.text);

  let x = MARGIN;
  colWidths.forEach((width, idx) => {
    // Bordures verticales
    pdf
      .moveTo(x, y)
      .lineTo(x, y + 22)
      .stroke(COLORS.border);

    // Texte centré verticalement
    pdf.text(cells[idx] || '', x + 8, y + 5, {
      width: width - 16,
      height: 22,
      align: idx === 0 ? 'left' : 'center',
      ellipsis: true,
    });

    x += width;
  });

  // Bordure droite
  pdf
    .moveTo(x, y)
    .lineTo(x, y + 22)
    .stroke(COLORS.border);

  // Bordure horizontale
  pdf
    .moveTo(MARGIN, y)
    .lineTo(PAGE_WIDTH - MARGIN, y)
    .stroke(COLORS.border);
};

// ============================================================================
// PAGE 2 : OFFRE FINANCIÈRE & VALIDATION
// ============================================================================

const drawPage2 = (pdf, data) => {
  let y = MARGIN;

  // Titre
  pdf
    .fontSize(14)
    .font('Helvetica-Bold')
    .fillColor(COLORS.primary)
    .text('OFFRE FINANCIÈRE', MARGIN, y);

  y += 30;

  // Tableau matériel
  const materialRows = data.materials.map((m) => [
    m.name,
    m.brand,
    String(m.quantity),
    `€ ${(m.unitPriceHT || 0).toFixed(2)}`,
    `€ ${((m.unitPriceHT || 0) * (m.quantity || 1)).toFixed(2)}`,
  ]);

  const matColWidths = [220, 80, 60, 90, 100];
  const matRowHeight = 20;

  // Headers
  drawTableRow(
    pdf,
    y,
    ['Désignation', 'Marque', 'Qté', 'Prix Unit. HT', 'Total HT'],
    matColWidths,
    true
  );
  y += matRowHeight;

  // Lignes matériel
  materialRows.forEach((row, idx) => {
    const isAlt = idx % 2 === 0;
    if (isAlt) {
      pdf.rect(MARGIN, y, CONTENT_WIDTH, matRowHeight).fill(COLORS.lightGray);
    }
    drawTableRow(pdf, y, row, matColWidths, false);
    y += matRowHeight;
  });

  // Bordure finale tableau
  pdf
    .moveTo(MARGIN, y)
    .lineTo(PAGE_WIDTH - MARGIN, y)
    .stroke(COLORS.border);

  y += 30;

  // Bloc Totaux
  const totalsBoxX = PAGE_WIDTH - MARGIN - 200;
  const totalsBoxY = y;

  pdf
    .rect(totalsBoxX, totalsBoxY, 180, 100)
    .stroke(COLORS.border);

  // Total HT
  pdf
    .fontSize(10)
    .font('Helvetica')
    .fillColor(COLORS.text)
    .text('Total HT:', totalsBoxX + 10, totalsBoxY + 10);

  const tva = data.totalHT * 0.2;
  const totalTTC = data.totalHT + tva;

  pdf
    .font('Helvetica-Bold')
    .fillColor(COLORS.primary)
    .text(`€ ${data.totalHT.toFixed(2)}`, totalsBoxX + 80, totalsBoxY + 10, {
      width: 90,
      align: 'right',
    });

  // Séparateur
  pdf
    .moveTo(totalsBoxX + 10, totalsBoxY + 30)
    .lineTo(totalsBoxX + 170, totalsBoxY + 30)
    .stroke(COLORS.border);

  // TVA
  pdf
    .fontSize(10)
    .font('Helvetica')
    .fillColor(COLORS.text)
    .text('TVA (20%):', totalsBoxX + 10, totalsBoxY + 35);

  pdf
    .font('Helvetica')
    .text(`€ ${tva.toFixed(2)}`, totalsBoxX + 80, totalsBoxY + 35, {
      width: 90,
      align: 'right',
    });

  // Séparateur
  pdf
    .moveTo(totalsBoxX + 10, totalsBoxY + 55)
    .lineTo(totalsBoxX + 170, totalsBoxY + 55)
    .stroke(COLORS.border);

  // Total TTC
  pdf
    .fontSize(12)
    .font('Helvetica-Bold')
    .fillColor(COLORS.primary)
    .text('TOTAL TTC:', totalsBoxX + 10, totalsBoxY + 60);

  pdf.text(`€ ${totalTTC.toFixed(2)}`, totalsBoxX + 80, totalsBoxY + 60, {
    width: 90,
    align: 'right',
  });

  // Conditions
  y += 120;

  pdf
    .fontSize(11)
    .font('Helvetica-Bold')
    .fillColor(COLORS.text)
    .text('CONDITIONS DE VALIDITÉ', MARGIN, y);

  y += 20;

  const conditions = [
    '• Validité du devis: 30 jours',
    '• Acompte requis: 50% à la signature',
    '• Solde à la livraison et installation',
    '• Maintenance comprise: 1ère année gratuite',
  ];

  pdf.fontSize(9).font('Helvetica').fillColor(COLORS.text);

  conditions.forEach((cond) => {
    pdf.text(cond, MARGIN, y);
    y += 14;
  });

  // Zones de signature
  y = PAGE_HEIGHT - MARGIN - 70;

  const sigWidth = 140;
  const sigHeight = 60;
  const spacing = (CONTENT_WIDTH - 2 * sigWidth) / 3;

  // Zone Client
  pdf
    .rect(MARGIN + spacing, y, sigWidth, sigHeight)
    .stroke(COLORS.border);

  pdf
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor(COLORS.text)
    .text('Signature Client', MARGIN + spacing, y + 5, {
      width: sigWidth,
      align: 'center',
    });

  pdf
    .fontSize(8)
    .font('Helvetica')
    .text('(Lu et approuvé)', MARGIN + spacing, y + 25, {
      width: sigWidth,
      align: 'center',
    });

  // Zone Entreprise
  const sig2X = MARGIN + spacing + sigWidth + spacing;
  pdf
    .rect(sig2X, y, sigWidth, sigHeight)
    .stroke(COLORS.border);

  pdf
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor(COLORS.text)
    .text('Cachet & Signature', sig2X, y + 5, {
      width: sigWidth,
      align: 'center',
    });

  pdf
    .fontSize(9)
    .font('Helvetica')
    .text('AgriSolar', sig2X, y + 25, {
      width: sigWidth,
      align: 'center',
    });
};

// ============================================================================
// FONCTION UTILITAIRE : NORMALISATION DES DONNÉES
// ============================================================================

const normalizeQuoteData = (quoteData) => {
  return {
    quoteId: quoteData.quoteId || `QT-${uuidv4().substring(0, 8).toUpperCase()}`,
    commercialName: quoteData.commercialName || 'AgriSolar',
    client: {
      name: quoteData.client?.name || 'Client',
      phone: quoteData.client?.phone || '',
      latitude: Number(quoteData.client?.latitude || 0),
      longitude: Number(quoteData.client?.longitude || 0),
    },
    inputs: {
      wellDepth: Number(quoteData.inputs?.wellDepth || 0),
      irrigationSurface: Number(quoteData.inputs?.irrigationSurface || 0),
      cropType: quoteData.inputs?.cropType || 'Non spécifié',
      dailyWaterNeed: Number(quoteData.inputs?.dailyWaterNeed || 0),
    },
    result: {
      panelCount: Number(quoteData.result?.panelCount || 0),
      pumpModel: quoteData.result?.pumpModel || 'Pompe',
      hmt: Number(quoteData.result?.hmt || quoteData.inputs?.wellDepth || 0),
      basinVolume: Number(quoteData.result?.basinVolume || 0),
      pvPower: Number(quoteData.result?.pvPower || 0),
    },
    materials: Array.isArray(quoteData.materials)
      ? quoteData.materials.map((m) => ({
          name: m.name || 'Matériel',
          brand: m.brand || '',
          quantity: Number(m.quantity || 1),
          unitPriceHT: Number(m.unitPriceHT || 0),
        }))
      : [],
    totalHT:
      quoteData.totalHT ||
      (Array.isArray(quoteData.materials)
        ? quoteData.materials.reduce(
            (sum, m) => sum + (Number(m.unitPriceHT || 0) * Number(m.quantity || 1)),
            0
          )
        : 0)
  };
};

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  generateQuotePDF,
};