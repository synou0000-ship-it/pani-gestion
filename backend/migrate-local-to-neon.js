const { PrismaClient } = require('@prisma/client');

const localUrl = 'postgresql://postgres:root@localhost:5432/pani_gestion';
const neonUrl = 'postgresql://neondb_owner:npg_pOney2HUcto4@ep-odd-credit-bchkdnqo-pooler.c-16.us-east-1.aws.neon.tech/neondb?sslmode=require';

const localPrisma = new PrismaClient({ datasourceUrl: localUrl });
const neonPrisma = new PrismaClient({ datasourceUrl: neonUrl });

async function migrate() {
  console.log('🚀 Début de la migration des données vers Vercel Neon PostgreSQL...');

  try {
    // 1. Rôles
    const roles = await localPrisma.role.findMany();
    for (const r of roles) {
      await neonPrisma.role.upsert({
        where: { id: r.id },
        update: r,
        create: r,
      });
    }
    console.log(`✅ ${roles.length} rôles migrés`);

    // 2. Utilisateurs
    const users = await localPrisma.utilisateur.findMany();
    for (const u of users) {
      await neonPrisma.utilisateur.upsert({
        where: { id: u.id },
        update: u,
        create: u,
      });
    }
    console.log(`✅ ${users.length} utilisateurs migrés`);

    // 3. Produits
    const produits = await localPrisma.produit.findMany();
    for (const p of produits) {
      await neonPrisma.produit.upsert({
        where: { id: p.id },
        update: p,
        create: p,
      });
    }
    console.log(`✅ ${produits.length} produits migrés`);

    // 4. Tarifs
    const tarifs = await localPrisma.tarif.findMany();
    for (const t of tarifs) {
      await neonPrisma.tarif.upsert({
        where: { id: t.id },
        update: t,
        create: t,
      });
    }
    console.log(`✅ ${tarifs.length} tarifs migrés`);

    // 5. Clients
    const clients = await localPrisma.client.findMany();
    for (const c of clients) {
      await neonPrisma.client.upsert({
        where: { id: c.id },
        update: c,
        create: c,
      });
    }
    console.log(`✅ ${clients.length} clients migrés`);

    // 6. Fournisseurs
    const fournisseurs = await localPrisma.fournisseur.findMany();
    for (const f of fournisseurs) {
      await neonPrisma.fournisseur.upsert({
        where: { id: f.id },
        update: f,
        create: f,
      });
    }
    console.log(`✅ ${fournisseurs.length} fournisseurs migrés`);

    // 7. Caisses
    const caisses = await localPrisma.caisse.findMany();
    for (const c of caisses) {
      await neonPrisma.caisse.upsert({
        where: { id: c.id },
        update: c,
        create: c,
      });
    }
    console.log(`✅ ${caisses.length} sessions de caisse migrées`);

    // 8. Ventes
    const ventes = await localPrisma.vente.findMany();
    for (const v of ventes) {
      await neonPrisma.vente.upsert({
        where: { id: v.id },
        update: v,
        create: v,
      });
    }
    console.log(`✅ ${ventes.length} ventes migrées`);

    // 9. Vente Détails
    const venteDetails = await localPrisma.venteDetail.findMany();
    for (const vd of venteDetails) {
      await neonPrisma.venteDetail.upsert({
        where: { id: vd.id },
        update: vd,
        create: vd,
      });
    }
    console.log(`✅ ${venteDetails.length} lignes de détails de ventes migrées`);

    // 10. Achats
    const achats = await localPrisma.achat.findMany();
    for (const a of achats) {
      await neonPrisma.achat.upsert({
        where: { id: a.id },
        update: a,
        create: a,
      });
    }
    console.log(`✅ ${achats.length} achats migrés`);

    // 11. Achat Détails
    const achatDetails = await localPrisma.achatDetail.findMany();
    for (const ad of achatDetails) {
      await neonPrisma.achatDetail.upsert({
        where: { id: ad.id },
        update: ad,
        create: ad,
      });
    }
    console.log(`✅ ${achatDetails.length} lignes d'achats migrées`);

    // 12. Mouvements de caisse (avant les dépenses car les dépenses y font référence)
    const mvtsCaisse = await localPrisma.mouvementCaisse.findMany();
    for (const mc of mvtsCaisse) {
      await neonPrisma.mouvementCaisse.upsert({
        where: { id: mc.id },
        update: mc,
        create: mc,
      });
    }
    console.log(`✅ ${mvtsCaisse.length} mouvements de caisse migrés`);

    // 13. Dépenses
    const depenses = await localPrisma.depense.findMany();
    for (const d of depenses) {
      await neonPrisma.depense.upsert({
        where: { id: d.id },
        update: d,
        create: d,
      });
    }
    console.log(`✅ ${depenses.length} dépenses migrées`);

    // 14. Mouvements de stock
    const mvtsStock = await localPrisma.mouvementStock.findMany();
    for (const ms of mvtsStock) {
      await neonPrisma.mouvementStock.upsert({
        where: { id: ms.id },
        update: ms,
        create: ms,
      });
    }
    console.log(`✅ ${mvtsStock.length} mouvements de stock migrés`);

    // 15. Réaligner les séquences PostgreSQL (ID autoincrement)
    const tables = [
      'Role', 'Utilisateur', 'Produit', 'Tarif', 'Client',
      'Fournisseur', 'Caisse', 'Vente', 'VenteDetail', 'Achat',
      'AchatDetail', 'Depense', 'MouvementStock', 'MouvementCaisse'
    ];
    for (const t of tables) {
      try {
        await neonPrisma.$executeRawUnsafe(
          `SELECT setval(pg_get_serial_sequence('"${t}"', 'id'), coalesce(max(id), 1)) FROM "${t}";`
        );
      } catch (seqErr) {
        // Ignorer si la table n'a pas de séquence serial
      }
    }
    console.log('✅ Séquences autoincrement synchronisées');

    console.log('\n🎉 MIGRATION VERS VERCEL NEON RÉUSSIE À 100% !');
  } catch (error) {
    console.error('❌ Erreur durant la migration:', error);
  } finally {
    await localPrisma.$disconnect();
    await neonPrisma.$disconnect();
  }
}

migrate();
