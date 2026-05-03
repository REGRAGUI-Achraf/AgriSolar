const ensurePdfExtension = (fileName) => {
  const safe = typeof fileName === 'string' && fileName.trim() ? fileName.trim() : 'devis.pdf';
  return safe.toLowerCase().endsWith('.pdf') ? safe : `${safe}.pdf`;
};

const sanitizeFileName = (fileName) =>
  ensurePdfExtension(fileName)
    // Replace file-system unfriendly characters.
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Exporte un élément DOM en PDF (capture visuelle).
 *
 * Dépendances:
 * - `html2canvas`
 * - `jspdf`
 *
 * @param {{
 *  elementId?: string,
 *  element?: HTMLElement,
 *  fileName?: string,
 *  options?: {
 *    format?: 'a4' | string,
 *    orientation?: 'p' | 'portrait' | 'l' | 'landscape',
 *    marginMm?: number,
 *    scale?: number,
 *    backgroundColor?: string,
 *  }
 * }} params
 */
export const exportElementToPdf = async ({ elementId, element, fileName, options = {} }) => {
  if (typeof document === 'undefined') {
    throw new Error('Export PDF indisponible (DOM non accessible).');
  }

  const target = element ?? (elementId ? document.getElementById(elementId) : null);
  if (!target) {
    throw new Error("Élément à exporter introuvable (vérifie l'ID du conteneur).");
  }

  // Lazy-load heavy deps to keep initial bundle light.
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);

  const marginMm = typeof options.marginMm === 'number' ? options.marginMm : 10;
  const scale = typeof options.scale === 'number' ? options.scale : 2;
  const backgroundColor = options.backgroundColor ?? '#ffffff';

  const canvas = await html2canvas(target, {
    backgroundColor,
    scale,
    useCORS: true,
    logging: false,
    // Allow marking nodes to ignore: data-html2canvas-ignore="true"
    ignoreElements: (el) => el?.dataset?.html2canvasIgnore === 'true',
  });

  const imageData = canvas.toDataURL('image/png', 1.0);

  const pdf = new jsPDF({
    orientation: options.orientation ?? 'p',
    unit: 'mm',
    format: options.format ?? 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const availableWidth = pageWidth - marginMm * 2;
  const availableHeight = pageHeight - marginMm * 2;

  const imgProps = pdf.getImageProperties(imageData);
  const imgWidth = availableWidth;
  const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

  // First page
  pdf.addImage(imageData, 'PNG', marginMm, marginMm, imgWidth, imgHeight, undefined, 'FAST');

  // Additional pages (if needed)
  let renderedHeight = availableHeight;
  while (renderedHeight < imgHeight) {
    pdf.addPage();
    // Move the image up to show the next slice
    pdf.addImage(imageData, 'PNG', marginMm, marginMm - renderedHeight, imgWidth, imgHeight, undefined, 'FAST');
    renderedHeight += availableHeight;
  }

  pdf.save(sanitizeFileName(fileName));
};
