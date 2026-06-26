const { randomUUID } = require('crypto');
const PDFDocument = require('pdfkit-table');

const COLORS = {
  primary: '#1b5e20',
  text: '#111827',
  muted: '#4b5563',
  border: '#d1d5db',
  background: '#f8fafc',
};

const PAGE_MARGINS = { top: 50, left: 50, right: 50, bottom: 50 };
const COMPANY_NAME = 'AgriSolar';
const TVA_RATE = 0.2;

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatMad = (amount) => `MAD ${Number(amount || 0).toFixed(2)}`;

const sanitizeFilenamePart = (value) =>
  String(value || 'Client')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 60) || 'Client';

const safeString = (value) => {
  if (value === null || value === undefined) return '—';
  return String(value).trim() === '' ? '—' : String(value);
};

const normalizeMaterials = (materials) =>
  Array.isArray(materials)
    ? materials.map((item) => ({
        name: safeString(item.name),
        brand: safeString(item.brand),
        quantity: Math.max(0, toNumber(item.quantity, 0)),
        unitPriceHT: Math.max(0, toNumber(item.unitPriceHT, 0)),
      }))
    : [];

const computeFinancials = (materials) => {
  const totalHT = materials.reduce((sum, item) => sum + item.quantity * item.unitPriceHT, 0);
  const tva = Number((totalHT * TVA_RATE).toFixed(2));
  const totalTTC = Number((totalHT + tva).toFixed(2));
  return { totalHT, tva, totalTTC, tvaRate: TVA_RATE };
};

const parseNotes = (notes) => {
  if (!notes) return {};
  if (typeof notes === 'object') return notes;
  try {
    return JSON.parse(notes);
  } catch {
    return { raw: String(notes) };
  }
};

const normalizeQuoteData = (quoteData) => {
  const client = quoteData.client || {};
    const technical = quoteData.technical || {};
  const notes = parseNotes(quoteData.notes);
  const inputs = quoteData.inputs || {};
  const fallbackMaterials = Array.isArray(notes.materials) ? notes.materials : [];
  const materials = normalizeMaterials(quoteData.materials || fallbackMaterials);
  const financial = computeFinancials(materials);

  return {
    quoteId: safeString(quoteData.quoteId) || `QT-${randomUUID().slice(0, 8).toUpperCase()}`,
    company: {
      name: COMPANY_NAME,
      address: safeString(quoteData.company?.address) || '—',
    },
    client: {
      name: safeString(client.name),
      address: [client.address, client.city, client.region, client.country].filter(Boolean).join(', ') || '—',
      phone: safeString(client.phone),
      email: safeString(client.email),
      latitude: client.latitude ?? null,
      longitude: client.longitude ?? null,
    },
    inputs: {
      cropType: safeString(inputs.cropType),
      irrigationSurface: toNumber(inputs.irrigationSurface, 0),
      dailyWaterNeed: toNumber(inputs.dailyWaterNeed, 0),
      wellDepth: toNumber(inputs.wellDepth, 0),
    },
    technical: {
      installationLabel: safeString(technical.installationLabel || notes.typeInstallation),
      tensionLabel: safeString(technical.tensionLabel || notes.tension),
      tiltLabel: safeString(technical.tiltLabel || notes.panelTilt),
      selectedPanelLabel: safeString(technical.selectedPanelLabel || notes.selectedPanelLabel),
      selectedPumpBrand: safeString(technical.selectedPumpBrand || notes.selectedPumpBrand),
      distanceWellToBasin: toNumber(technical.distanceWellToBasin ?? notes.distanceWellToBasin, 0),
      panelCount: toNumber(technical.panelCount ?? quoteData.inputs?.panelCount ?? 0, 0),
    },
    materials,
    financial,
  };
};

const generateQuotePDF = async (quoteData, res = null) => {
  const data = normalizeQuoteData(quoteData);
  const doc = new PDFDocument({ size: 'A4', margins: PAGE_MARGINS });

  const renderPdf = () => {
    drawHeader(doc, data);
    doc.moveDown(1);
    drawClientSection(doc, data);
    doc.moveDown(1);
    drawTechnicalSection(doc, data);
    doc.moveDown(1);
    return drawMaterialsTable(doc, data)
      .then(() => {
        doc.moveDown(1);
        drawTotalsSection(doc, data);
        doc.moveDown(1);
        drawFooter(doc, data);
      })
      .then(() => {
        doc.end();
      });
  };

  if (res) {
    return new Promise((resolve, reject) => {
      doc.on('error', (err) => {
        console.error(err);
        reject(err);
      });
      res.on('error', (err) => {
        console.error(err);
        reject(err);
      });
      doc.pipe(res);
      renderPdf().then(resolve).catch(reject);
    });
  }

  await renderPdf();
  return doc;
};

