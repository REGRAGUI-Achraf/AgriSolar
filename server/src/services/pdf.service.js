const { randomUUID } = require('crypto');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit-table');

const COLORS = {
  primary: '#1b5e20',
  text: '#111827',
  muted: '#4b5563',
  border: '#d1d5db',
  background: '#f8fafc',
};

const PAGE_MARGINS = { top: 50, left: 50, right: 50, bottom: 50 };
const COMPANY_NAME = 'BAGHDAD S.A.R.L';
const TVA_RATE = 0.2;

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatMad = (amount) => {
  return `${Number(amount || 0).toFixed(2)} MAD`;
};

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
    quoteId: (safeString(quoteData.id || quoteData.quoteId).substring(0, 8).toUpperCase()) || `QT-${randomUUID().slice(0, 8).toUpperCase()}`,
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
  const y = 40; // Haut de page fixe
  doc.y = y;

  // Optionnel: fond de l'en-tête
  doc.rect(doc.page.margins.left, y, width, 80).fillOpacity(1).fill(COLORS.background);
  
  const logoPath = path.join(__dirname, '../assets/logo.png');
  let textXOffset = 10;
  
  if (fs.existsSync(logoPath)) {
    // 50, 50 equivalent -> margins.left, y+10
    doc.image(logoPath, doc.page.margins.left + 10, y + 10, { width: 100 });
    textXOffset = 130;
  }

  // Informations de l'entreprise
  doc.fillOpacity(1).fill(COLORS.primary).font('Helvetica-Bold').fontSize(20).text(data.company.name, doc.page.margins.left + textXOffset, y + 20, {
    width: width * 0.4,
  });
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted).text('Contact : contact@baghdad.ma', doc.page.margins.left + textXOffset, y + 45, {
    width: width * 0.4,
  });

  // Détails du document alignés à droite
  const infoX = doc.page.margins.left + width * 0.6;
  const infoWidth = width * 0.38;
  
  doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.primary).text(`Devis N° ${data.quoteId}`, infoX, y + 20, { align: 'right', width: infoWidth });
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted).text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, infoX, y + 45, { align: 'right', width: infoWidth });

  doc.moveTo(doc.page.margins.left, y + 95).lineTo(doc.page.width - doc.page.margins.right, y + 95).strokeColor(COLORS.border).lineWidth(0.5).stroke();
  
  // CRITIQUE : Réinitialisation propre du curseur vertical pour empêcher le chevauchement
  doc.y = 140;
  doc.x = doc.page.margins.left;
};

const drawClientSection = (doc, data) => {
  doc.x = doc.page.margins.left;
  
  const startY = doc.y;
  doc.rect(doc.x, startY, doc.page.width - doc.page.margins.left - doc.page.margins.right, 24).fillColor('#f3f4f6').fill();
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.primary).text('Informations client', doc.x + 8, startY + 6);
  
  doc.y = startY + 36;

  const rows = [
    ['Client', data.client.name],
    ['Adresse', data.client.address],
    ['Téléphone', data.client.phone],
    ['Email', data.client.email],
  ];

  rows.forEach(([label, value]) => {
    const currentY = doc.y;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.text).text(label, doc.page.margins.left, currentY, { width: 140 });
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted).text(value, doc.page.margins.left + 150, currentY);
  });
  doc.moveDown(0.5);
};

const drawTechnicalSection = (doc, data) => {
  doc.x = doc.page.margins.left;
  
  const startY = doc.y;
  doc.rect(doc.x, startY, doc.page.width - doc.page.margins.left - doc.page.margins.right, 24).fillColor('#f3f4f6').fill();
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.primary).text('Paramètres techniques', doc.x + 8, startY + 6);
  
  doc.y = startY + 36;

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
    const currentY = doc.y;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.text).text(label, doc.page.margins.left, currentY, { width: 180 });
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted).text(value, doc.page.margins.left + 190, currentY);
  });
  doc.moveDown(0.5);
};

const drawMaterialsTable = async (doc, data) => {
  doc.x = doc.page.margins.left;
  
  const startY = doc.y;
  doc.rect(doc.x, startY, doc.page.width - doc.page.margins.left - doc.page.margins.right, 24).fillColor('#f3f4f6').fill();
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.primary).text('Détail matériel', doc.x + 8, startY + 6);
  
  doc.y = startY + 36;

  const formattedDatas = Array.isArray(data.materials) && data.materials.length > 0
    ? data.materials.map((item) => {
        const quantity = Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 0;
        const unitPriceHT = Number.isFinite(Number(item.unitPriceHT)) ? Number(item.unitPriceHT) : 0;
        const lineTotalHT = Number((quantity * unitPriceHT).toFixed(2));
        return {
          designation: safeString(item.name),
          marque: safeString(item.brand),
          qte: String(quantity),
          pu: formatMad(unitPriceHT),
          total: formatMad(lineTotalHT)
        };
      })
    : [{
        designation: 'Aucun équipement défini',
        marque: '—',
        qte: '0',
        pu: formatMad(0),
        total: formatMad(0)
      }];

  const table = {
    headers: [
      { label: 'Désignation', property: 'designation', headerColor: COLORS.background },
      { label: 'Marque', property: 'marque', headerColor: COLORS.background },
      { label: 'Qté', property: 'qte', align: 'center', headerColor: COLORS.background },
      { label: 'PU HT', property: 'pu', align: 'right', headerColor: COLORS.background },
      { label: 'Total HT', property: 'total', align: 'right', headerColor: COLORS.background }
    ],
    datas: formattedDatas,
  };

  const availableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  // Explicit column sizes to prevent superimposing text and values
  // Design: 195, Marque: 110, Qte: 40, PU HT: 75, Total HT: 75 -> Sum = 495
  const columnsSize = [195, 110, 40, 75, 75];

  await doc.table(table, {
    width: availableWidth,
    columnsSize,
    padding: 4, // reduce padding to save vertical space
    prepareHeader: () => doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.primary),
    prepareRow: () => doc.font('Helvetica').fontSize(9).fillColor(COLORS.text),
  });
};

const drawTotalsSection = (doc, data) => {
  if (doc.y > doc.page.height - doc.page.margins.bottom - 120) {
    doc.addPage();
  }

  const { totalHT, tva, totalTTC, tvaRate } = data.financial;
  const startY = doc.y + 10;
  const boxWidth = 250;
  const boxX = doc.page.width - doc.page.margins.right - boxWidth;

  doc.rect(boxX, startY, boxWidth, 85).fillColor('#f8fafc').fill();
  doc.rect(boxX, startY, boxWidth, 85).strokeColor(COLORS.border).lineWidth(0.5).stroke();
  
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.muted).text('Total HT', boxX + 15, startY + 15);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.text).text(formatMad(totalHT), boxX + 110, startY + 15, { width: 125, align: 'right' });
  
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted).text(`TVA (${Math.round(tvaRate * 100)}%)`, boxX + 15, startY + 35);
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.text).text(formatMad(tva), boxX + 110, startY + 35, { width: 125, align: 'right' });
  
  doc.moveTo(boxX + 10, startY + 55).lineTo(boxX + boxWidth - 10, startY + 55).strokeColor(COLORS.border).lineWidth(0.5).stroke();

  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.primary).text('Total TTC', boxX + 15, startY + 63);
  doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.primary).text(formatMad(totalTTC), boxX + 110, startY + 61, { width: 125, align: 'right' });

  doc.y = startY + 100;
  doc.x = doc.page.margins.left;
};

const drawFooter = (doc) => {
  doc.x = doc.page.margins.left;
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