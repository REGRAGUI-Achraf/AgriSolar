const { randomUUID } = require('crypto');
const PDFDocument = require('pdfkit-table');

const COLORS = {
  primary: '#1b5e20',
  text: '#333333',
  muted: '#5b6770',
  border: '#d1d5db',
  background: '#f8fafc',
};

const PAGE_MARGINS = { top: 50, left: 50, right: 50, bottom: 50 };
const COMPANY = {
  name: 'AgriSolar',
  ice: 'ICE: 001234567890',
};

const formatMad = (amount) => `MAD ${Number(amount || 0).toFixed(2)}`;

const sanitizeFilenamePart = (value) =>
  String(value || 'Client')
    .normalize('NFKD')
    .replace(/[^-\u007E]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'Client';

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeMaterials = (materials) =>
  Array.isArray(materials)
    ? materials.map((item) => ({
        name: item.name || 'Matériel',
        brand: item.brand || '—',
        quantity: toNumber(item.quantity, 1),
        unitPriceHT: toNumber(item.unitPriceHT, 0),
      }))
    : [];

const buildFinancialSummary = (materials, financial = {}, totalPrice) => {
  const computedHT = materials.reduce((acc, item) => acc + item.unitPriceHT * item.quantity, 0);
  const totalHT = toNumber(financial.totalHT ?? totalPrice ?? computedHT, computedHT);
  const tva = toNumber(financial.tva ?? totalHT * 0.2, totalHT * 0.2);
  const totalTTC = toNumber(financial.totalTTC ?? totalHT + tva, totalHT + tva);
  return { totalHT, tva, totalTTC, currency: 'MAD' };
};

const parseTechnicalNotes = (notes) => {
  if (typeof notes !== 'string' || !notes.trim()) return {};
  try {
    return JSON.parse(notes);
  } catch {
    return {};
  }
};

const buildMaterials = (quoteData) => {
  const materials = normalizeMaterials(quoteData.materials);
  if (materials.length > 0) return materials;

  const panelCount = Math.max(1, toNumber(quoteData.result?.panelCount, 1));
  const requiredPower = Math.max(1, toNumber(quoteData.result?.pvPower || quoteData.technical?.pvPower, 1));
  const basinVolume = Math.max(1, toNumber(quoteData.result?.basinVolume, 1));
  const distance = Math.max(1, toNumber(quoteData.technical?.distanceWellToBasin, 1));

  const referenceTotal = toNumber(quoteData.totalPrice ?? quoteData.financial?.totalHT ?? requiredPower * 1200, requiredPower * 1200);
  const panelShare = Math.round(referenceTotal * 0.42);
  const pumpShare = Math.round(referenceTotal * 0.28);
  const controllerShare = Math.round(referenceTotal * 0.14);
  const accessoriesShare = Math.round(referenceTotal * 0.1);
  const basinShare = Math.max(0, referenceTotal - (panelShare + pumpShare + controllerShare + accessoriesShare));

  return [
    {
      name: 'Panneaux photovoltaïques',
      brand: quoteData.technical?.selectedPanelLabel || 'Modèle sélectionné',
      quantity: panelCount,
      unitPriceHT: panelCount > 0 ? panelShare / panelCount : panelShare,
    },
    {
      name: 'Pompe immergée',
      brand: quoteData.result?.pumpModel || quoteData.technical?.selectedPumpBrand || 'Pompe',
      quantity: 1,
      unitPriceHT: pumpShare,
    },
    {
      name: 'Contrôleur / Protections',
      brand: quoteData.technical?.tensionLabel || 'Système',
      quantity: 1,
      unitPriceHT: controllerShare,
    },
    {
      name: 'Accessoires & Tuyauterie',
      brand: `Distance ${distance} m`,
      quantity: 1,
      unitPriceHT: accessoriesShare,
    },
    {
      name: 'Bassin / Étanchéité',
      brand: `Volume ${basinVolume} m³`,
      quantity: 1,
      unitPriceHT: basinShare,
    },
  ];
};

const normalizeQuoteData = (quoteData) => {
  const technicalNotes = parseTechnicalNotes(quoteData.notes);
  const materials = buildMaterials(quoteData);
  const financial = buildFinancialSummary(materials, quoteData.financial, quoteData.totalPrice);

  return {
    quoteId: quoteData.quoteId || `QT-${randomUUID().slice(0, 8).toUpperCase()}`,
    commercialName: quoteData.commercialName || COMPANY.name,
    company: {
      name: quoteData.company?.name || COMPANY.name,
      ice: quoteData.company?.ice || COMPANY.ice,
    },
    client: {
      name: quoteData.client?.name || 'Client',
      phone: quoteData.client?.phone || 'N/A',
      email: quoteData.client?.email || 'N/A',
      address: quoteData.client?.address || 'N/A',
      city: quoteData.client?.city || 'N/A',
      region: quoteData.client?.region || 'N/A',
      country: quoteData.client?.country || 'N/A',
      latitude: toNumber(quoteData.client?.latitude),
      longitude: toNumber(quoteData.client?.longitude),
    },
    inputs: {
      wellDepth: toNumber(quoteData.inputs?.wellDepth),
      irrigationSurface: toNumber(quoteData.inputs?.irrigationSurface),
      cropType: quoteData.inputs?.cropType || 'Non spécifié',
      dailyWaterNeed: toNumber(quoteData.inputs?.dailyWaterNeed),
    },
    technical: {
      installationLabel: quoteData.technical?.installationLabel || technicalNotes.typeInstallation || '—',
      tensionLabel: quoteData.technical?.tensionLabel || technicalNotes.tension || '—',
      tiltLabel:
        quoteData.technical?.tiltLabel ||
        (technicalNotes.useOptimalTilt ? 'Inclinaison optimale 30°' : technicalNotes.panelTilt ? `${technicalNotes.panelTilt}°` : '—'),
      hmt: toNumber(quoteData.technical?.hmt || quoteData.inputs?.wellDepth),
      pvPower: toNumber(quoteData.technical?.pvPower || quoteData.result?.pvPower),
      selectedPanelLabel: quoteData.technical?.selectedPanelLabel || technicalNotes.selectedPanelId || '—',
      selectedPumpBrand: quoteData.technical?.selectedPumpBrand || technicalNotes.selectedPumpBrand || '—',
      distanceWellToBasin: toNumber(technicalNotes.distanceWellToBasin ?? quoteData.technical?.distanceWellToBasin),
    },
    result: {
      panelCount: toNumber(quoteData.result?.panelCount),
      pumpModel: quoteData.result?.pumpModel || 'Pompe',
      basinVolume: toNumber(quoteData.result?.basinVolume),
    },
    materials,
    financial,
  };
};

const generateQuotePDF = async (quoteData) => {
  const data = normalizeQuoteData(quoteData);
  const doc = new PDFDocument({ size: 'A4', margins: PAGE_MARGINS });

  drawHeader(doc, data);
  doc.moveDown(1);
  drawClientSummary(doc, data);
  doc.moveDown(0.8);
  await drawTechnicalTable(doc, data);
  doc.moveDown(0.8);
  await drawFinancialTable(doc, data);
  doc.moveDown(0.8);
  drawTotalsAndFooter(doc, data);

  doc.end();
  return doc;
};

const drawHeader = (doc, data) => {
  const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const y = doc.y;

  doc.rect(doc.page.margins.left, y, contentWidth, 60).fillOpacity(1).fill(COLORS.background);
  doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(22).text('AGRISOLAR', doc.page.margins.left + 10, y + 10, {
    width: contentWidth * 0.55,
  });

  doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted).text('Devis technique professionnel', doc.page.margins.left + 10, y + 35, {
    width: contentWidth * 0.55,
  });

  const infoX = doc.page.margins.left + contentWidth * 0.6;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.text).text(data.company.name, infoX, y + 10, {
    width: contentWidth * 0.4,
    align: 'right',
  });
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.text).text(data.company.ice, infoX, y + 25, {
    width: contentWidth * 0.4,
    align: 'right',
  });
  doc.text(`Devis: ${data.quoteId}`, infoX, y + 40, {
    width: contentWidth * 0.4,
    align: 'right',
  });

  doc.fillOpacity(1).strokeColor(COLORS.border).lineWidth(0.5)
    .moveTo(doc.page.margins.left, y + 70)
    .lineTo(doc.page.width - doc.page.margins.right, y + 70)
    .stroke();

  doc.y = y + 80;
};

