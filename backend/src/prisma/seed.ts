import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Initialisation des données PANI GESTION ---');

  // 1. Rôles
  const rolesData = [
    { nom: 'Administrateur', description: 'Accès complet à tous les modules' },
    { nom: 'Gestionnaire', description: 'Stocks, ventes, achats et rapports' },
    { nom: 'Vendeur', description: 'Enregistrement des ventes et consultation limitée' },
    { nom: 'Caissier', description: 'Gestion de caisse et encaissements' },
    { nom: 'Comptable', description: 'Dépenses, dettes et rapports financiers' },
  ];

  for (const r of rolesData) {
    await prisma.role.upsert({
      where: { nom: r.nom },
      update: { description: r.description },
      create: r,
    });
  }
  console.log('✓ 5 Rôles créés/mis à jour');

  const adminRole = await prisma.role.findUnique({ where: { nom: 'Administrateur' } });
  const vendeurRole = await prisma.role.findUnique({ where: { nom: 'Vendeur' } });

  // 2. Administrateur par défaut
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Admin123!', salt);

  const adminUser = await prisma.utilisateur.upsert({
    where: { email: 'admin@pani.com' },
    update: {},
    create: {
      nom: 'Sissoko',
      prenom: 'Administrateur',
      email: 'admin@pani.com',
      telephone: '+223 70 00 00 00',
      motDePasse: passwordHash,
      roleId: adminRole!.id,
      actif: true,
    },
  });
  console.log('✓ Compte Administrateur créé: admin@pani.com / Admin123!');

  // Compte Vendeur de démo
  await prisma.utilisateur.upsert({
    where: { email: 'vendeur@pani.com' },
    update: {},
    create: {
      nom: 'Coulibaly',
      prenom: 'Vendeur',
      email: 'vendeur@pani.com',
      telephone: '+223 71 00 00 00',
      motDePasse: passwordHash,
      roleId: vendeurRole!.id,
      actif: true,
    },
  });
  console.log('✓ Compte Vendeur créé: vendeur@pani.com / Admin123!');

  // 3. Produit principal "Pani"
  let produitPani = await prisma.produit.findFirst({
    where: { nom: 'Pani' },
  });

  if (!produitPani) {
    produitPani = await prisma.produit.create({
      data: {
        nom: 'Pani',
        description: 'Produit consommable Pani - Conditionnement commercial',
        unite: 'unité',
        actif: true,
      },
    });
    console.log('✓ Produit principal "Pani" créé');
  }

  // 4. Tarifs (selon le cahier des charges)
  const tarifsInitiaux = [
    { designation: 'Petit prix', prix: 500 },
    { designation: 'Prix intermédiaire 1', prix: 1000 },
    { designation: 'Prix intermédiaire 2', prix: 1500 },
    { designation: 'Prix supérieur', prix: 2000 },
    { designation: 'Prix grossiste / spécifique', prix: 2500 },
  ];

  for (const t of tarifsInitiaux) {
    const exist = await prisma.tarif.findFirst({
      where: {
        produitId: produitPani.id,
        prix: new Prisma.Decimal(t.prix),
      },
    });

    if (!exist) {
      await prisma.tarif.create({
        data: {
          produitId: produitPani.id,
          designation: t.designation,
          prix: new Prisma.Decimal(t.prix),
          actif: true,
        },
      });
    }
  }
  console.log('✓ 5 Tarifs enregistrés (500F, 1000F, 1500F, 2000F, 2500F)');

  // 5. Stock initial de démonstration (500 unités)
  const dernierMouvement = await prisma.mouvementStock.findFirst({
    where: { produitId: produitPani.id },
  });

  if (!dernierMouvement) {
    await prisma.mouvementStock.create({
      data: {
        produitId: produitPani.id,
        typeOperation: 'entree',
        quantite: new Prisma.Decimal(500),
        stockAvant: new Prisma.Decimal(0),
        stockApres: new Prisma.Decimal(500),
        motif: 'Stock initial de démarrage',
      },
    });
    console.log('✓ Stock initial de 500 unités enregistré');
  }

  // 6. Clients de base
  const clientsData = [
    { nom: 'Client Comptant', prenom: '', telephone: '', typeClient: 'particulier' },
    { nom: 'Traoré', prenom: 'Mamadou', telephone: '+223 76 11 22 33', adresse: 'Marché Médine', typeClient: 'grossiste' },
    { nom: 'Diallo', prenom: 'Awa', telephone: '+223 66 44 55 66', adresse: 'Badalabougou', typeClient: 'particulier' },
    { nom: 'Konaté', prenom: 'Oumar', telephone: '+223 79 88 99 00', adresse: 'Faladié', typeClient: 'revendeur' },
  ];

  for (const c of clientsData) {
    const exist = await prisma.client.findFirst({
      where: { nom: c.nom, prenom: c.prenom || null },
    });
    if (!exist) {
      await prisma.client.create({ data: c });
    }
  }
  console.log('✓ 4 Clients créés');

  // 7. Fournisseur de base
  const existF = await prisma.fournisseur.findFirst({ where: { nom: 'Fournisseur Central Pani' } });
  if (!existF) {
    await prisma.fournisseur.create({
      data: {
        nom: 'Fournisseur Central Pani',
        contact: 'Service Commercial',
        telephone: '+223 20 22 33 44',
        adresse: 'Zone Industrielle',
        email: 'contact@fournisseur-pani.com',
      },
    });
    console.log('✓ Fournisseur initial créé');
  }

  console.log('=== SEEDING TERMINÉ AVEC SUCCÈS ===');
}

main()
  .catch((e) => {
    console.error('Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

