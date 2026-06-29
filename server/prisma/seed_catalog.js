const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const panneauxData = [
  { marque: 'Jinko Solar', modele: 'Tiger Neo N-Type', puissanceCrete: 540, technologie: 'Monocristallin', tensionVmp: 41.3, courantImp: 13.11, prixIndicatif: 1850.00 },
  { marque: 'Jinko Solar', modele: 'Tiger Pro', puissanceCrete: 550, technologie: 'Monocristallin', tensionVmp: 40.9, courantImp: 13.45, prixIndicatif: 1920.00 },
  { marque: 'Jinko Solar', modele: 'Eagle', puissanceCrete: 330, technologie: 'Polycristallin', tensionVmp: 37.8, courantImp: 8.73, prixIndicatif: 1100.00 },
  { marque: 'Canadian Solar', modele: 'HiKu6', puissanceCrete: 450, technologie: 'Monocristallin', tensionVmp: 34.6, courantImp: 13.01, prixIndicatif: 1500.00 },
  { marque: 'Canadian Solar', modele: 'BiHiKu7', puissanceCrete: 650, technologie: 'Bifacial', tensionVmp: 38.5, courantImp: 16.88, prixIndicatif: 2350.00 },
  { marque: 'Canadian Solar', modele: 'KuMax', puissanceCrete: 350, technologie: 'Polycristallin', tensionVmp: 39.4, courantImp: 8.88, prixIndicatif: 1200.00 },
  { marque: 'Trina Solar', modele: 'Vertex S', puissanceCrete: 400, technologie: 'Monocristallin', tensionVmp: 34.2, courantImp: 11.70, prixIndicatif: 1400.00 },
  { marque: 'Trina Solar', modele: 'Vertex', puissanceCrete: 500, technologie: 'Monocristallin', tensionVmp: 42.8, courantImp: 11.69, prixIndicatif: 1750.00 },
  { marque: 'Trina Solar', modele: 'Vertex', puissanceCrete: 600, technologie: 'Monocristallin', tensionVmp: 34.4, courantImp: 17.44, prixIndicatif: 2100.00 },
  { marque: 'Longi', modele: 'Hi-MO 4', puissanceCrete: 450, technologie: 'Monocristallin', tensionVmp: 41.5, courantImp: 10.85, prixIndicatif: 1550.00 },
  { marque: 'Longi', modele: 'Hi-MO 5', puissanceCrete: 540, technologie: 'Monocristallin', tensionVmp: 41.65, courantImp: 12.97, prixIndicatif: 1800.00 },
  { marque: 'SunPower', modele: 'Maxeon 3', puissanceCrete: 400, technologie: 'Monocristallin', tensionVmp: 65.8, courantImp: 6.08, prixIndicatif: 2600.00 },
  { marque: 'SunPower', modele: 'Maxeon 6', puissanceCrete: 475, technologie: 'Monocristallin', tensionVmp: 66.2, courantImp: 7.17, prixIndicatif: 3100.00 },
  { marque: 'JA Solar', modele: 'DeepBlue 3.0', puissanceCrete: 545, technologie: 'Monocristallin', tensionVmp: 41.8, courantImp: 13.04, prixIndicatif: 1820.00 },
  { marque: 'Q-Cells', modele: 'Q.PEAK DUO', puissanceCrete: 400, technologie: 'Monocristallin', tensionVmp: 31.4, courantImp: 10.98, prixIndicatif: 1450.00 },
];

const pompesData = [
  { marque: 'Pedrollo', modele: '4SR4/14', puissance: 1.1, debitNominal: 4.0, hmtMax: 90, prixIndicatif: 3600.00 },
  { marque: 'Pedrollo', modele: '4SR4/18', puissance: 1.5, debitNominal: 6.0, hmtMax: 120, prixIndicatif: 4200.00 },
  { marque: 'Pedrollo', modele: '4SR8/15', puissance: 2.2, debitNominal: 12.0, hmtMax: 100, prixIndicatif: 5800.00 },
  { marque: 'Pedrollo', modele: '6SR12/21', puissance: 5.5, debitNominal: 18.0, hmtMax: 145, prixIndicatif: 12500.00 },
  { marque: 'Pedrollo', modele: '6SR27/12', puissance: 7.5, debitNominal: 27.0, hmtMax: 110, prixIndicatif: 15800.00 },
  { marque: 'Grundfos', modele: 'SP 3A-18', puissance: 1.1, debitNominal: 3.0, hmtMax: 108, prixIndicatif: 6200.00 },
  { marque: 'Grundfos', modele: 'SP 5A-17', puissance: 1.5, debitNominal: 5.0, hmtMax: 102, prixIndicatif: 7500.00 },
  { marque: 'Grundfos', modele: 'SP 9-21', puissance: 4.0, debitNominal: 9.0, hmtMax: 130, prixIndicatif: 14200.00 },
  { marque: 'Grundfos', modele: 'SP 17-10', puissance: 5.5, debitNominal: 17.0, hmtMax: 95, prixIndicatif: 18500.00 },
  { marque: 'Lorentz', modele: 'PS2-1800 C-SJ5-12', puissance: 1.8, debitNominal: 5.0, hmtMax: 80, prixIndicatif: 12000.00 },
  { marque: 'Lorentz', modele: 'PS2-4000 C-SJ8-15', puissance: 4.0, debitNominal: 8.0, hmtMax: 120, prixIndicatif: 22000.00 },
  { marque: 'Franklin Electric', modele: 'VS4 4/14', puissance: 1.1, debitNominal: 4.0, hmtMax: 95, prixIndicatif: 4900.00 },
  { marque: 'Franklin Electric', modele: 'VS6 14/11', puissance: 4.0, debitNominal: 14.0, hmtMax: 115, prixIndicatif: 11800.00 },
  { marque: 'Franklin Electric', modele: 'VS6 19/13', puissance: 5.5, debitNominal: 19.0, hmtMax: 135, prixIndicatif: 14900.00 },
  { marque: 'Wilo', modele: 'Sub TWU 4-0414', puissance: 1.5, debitNominal: 4.0, hmtMax: 90, prixIndicatif: 5100.00 },
  { marque: 'Wilo', modele: 'Sub TWU 4-0815', puissance: 2.2, debitNominal: 8.0, hmtMax: 105, prixIndicatif: 6900.00 },
];