const drawClientSummary = (doc, data) => {
  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.primary).text('Client');
  doc.moveDown(0.4);

  const clientRows = [
    ['Nom', data.client.name],
    ['Téléphone', data.client.phone],
    ['Email', data.client.email],
    ['Adresse', data.client.address],
    ['Ville', data.client.city],
    ['Région', data.client.region],
    ['Pays', data.client.country],
    ['Localisation', `Lat ${data.client.latitude.toFixed(4)} / Lon ${data.client.longitude.toFixed(4)}`],
  ];

  clientRows.forEach(([label, value]) => {
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.text).text(`${label}: `, { continued: true });
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted).text(String(value));
  });
};

const drawTechnicalTable = async (doc, data) => {
  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.primary).text('Paramètres techniques');
  doc.moveDown(0.35);

  const table = {
    headers: ['Paramètre', 'Valeur', 'Unité'],
    rows: [
      ['Culture', data.inputs.cropType, ''],
      ['Surface d’irrigation', String(data.inputs.irrigationSurface), 'ha'],
      ['Volume d’eau requis', String(data.inputs.dailyWaterNeed), 'm³/jour'],
      ['Profondeur du puits', String(data.inputs.wellDepth), 'm'],
      ['HMT calculée', String(data.technical.hmt), 'm'],
      ['Puissance crête requise', String(data.technical.pvPower), 'kWc'],
      ['Type d’installation', data.technical.installationLabel, ''],
      ['Tension du système', data.technical.tensionLabel, ''],
      ['Inclinaison', data.technical.tiltLabel, ''],
      ['Marque de la pompe', data.technical.selectedPumpBrand, ''],
    ],
  };

  await doc.table(table, {
    width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
    columnsSize: [250, 170, 70],
    padding: 6,
    prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.primary),
    prepareRow: () => doc.font('Helvetica').fontSize(9).fillColor(COLORS.text),
  });
};