const drawHeader = (doc, data) => {
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const y = doc.y;

  doc.rect(doc.page.margins.left, y, width, 60).fillOpacity(1).fill(COLORS.background);
  doc.fillOpacity(1).fill(COLORS.primary).font('Helvetica-Bold').fontSize(22).text(data.company.name, doc.page.margins.left + 10, y + 10, {
    width: width * 0.6,
  });

  doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted).text(`Devis : ${data.quoteId}`, doc.page.margins.left + 10, y + 36, {
    width: width * 0.6,
  });

  const infoX = doc.page.margins.left + width * 0.65;
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.text).text('Date', infoX, y + 10, { align: 'right' });
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.text).text(new Date().toLocaleDateString('fr-FR'), {
    align: 'right',
  });

  doc.moveTo(doc.page.margins.left, y + 70).lineTo(doc.page.width - doc.page.margins.right, y + 70).strokeColor(COLORS.border).lineWidth(0.5).stroke();
  doc.y = y + 80;
};

const drawClientSection = (doc, data) => {
  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.primary).text('Informations client');
  doc.moveDown(0.5);

  const rows = [
    ['Client', data.client.name],
    ['Adresse', data.client.address],
    ['Téléphone', data.client.phone],
    ['Email', data.client.email],
  ];

  rows.forEach(([label, value]) => {
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.text).text(`${label}: `, {
      continued: true,
    });
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted).text(value);
  });
};

const drawTechnicalSection = (doc, data) => {
  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.primary).text('Paramètres techniques');
  doc.moveDown(0.5);

  const rows = [
    ['Culture', data.inputs.cropType],
    ['Surface (ha)', data.inputs.irrigationSurface || '—'],
    ['Volume journalier (m³/jour)', data.inputs.dailyWaterNeed || '—'],
    ['Profondeur du puits (m)', data.inputs.wellDepth || '—'],
    ['Type d’installation', data.technical.installationLabel],
    ['Tension', data.technical.tensionLabel],
    ['Inclinaison', data.technical.tiltLabel],
    ['Modèle de panneau', data.technical.selectedPanelLabel],
    ['Marque de pompe', data.technical.selectedPumpBrand],
  ];

  rows.forEach(([label, value]) => {
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.text).text(`${label}: `, {
      continued: true,
    });
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted).text(value);
  });
};

const drawMaterialsTable = async (doc, data) => {
  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.primary).text('Détail matériel');
  doc.moveDown(0.5);

  const formattedRows = Array.isArray(data.materials) && data.materials.length > 0
    ? data.materials.map((item) => {
        const quantity = Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 0;
        const unitPriceHT = Number.isFinite(Number(item.unitPriceHT)) ? Number(item.unitPriceHT) : 0;
        const lineTotalHT = Number((quantity * unitPriceHT).toFixed(2));
        return [
          safeString(item.name),
          safeString(item.brand),
          String(quantity),
          formatMad(unitPriceHT),
          formatMad(lineTotalHT),
        ];
      })
    : [[
        'Aucun équipement défini',
        '—',
        '0',
        formatMad(0),
        formatMad(0),
      ]];

  const table = {
    headers: ['Désignation', 'Marque', 'Qté', 'PU HT (MAD)', 'Total HT (MAD)'],
    rows: formattedRows,
  };

  await doc.table(table, {
    width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
    columnsSize: [180, 120, 50, 90, 90],
    padding: 6,
    prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.primary),
    prepareRow: () => doc.font('Helvetica').fontSize(9).fillColor(COLORS.text),
    columnSpacing: 8,
  });
};

const drawTotalsSection = (doc, data) => {
  const { totalHT, tva, totalTTC, tvaRate } = data.financial;
  const startY = doc.y;
  const boxWidth = 240;
  const boxX = doc.page.width - doc.page.margins.right - boxWidth;

  doc.rect(boxX, startY, boxWidth, 80).strokeColor(COLORS.border).lineWidth(0.5).stroke();
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.text).text('Total HT', boxX + 10, startY + 10);
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.text).text(`TVA (${Math.round(tvaRate * 100)}%)`, boxX + 10, startY + 28);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.text).text('Total TTC', boxX + 10, startY + 48);

  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.primary).text(formatMad(totalHT), boxX + 140, startY + 10, { width: 86, align: 'right' });
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.primary).text(formatMad(tva), boxX + 140, startY + 28, { width: 86, align: 'right' });
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.primary).text(formatMad(totalTTC), boxX + 140, startY + 48, { width: 86, align: 'right' });

  doc.y = startY + 90;
};

const drawFooter = (doc) => {
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.text).text('Conditions de validation', { underline: true });
  doc.moveDown(0.4);
  const notes = [
    'Validité du devis : 30 jours.',
    'Acompte requis : 50% à la signature.',
    'Solde à la livraison et installation.',
    'Maintenance comprise la 1ère année.',
  ];
  notes.forEach((note) => {
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text(`• ${note}`);
  });
};

const getQuotePdfFilename = (quoteData) => {
  const clientName = sanitizeFilenamePart(quoteData.client?.name || 'Client');
  const quoteId = sanitizeFilenamePart(quoteData.quoteId || `QT-${randomUUID().slice(0, 8).toUpperCase()}`);
  return `Devis_AgriSolar_${clientName}_${quoteId}.pdf`;
};

module.exports = {
  generateQuotePDF,
  getQuotePdfFilename,
};