const variateursData = [
  { marque: 'INVT', modele: 'BPD1K5TN', puissanceMax: 1.5, plageMpptMin: 150, plageMpptMax: 400, courantSortieMax: 5.5, prixIndicatif: 2500.00 },
  { marque: 'INVT', modele: 'BPD2K2TN', puissanceMax: 2.2, plageMpptMin: 150, plageMpptMax: 400, courantSortieMax: 10.0, prixIndicatif: 3200.00 },
  { marque: 'INVT', modele: 'BPD4K0TN', puissanceMax: 4.0, plageMpptMin: 200, plageMpptMax: 400, courantSortieMax: 16.0, prixIndicatif: 4800.00 },
  { marque: 'INVT', modele: 'BPD5K5TN', puissanceMax: 5.5, plageMpptMin: 250, plageMpptMax: 800, courantSortieMax: 13.0, prixIndicatif: 6100.00 },
  { marque: 'INVT', modele: 'BPD7K5TN', puissanceMax: 7.5, plageMpptMin: 250, plageMpptMax: 800, courantSortieMax: 17.0, prixIndicatif: 7500.00 },
  { marque: 'Veichi', modele: 'SI23-D5-001G', puissanceMax: 1.5, plageMpptMin: 130, plageMpptMax: 350, courantSortieMax: 7.0, prixIndicatif: 2100.00 },
  { marque: 'Veichi', modele: 'SI23-D5-002G', puissanceMax: 2.2, plageMpptMin: 130, plageMpptMax: 350, courantSortieMax: 11.0, prixIndicatif: 2800.00 },
  { marque: 'Veichi', modele: 'SI23-D5-004G', puissanceMax: 4.0, plageMpptMin: 200, plageMpptMax: 400, courantSortieMax: 17.0, prixIndicatif: 4200.00 },
  { marque: 'Veichi', modele: 'SI23-D5-005G', puissanceMax: 5.5, plageMpptMin: 250, plageMpptMax: 800, courantSortieMax: 13.0, prixIndicatif: 5500.00 },
  { marque: 'ABB', modele: 'ACS355-03E-03A8-4', puissanceMax: 1.5, plageMpptMin: 250, plageMpptMax: 800, courantSortieMax: 3.8, prixIndicatif: 3900.00 },
  { marque: 'ABB', modele: 'ACS355-03E-05A6-4', puissanceMax: 2.2, plageMpptMin: 250, plageMpptMax: 800, courantSortieMax: 5.6, prixIndicatif: 4500.00 },
  { marque: 'ABB', modele: 'ACS355-03E-08A8-4', puissanceMax: 4.0, plageMpptMin: 250, plageMpptMax: 800, courantSortieMax: 8.8, prixIndicatif: 6300.00 },
  { marque: 'Fuji Electric', modele: 'FRENIC-Ace Solaire 2.2', puissanceMax: 2.2, plageMpptMin: 200, plageMpptMax: 400, courantSortieMax: 10.0, prixIndicatif: 4100.00 },
  { marque: 'Fuji Electric', modele: 'FRENIC-Ace Solaire 5.5', puissanceMax: 5.5, plageMpptMin: 400, plageMpptMax: 800, courantSortieMax: 13.0, prixIndicatif: 6900.00 },
];

async function main() {
  console.log('Début du seeding du catalogue...');

  try {
    // 1. Panneaux Photovoltaïques
    console.log('Seeding Panneaux Photovoltaïques...');
    const resultPanneaux = await prisma.panneauPhotovoltaique.createMany({
      data: panneauxData,
      skipDuplicates: true,
    });
    console.log(`✓ ${resultPanneaux.count} panneaux insérés.`);

    // 2. Pompes Hydrauliques Immergées
    console.log('Seeding Pompes Hydrauliques...');
    const resultPompes = await prisma.pompeHydraulique.createMany({
      data: pompesData,
      skipDuplicates: true,
    });
    console.log(`✓ ${resultPompes.count} pompes insérées.`);

    // 3. Variateurs Solaires de Pompage
    console.log('Seeding Variateurs Solaires...');
    const resultVariateurs = await prisma.variateurSolaire.createMany({
      data: variateursData,
      skipDuplicates: true,
    });
    console.log(`✓ ${resultVariateurs.count} variateurs insérés.`);

    console.log('Seeding terminé avec succès !');
  } catch (error) {
    console.error('Erreur lors du seeding :', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