const drawFinancialTable = async (doc, data) => {
  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.primary).text('Offre financière');
  doc.moveDown(0.35);

  const rows = data.materials.map((item) => {
    const quantity = toNumber(item.quantity, 1);
    const unitPriceHT = toNumber(item.unitPriceHT, 0);
    return {
      name: item.name,
      brand: item.brand,
      quantity: String(quantity),
      unitPriceHT: formatMad(unitPriceHT),
      lineTotalHT: formatMad(quantity * unitPriceHT),
    };
  });

  await doc.table(
    {
      headers: ['Matériel', 'Marque', 'Qté', 'Prix unit. HT', 'Total HT'],
      rows: rows.length
        ? rows
        : [
            {
              name: 'Aucun matériel',
              brand: '',
              quantity: '0',
              unitPriceHT: formatMad(0),
              lineTotalHT: formatMad(0),
            },
          ],
    },
    {
      width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
      columnsSize: [200, 100, 40, 90, 90],
      padding: 6,
      prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.primary),
      prepareRow: () => doc.font('Helvetica').fontSize(9).fillColor(COLORS.text),
    }
  );
};

const drawTotalsAndFooter = (doc, data) => {
  const { totalHT, tva, totalTTC } = data.financial;

  doc.moveDown(0.8);

  const boxWidth = 220;
  const boxHeight = 92;
  const boxX = doc.page.width - doc.page.margins.right - boxWidth;
  const boxY = doc.y;

  doc.rect(boxX, boxY, boxWidth, boxHeight).stroke(COLORS.border);
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.text).text('Total HT', boxX + 10, boxY + 10);
  doc.text('TVA (20%)', boxX + 10, boxY + 28);
  doc.font('Helvetica-Bold').fillColor(COLORS.primary).text(formatMad(totalHT), boxX + 110, boxY + 10, { width: 100, align: 'right' });
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.text).text(formatMad(tva), boxX + 110, boxY + 28, { width: 100, align: 'right' });
  doc.moveTo(boxX + 10, boxY + 50).lineTo(boxX + boxWidth - 10, boxY + 50).stroke(COLORS.border);
  doc.font('Helvetica-Bold').fillColor(COLORS.primary).text('TOTAL TTC', boxX + 10, boxY + 56);
  doc.text(formatMad(totalTTC), boxX + 110, boxY + 56, { width: 100, align: 'right' });

  doc.moveDown(5.2);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.text).text('Conditions de validité');
  doc.moveDown(0.4);
  ['Validité du devis: 30 jours', 'Acompte requis: 50% à la signature', 'Solde à la livraison et installation', 'Maintenance comprise: 1ère année gratuite'].forEach((line) => {
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.text).text(`• ${line}`);
  });
};

const getQuotePdfFilename = (quoteData) => {
  const clientName = sanitizeFilenamePart(quoteData?.client?.name || 'Client');
  const quoteId = sanitizeFilenamePart(quoteData?.quoteId || `QT-${randomUUID().slice(0, 8).toUpperCase()}`);
  return `Devis_AgriSolar_${clientName}_${quoteId}.pdf`;
};

module.exports = {
  generateQuotePDF,
  getQuotePdfFilename,
};
