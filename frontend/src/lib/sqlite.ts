/**
 * Service SQLite local pour PANI GESTION
 * Base de données locale intégrée dans l'APK Android
 * Schéma identique à PostgreSQL avec synchronisation bidirectionnelle
 */

import { Capacitor } from '@capacitor/core';

export const isAndroid = Capacitor.getPlatform() === 'android';
export const isNative = Capacitor.isNativePlatform();

let CapacitorSQLite: any = null;
let SQLiteConnection: any = null;
let db: any = null;
let sqliteConnected = false;

const DB_NAME = 'pani_gestion';
const DB_VERSION = 1;

// =====================================================
// SCHÉMA SQLITE — IDENTIQUE À POSTGRESQL PRISMA
// =====================================================
const CREATE_TABLES_SQL = `
-- Table Role
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  sync_status TEXT DEFAULT 'synced',
  server_id INTEGER UNIQUE
);

-- Table Utilisateur
CREATE TABLE IF NOT EXISTS utilisateurs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL UNIQUE,
  telephone TEXT,
  mot_de_passe TEXT NOT NULL DEFAULT '',
  role_id INTEGER,
  actif INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  sync_status TEXT DEFAULT 'synced',
  server_id INTEGER UNIQUE
);

-- Table Produit
CREATE TABLE IF NOT EXISTS produits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  description TEXT,
  unite TEXT DEFAULT 'unité',
  quantite_stock REAL DEFAULT 0,
  seuil_alerte REAL DEFAULT 10,
  actif INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  sync_status TEXT DEFAULT 'synced',
  server_id INTEGER UNIQUE
);

-- Table Tarif
CREATE TABLE IF NOT EXISTS tarifs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  produit_id INTEGER NOT NULL,
  designation TEXT NOT NULL DEFAULT '',
  prix REAL NOT NULL,
  actif INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  sync_status TEXT DEFAULT 'synced',
  server_id INTEGER UNIQUE
);

-- Table Client
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  prenom TEXT,
  telephone TEXT,
  adresse TEXT,
  email TEXT,
  type_client TEXT DEFAULT 'particulier',
  solde_dette REAL DEFAULT 0,
  actif INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  sync_status TEXT DEFAULT 'synced',
  server_id INTEGER UNIQUE
);

-- Table Fournisseur
CREATE TABLE IF NOT EXISTS fournisseurs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  contact TEXT,
  telephone TEXT,
  adresse TEXT,
  email TEXT,
  actif INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  sync_status TEXT DEFAULT 'synced',
  server_id INTEGER UNIQUE
);

-- Table Caisse
CREATE TABLE IF NOT EXISTS caisses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  utilisateur_id INTEGER,
  date_ouverture TEXT DEFAULT (datetime('now')),
  date_cloture TEXT,
  solde_initial REAL DEFAULT 0,
  solde_theorique REAL DEFAULT 0,
  solde_reel REAL,
  ecart REAL,
  statut TEXT DEFAULT 'ouverte',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  sync_status TEXT DEFAULT 'synced',
  server_id INTEGER UNIQUE
);

-- Table Vente
CREATE TABLE IF NOT EXISTS ventes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  client_id INTEGER,
  utilisateur_id INTEGER,
  date_vente TEXT DEFAULT (datetime('now')),
  montant_total REAL NOT NULL DEFAULT 0,
  montant_paye REAL DEFAULT 0,
  reste_a_payer REAL DEFAULT 0,
  statut TEXT DEFAULT 'validee',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  sync_status TEXT DEFAULT 'synced',
  server_id INTEGER UNIQUE
);

-- Table VenteDetail
CREATE TABLE IF NOT EXISTS vente_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vente_id INTEGER NOT NULL,
  produit_id INTEGER NOT NULL,
  tarif_id INTEGER,
  quantite REAL NOT NULL,
  prix_unitaire REAL NOT NULL,
  montant REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  sync_status TEXT DEFAULT 'synced',
  server_id INTEGER UNIQUE
);

-- Table PaiementClient
CREATE TABLE IF NOT EXISTS paiements_clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vente_id INTEGER,
  client_id INTEGER NOT NULL,
  montant REAL NOT NULL,
  mode_paiement TEXT DEFAULT 'especes',
  date_paiement TEXT DEFAULT (datetime('now')),
  notes TEXT,
  mouvement_caisse_id INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  sync_status TEXT DEFAULT 'synced',
  server_id INTEGER UNIQUE
);

-- Table Achat
CREATE TABLE IF NOT EXISTS achats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  fournisseur_id INTEGER NOT NULL,
  utilisateur_id INTEGER,
  date_achat TEXT DEFAULT (datetime('now')),
  montant_total REAL DEFAULT 0,
  montant_paye REAL DEFAULT 0,
  reste_a_payer REAL DEFAULT 0,
  statut TEXT DEFAULT 'receptionne',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  sync_status TEXT DEFAULT 'synced',
  server_id INTEGER UNIQUE
);

-- Table AchatDetail
CREATE TABLE IF NOT EXISTS achat_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  achat_id INTEGER NOT NULL,
  produit_id INTEGER NOT NULL,
  quantite REAL NOT NULL,
  prix_unitaire REAL NOT NULL,
  montant REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  sync_status TEXT DEFAULT 'synced',
  server_id INTEGER UNIQUE
);

-- Table Depense
CREATE TABLE IF NOT EXISTS depenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero TEXT NOT NULL UNIQUE,
  utilisateur_id INTEGER,
  categorie TEXT NOT NULL,
  description TEXT NOT NULL,
  montant REAL NOT NULL,
  mode_paiement TEXT DEFAULT 'especes',
  beneficiaire TEXT,
  date_depense TEXT DEFAULT (datetime('now')),
  notes TEXT,
  has_justificatif INTEGER DEFAULT 0,
  mouvement_caisse_id INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  sync_status TEXT DEFAULT 'synced',
  server_id INTEGER UNIQUE
);

-- Table MouvementStock
CREATE TABLE IF NOT EXISTS mouvements_stock (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  produit_id INTEGER NOT NULL,
  type_operation TEXT NOT NULL,
  quantite REAL NOT NULL,
  stock_avant REAL NOT NULL,
  stock_apres REAL NOT NULL,
  motif TEXT,
  vente_id INTEGER,
  achat_id INTEGER,
  inventaire_id INTEGER,
  date_mouvement TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now')),
  sync_status TEXT DEFAULT 'synced',
  server_id INTEGER UNIQUE
);

-- Table MouvementCaisse
CREATE TABLE IF NOT EXISTS mouvements_caisse (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  caisse_id INTEGER NOT NULL,
  utilisateur_id INTEGER NOT NULL,
  type_operation TEXT NOT NULL,
  montant REAL NOT NULL,
  solde_avant REAL NOT NULL,
  solde_apres REAL NOT NULL,
  description TEXT,
  date_mouvement TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now')),
  sync_status TEXT DEFAULT 'synced',
  server_id INTEGER UNIQUE
);

-- Table Inventaire
CREATE TABLE IF NOT EXISTS inventaires (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  utilisateur_id INTEGER NOT NULL,
  date_inventaire TEXT DEFAULT (datetime('now')),
  statut TEXT DEFAULT 'en_cours',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  sync_status TEXT DEFAULT 'synced',
  server_id INTEGER UNIQUE
);

-- Table InventaireDetail
CREATE TABLE IF NOT EXISTS inventaire_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inventaire_id INTEGER NOT NULL,
  produit_id INTEGER NOT NULL,
  stock_theorique REAL NOT NULL,
  stock_physique REAL NOT NULL,
  ecart REAL NOT NULL,
  motif_ecart TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  sync_status TEXT DEFAULT 'synced',
  server_id INTEGER UNIQUE
);

-- Index pour optimiser les performances de synchronisation et de recherche
CREATE INDEX IF NOT EXISTS idx_ventes_sync ON ventes(sync_status);
CREATE INDEX IF NOT EXISTS idx_ventes_ref ON ventes(reference);
CREATE INDEX IF NOT EXISTS idx_clients_sync ON clients(sync_status);
CREATE INDEX IF NOT EXISTS idx_depenses_sync ON depenses(sync_status);
CREATE INDEX IF NOT EXISTS idx_produits_nom ON produits(nom);
CREATE INDEX IF NOT EXISTS idx_produits_server_id ON produits(server_id);
`;

// =====================================================
// INITIALISATION DE LA BASE SQLITE
// =====================================================
export async function initSQLite(): Promise<boolean> {
  if (!isNative) {
    console.log('[SQLite] Mode Web actif — synchronisation directe PostgreSQL');
    return false;
  }

  try {
    const { CapacitorSQLite: CSQLite, SQLiteConnection: SQLConn } = await import('@capacitor-community/sqlite');
    CapacitorSQLite = CSQLite;
    SQLiteConnection = new SQLConn(CapacitorSQLite);

    const retCC = await SQLiteConnection.checkConnectionsConsistency();
    const isConn = (await SQLiteConnection.isConnection(DB_NAME, false)).result;

    if (retCC.result && isConn) {
      db = await SQLiteConnection.retrieveConnection(DB_NAME, false);
    } else {
      db = await SQLiteConnection.createConnection(
        DB_NAME,
        false,
        'no-encryption',
        DB_VERSION,
        false
      );
    }

    await db.open();
    await db.execute(CREATE_TABLES_SQL);

    // Seeder les données de base si la base SQLite locale est vide (Mode 100% hors-ligne dès le premier lancement)
    try {
      const countCheck = await db.query('SELECT COUNT(*) as c FROM produits');
      if ((countCheck.values?.[0]?.c || 0) === 0) {
        console.log('[SQLite] 🌱 Initialisation des données locales par défaut (Pani, Tarifs, Client, Caisse)...');
        await db.run(`
          INSERT INTO roles (id, server_id, nom, description, sync_status) VALUES
          (1, 1, 'Administrateur', 'Accès complet', 'synced'),
          (2, 2, 'Caissier', 'Ventes et encaissements', 'synced'),
          (3, 3, 'Magasinier', 'Gestion des stocks', 'synced')
        `);
        await db.run(`
          INSERT INTO utilisateurs (id, server_id, nom, prenom, email, role_id, actif, sync_status) VALUES
          (1, 1, 'Administrateur', 'Local', 'admin@pani.com', 1, 1, 'synced')
        `);
        await db.run(`
          INSERT INTO produits (id, server_id, nom, description, unite, quantite_stock, seuil_alerte, actif, sync_status) VALUES
          (1, 1, 'Pani', 'Produit commercial principal', 'unité', 500, 10, 1, 'synced')
        `);
        await db.run(`
          INSERT INTO tarifs (id, server_id, produit_id, designation, prix, actif, sync_status) VALUES
          (1, 1, 1, '500 F', 500, 1, 'synced'),
          (2, 2, 1, '1 000 F', 1000, 1, 'synced'),
          (3, 3, 1, '1 500 F', 1500, 1, 'synced'),
          (4, 4, 1, '2 000 F', 2000, 1, 'synced'),
          (5, 5, 1, 'Prix grossiste (2 500 F)', 2500, 1, 'synced')
        `);
        await db.run(`
          INSERT INTO clients (id, server_id, nom, prenom, type_client, solde_dette, actif, sync_status) VALUES
          (1, 1, 'Client Comptant', '', 'particulier', 0, 1, 'synced'),
          (2, 2, 'Diallo', 'Awa', 'particulier', 0, 1, 'synced'),
          (3, 3, 'Konaté', 'Oumar', 'particulier', 0, 1, 'synced')
        `);
        await db.run(`
          INSERT INTO fournisseurs (id, server_id, nom, contact, actif, sync_status) VALUES
          (1, 1, 'Fournisseur Général', 'Direction', 1, 'synced')
        `);
        await db.run(`
          INSERT INTO caisses (id, server_id, reference, solde_initial, solde_theorique, statut, sync_status) VALUES
          (1, 1, 'CS-INIT-LOCALE', 100000, 100000, 'ouverte', 'synced')
        `);
      }
    } catch (seedErr) {
      console.warn('[SQLite] Erreur vérification/seed SQLite local:', seedErr);
    }

    sqliteConnected = true;
    console.log('[SQLite] ✅ Base de données SQLite locale connectée et schéma initialisé');
    return true;
  } catch (error) {
    console.error('[SQLite] ❌ Erreur initialisation SQLite:', error);
    sqliteConnected = false;
    return false;
  }
}

export function isSQLiteAvailable(): boolean {
  return sqliteConnected && db !== null;
}

// =====================================================
// SYNCHRONISATION PULL : UPSERTS DEPUIS POSTGRESQL
// =====================================================

export async function sqliteUpsertRole(role: any): Promise<void> {
  if (!db) return;
  const sql = `
    INSERT INTO roles (server_id, nom, description, created_at, updated_at, sync_status)
    VALUES (?, ?, ?, ?, ?, 'synced')
    ON CONFLICT(server_id) DO UPDATE SET
      nom = excluded.nom,
      description = excluded.description,
      updated_at = excluded.updated_at,
      sync_status = 'synced';
  `;
  await db.run(sql, [role.id, role.nom, role.description || null, role.createdAt, role.updatedAt]);
}

export async function sqliteUpsertUtilisateur(u: any): Promise<void> {
  if (!db) return;
  const sql = `
    INSERT INTO utilisateurs (server_id, nom, prenom, email, telephone, role_id, actif, created_at, updated_at, sync_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
    ON CONFLICT(server_id) DO UPDATE SET
      nom = excluded.nom,
      prenom = excluded.prenom,
      email = excluded.email,
      telephone = excluded.telephone,
      role_id = excluded.role_id,
      actif = excluded.actif,
      updated_at = excluded.updated_at,
      sync_status = 'synced';
  `;
  await db.run(sql, [u.id, u.nom, u.prenom || '', u.email, u.telephone || null, u.roleId, u.actif ? 1 : 0, u.createdAt, u.updatedAt]);
}

export async function sqliteUpsertProduit(p: any): Promise<void> {
  if (!db) return;
  const stock = p.stockActuel !== undefined ? p.stockActuel : (p.quantiteStock || 0);
  const sql = `
    INSERT INTO produits (server_id, nom, description, unite, quantite_stock, seuil_alerte, actif, created_at, updated_at, sync_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
    ON CONFLICT(server_id) DO UPDATE SET
      nom = excluded.nom,
      description = excluded.description,
      unite = excluded.unite,
      quantite_stock = excluded.quantite_stock,
      seuil_alerte = excluded.seuil_alerte,
      actif = excluded.actif,
      updated_at = excluded.updated_at,
      sync_status = 'synced';
  `;
  await db.run(sql, [
    p.id, p.nom, p.description || null, p.unite || 'unité',
    stock, p.seuilAlerte || 10, p.actif ? 1 : 0, p.createdAt, p.updatedAt
  ]);

  if (p.tarifs && Array.isArray(p.tarifs)) {
    for (const t of p.tarifs) {
      await sqliteUpsertTarif(t);
    }
  }
}

export async function sqliteUpsertTarif(t: any): Promise<void> {
  if (!db) return;
  const designation = t.designation || t.nom || '';
  const prix = Number(t.prix);
  const sql = `
    INSERT INTO tarifs (server_id, produit_id, designation, prix, actif, created_at, updated_at, sync_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'synced')
    ON CONFLICT(server_id) DO UPDATE SET
      produit_id = excluded.produit_id,
      designation = excluded.designation,
      prix = excluded.prix,
      actif = excluded.actif,
      updated_at = excluded.updated_at,
      sync_status = 'synced';
  `;
  await db.run(sql, [t.id, t.produitId, designation, prix, t.actif ? 1 : 0, t.createdAt, t.updatedAt]);
}

export async function sqliteUpsertClient(c: any): Promise<void> {
  if (!db) return;
  const sql = `
    INSERT INTO clients (server_id, nom, prenom, telephone, adresse, email, type_client, actif, created_at, updated_at, sync_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
    ON CONFLICT(server_id) DO UPDATE SET
      nom = excluded.nom,
      prenom = excluded.prenom,
      telephone = excluded.telephone,
      adresse = excluded.adresse,
      email = excluded.email,
      type_client = excluded.type_client,
      actif = excluded.actif,
      updated_at = excluded.updated_at,
      sync_status = 'synced';
  `;
  await db.run(sql, [
    c.id, c.nom, c.prenom || null, c.telephone || null, c.adresse || null,
    c.email || null, c.typeClient || 'particulier', c.actif ? 1 : 0,
    c.createdAt, c.updatedAt
  ]);
}

export async function sqliteUpsertFournisseur(f: any): Promise<void> {
  if (!db) return;
  const sql = `
    INSERT INTO fournisseurs (server_id, nom, contact, telephone, adresse, email, actif, created_at, updated_at, sync_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
    ON CONFLICT(server_id) DO UPDATE SET
      nom = excluded.nom,
      contact = excluded.contact,
      telephone = excluded.telephone,
      adresse = excluded.adresse,
      email = excluded.email,
      actif = excluded.actif,
      updated_at = excluded.updated_at,
      sync_status = 'synced';
  `;
  await db.run(sql, [
    f.id, f.nom, f.contact || null, f.telephone || null, f.adresse || null,
    f.email || null, f.actif ? 1 : 0, f.createdAt, f.updatedAt
  ]);
}

export async function sqliteUpsertCaisse(c: any): Promise<void> {
  if (!db) return;
  const sql = `
    INSERT INTO caisses (server_id, reference, utilisateur_id, date_ouverture, date_cloture, solde_initial, solde_theorique, solde_reel, ecart, statut, notes, created_at, updated_at, sync_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
    ON CONFLICT(server_id) DO UPDATE SET
      reference = excluded.reference,
      solde_theorique = excluded.solde_theorique,
      solde_reel = excluded.solde_reel,
      ecart = excluded.ecart,
      statut = excluded.statut,
      notes = excluded.notes,
      updated_at = excluded.updated_at,
      sync_status = 'synced';
  `;
  await db.run(sql, [
    c.id, c.reference, c.utilisateurId, c.dateOuverture, c.dateCloture || null,
    Number(c.soldeInitial || 0), Number(c.soldeTheorique || 0),
    c.soldeReel !== null ? Number(c.soldeReel) : null,
    c.ecart !== null ? Number(c.ecart) : null,
    c.statut || 'ouverte', c.notes || null, c.createdAt, c.updatedAt
  ]);
}

export async function sqliteUpsertVente(v: any): Promise<void> {
  if (!db) return;
  const sql = `
    INSERT INTO ventes (server_id, reference, client_id, utilisateur_id, date_vente, montant_total, montant_paye, reste_a_payer, statut, notes, created_at, updated_at, sync_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
    ON CONFLICT(server_id) DO UPDATE SET
      reference = excluded.reference,
      montant_total = excluded.montant_total,
      montant_paye = excluded.montant_paye,
      reste_a_payer = excluded.reste_a_payer,
      statut = excluded.statut,
      notes = excluded.notes,
      updated_at = excluded.updated_at,
      sync_status = 'synced';
  `;
  await db.run(sql, [
    v.id, v.reference, v.clientId || null, v.utilisateurId, v.dateVente,
    Number(v.montantTotal), Number(v.montantPaye || 0), Number(v.resteAPayer || 0),
    v.statut, v.notes || null, v.createdAt, v.updatedAt
  ]);

  if (v.details && Array.isArray(v.details)) {
    for (const d of v.details) {
      const sqlDetail = `
        INSERT INTO vente_details (server_id, vente_id, produit_id, tarif_id, quantite, prix_unitaire, montant, created_at, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced')
        ON CONFLICT(server_id) DO UPDATE SET
          quantite = excluded.quantite,
          prix_unitaire = excluded.prix_unitaire,
          montant = excluded.montant,
          sync_status = 'synced';
      `;
      await db.run(sqlDetail, [
        d.id, v.id, d.produitId, d.tarifId, Number(d.quantite), Number(d.prixUnitaire), Number(d.montant), d.createdAt
      ]);
    }
  }
}

export async function sqliteUpsertDepense(d: any): Promise<void> {
  if (!db) return;
  const sql = `
    INSERT INTO depenses (server_id, numero, utilisateur_id, categorie, description, montant, mode_paiement, beneficiaire, date_depense, notes, has_justificatif, created_at, updated_at, sync_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
    ON CONFLICT(server_id) DO UPDATE SET
      categorie = excluded.categorie,
      description = excluded.description,
      montant = excluded.montant,
      mode_paiement = excluded.mode_paiement,
      beneficiaire = excluded.beneficiaire,
      notes = excluded.notes,
      has_justificatif = excluded.has_justificatif,
      updated_at = excluded.updated_at,
      sync_status = 'synced';
  `;
  await db.run(sql, [
    d.id, d.numero, d.utilisateurId, d.categorie, d.description, Number(d.montant),
    d.modePaiement || 'especes', d.beneficiaire || null, d.dateDepense, d.notes || null,
    d.hasJustificatif ? 1 : 0, d.createdAt, d.updatedAt
  ]);
}

export async function sqliteUpsertAchat(a: any): Promise<void> {
  if (!db) return;
  const sql = `
    INSERT INTO achats (server_id, reference, fournisseur_id, utilisateur_id, date_achat, montant_total, montant_paye, reste_a_payer, statut, notes, created_at, updated_at, sync_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
    ON CONFLICT(server_id) DO UPDATE SET
      reference = excluded.reference,
      montant_total = excluded.montant_total,
      montant_paye = excluded.montant_paye,
      reste_a_payer = excluded.reste_a_payer,
      statut = excluded.statut,
      notes = excluded.notes,
      updated_at = excluded.updated_at,
      sync_status = 'synced';
  `;
  await db.run(sql, [
    a.id, a.reference, a.fournisseurId, a.utilisateurId, a.dateAchat,
    Number(a.montantTotal), Number(a.montantPaye || 0), Number(a.resteAPayer || 0),
    a.statut, a.notes || null, a.createdAt, a.updatedAt
  ]);
}

// =====================================================
// OPÉRATIONS LOCALES (SAISIE SUR MOBILE) & PENDING
// =====================================================

// --- ENREGISTRER UNE VENTE LOCALE ---
export async function sqliteCreateLocalVente(vente: {
  reference?: string;
  clientId?: number | null;
  dateVente?: string;
  utilisateurId?: number;
  montantTotal: number;
  montantPaye: number;
  resteAPayer: number;
  modePaiement?: string;
  notes?: string;
  details: Array<{
    produitId: number;
    tarifId: number;
    quantite: number;
    prixUnitaire: number;
    montant: number;
  }>;
}): Promise<number> {
  if (!db) throw new Error('SQLite non disponible');

  const ref = vente.reference || `VTE-MOB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const nowIso = vente.dateVente || new Date().toISOString();

  // 1. Insérer la vente locale
  const res = await db.run(`
    INSERT INTO ventes (reference, client_id, utilisateur_id, date_vente, montant_total, montant_paye, reste_a_payer, statut, notes, sync_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'validee', ?, 'pending', ?, ?)
  `, [
    ref,
    vente.clientId || null,
    vente.utilisateurId || 1,
    nowIso,
    vente.montantTotal,
    vente.montantPaye,
    vente.resteAPayer,
    vente.notes || null,
    nowIso,
    nowIso
  ]);

  const localVenteId = res.changes?.lastId || 0;

  // 2. Insérer les détails et décrémenter le stock localement
  for (const d of vente.details) {
    await db.run(`
      INSERT INTO vente_details (vente_id, produit_id, tarif_id, quantite, prix_unitaire, montant, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `, [localVenteId, d.produitId, d.tarifId, d.quantite, d.prixUnitaire, d.montant]);

    // Décrémenter le stock local
    await db.run(`
      UPDATE produits SET quantite_stock = quantite_stock - ? WHERE server_id = ? OR id = ?
    `, [d.quantite, d.produitId, d.produitId]);
  }

  // 3. Mettre à jour la dette du client en local si reste à payer
  if (vente.clientId && vente.resteAPayer > 0) {
    try {
      await db.run(`
        UPDATE clients SET solde_dette = COALESCE(solde_dette, 0) + ? WHERE server_id = ? OR id = ?
      `, [vente.resteAPayer, vente.clientId, vente.clientId]);
    } catch (_) {}
  }

  // 4. Mettre à jour le solde de la caisse active en local si encaissement espèces
  if (vente.montantPaye > 0) {
    try {
      await db.run(`
        UPDATE caisses SET solde_theorique = COALESCE(solde_theorique, 0) + ? WHERE statut = 'ouverte'
      `, [vente.montantPaye]);
    } catch (_) {}
  }

  return localVenteId;
}

// --- ENREGISTRER UN CLIENT LOCAL ---
export async function sqliteCreateLocalClient(client: {
  nom: string;
  prenom?: string;
  telephone?: string;
  adresse?: string;
  email?: string;
  typeClient?: string;
}): Promise<number> {
  if (!db) throw new Error('SQLite non disponible');

  const res = await db.run(`
    INSERT INTO clients (nom, prenom, telephone, adresse, email, type_client, sync_status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `, [
    client.nom,
    client.prenom || null,
    client.telephone || null,
    client.adresse || null,
    client.email || null,
    client.typeClient || 'particulier'
  ]);

  return res.changes?.lastId || 0;
}

// --- ENREGISTRER UN FOURNISSEUR LOCAL ---
export async function sqliteCreateLocalFournisseur(f: {
  nom: string;
  contact?: string;
  telephone?: string;
  adresse?: string;
  email?: string;
}): Promise<number> {
  if (!db) throw new Error('SQLite non disponible');

  const res = await db.run(`
    INSERT INTO fournisseurs (nom, contact, telephone, adresse, email, sync_status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `, [
    f.nom,
    f.contact || null,
    f.telephone || null,
    f.adresse || null,
    f.email || null,
  ]);

  return res.changes?.lastId || 0;
}

// --- ENREGISTRER UNE DÉPENSE LOCALE ---
export async function sqliteCreateLocalDepense(depense: {
  numero?: string;
  utilisateurId?: number;
  categorie: string;
  description: string;
  montant: number;
  modePaiement?: string;
  beneficiaire?: string;
  dateDepense?: string;
  notes?: string;
  hasJustificatif?: boolean;
  justificatif?: { dataUrl: string; nomFichier: string; typeFichier: string; tailleFichier: number };
}): Promise<number> {
  if (!db) throw new Error('SQLite non disponible');

  const num = depense.numero || `DEP-MOB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const nowIso = depense.dateDepense || new Date().toISOString();
  const hasJustif = depense.hasJustificatif ? 1 : (depense.justificatif ? 1 : 0);

  const res = await db.run(`
    INSERT INTO depenses (numero, utilisateur_id, categorie, description, montant, mode_paiement, beneficiaire, date_depense, notes, has_justificatif, sync_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `, [
    num,
    depense.utilisateurId || 1,
    depense.categorie,
    depense.description,
    depense.montant,
    depense.modePaiement || 'especes',
    depense.beneficiaire || null,
    nowIso,
    depense.notes || null,
    hasJustif,
    nowIso,
    nowIso
  ]);

  // Déduire de la caisse active locale
  if (depense.montant > 0) {
    try {
      await db.run(`
        UPDATE caisses SET solde_theorique = COALESCE(solde_theorique, 0) - ? WHERE statut = 'ouverte'
      `, [depense.montant]);
    } catch (_) {}
  }

  return res.changes?.lastId || 0;
}

// =====================================================
// LECTURE DES DONNÉES EN ATTENTE (PENDING) POUR LE PUSH
// =====================================================

export async function sqliteGetPendingItems(): Promise<{
  clients: any[];
  ventes: any[];
  depenses: any[];
  achats: any[];
}> {
  if (!db) return { clients: [], ventes: [], depenses: [], achats: [] };

  const [resClients, resVentes, resDepenses, resAchats] = await Promise.all([
    db.query("SELECT * FROM clients WHERE sync_status = 'pending'"),
    db.query("SELECT * FROM ventes WHERE sync_status = 'pending'"),
    db.query("SELECT * FROM depenses WHERE sync_status = 'pending'"),
    db.query("SELECT * FROM achats WHERE sync_status = 'pending'"),
  ]);

  const rawVentes = resVentes.values || [];
  const ventesWithDetails: any[] = [];

  for (const v of rawVentes) {
    const resDetails = await db.query(
      "SELECT * FROM vente_details WHERE vente_id = ?",
      [v.id]
    );
    ventesWithDetails.push({
      localId: v.id,
      reference: v.reference,
      clientId: v.client_id,
      utilisateurId: v.utilisateur_id,
      dateVente: v.date_vente,
      montantTotal: v.montant_total,
      montantPaye: v.montant_paye,
      resteAPayer: v.reste_a_payer,
      statut: v.statut,
      notes: v.notes,
      details: (resDetails.values || []).map((d: any) => ({
        produitId: d.produit_id,
        tarifId: d.tarif_id,
        quantite: d.quantite,
        prixUnitaire: d.prix_unitaire,
        montant: d.montant
      }))
    });
  }

  const rawAchats = resAchats.values || [];
  const achatsWithDetails: any[] = [];

  for (const a of rawAchats) {
    const resDetails = await db.query(
      "SELECT * FROM achat_details WHERE achat_id = ?",
      [a.id]
    );
    achatsWithDetails.push({
      localId: a.id,
      reference: a.reference,
      fournisseurId: a.fournisseur_id,
      utilisateurId: a.utilisateur_id,
      dateAchat: a.date_achat,
      montantTotal: a.montant_total,
      montantPaye: a.montant_paye,
      resteAPayer: a.reste_a_payer,
      statut: a.statut,
      notes: a.notes,
      details: (resDetails.values || []).map((d: any) => ({
        produitId: d.produit_id,
        quantite: d.quantite,
        prixUnitaire: d.prix_unitaire,
        montant: d.montant
      }))
    });
  }

  return {
    clients: (resClients.values || []).map((c: any) => ({
      localId: c.id,
      nom: c.nom,
      prenom: c.prenom,
      telephone: c.telephone,
      adresse: c.adresse,
      email: c.email,
      typeClient: c.type_client
    })),
    ventes: ventesWithDetails,
    depenses: (resDepenses.values || []).map((d: any) => ({
      localId: d.id,
      numero: d.numero,
      utilisateurId: d.utilisateur_id,
      categorie: d.categorie,
      description: d.description,
      montant: d.montant,
      modePaiement: d.mode_paiement,
      beneficiaire: d.beneficiaire,
      notes: d.notes,
      hasJustificatif: Boolean(d.has_justificatif),
      dateDepense: d.date_depense,
    })),
    achats: achatsWithDetails
  };
}

// =====================================================
// MISE À JOUR SUITE AU SUCCÈS DU PUSH
// =====================================================

export async function sqliteApplyPushMappings(mappings: {
  clients?: Array<{ localId: number; serverId: number }>;
  ventes?: Array<{ localId: number; serverId: number }>;
  depenses?: Array<{ localId: number; serverId: number }>;
  achats?: Array<{ localId: number; serverId: number }>;
}): Promise<void> {
  if (!db) return;

  if (mappings.clients) {
    for (const m of mappings.clients) {
      await db.run(
        "UPDATE clients SET server_id = ?, sync_status = 'synced' WHERE id = ?",
        [m.serverId, m.localId]
      );
    }
  }

  if (mappings.ventes) {
    for (const m of mappings.ventes) {
      await db.run(
        "UPDATE ventes SET server_id = ?, sync_status = 'synced' WHERE id = ?",
        [m.serverId, m.localId]
      );
      await db.run(
        "UPDATE vente_details SET sync_status = 'synced' WHERE vente_id = ?",
        [m.localId]
      );
    }
  }

  if (mappings.depenses) {
    for (const m of mappings.depenses) {
      await db.run(
        "UPDATE depenses SET server_id = ?, sync_status = 'synced' WHERE id = ?",
        [m.serverId, m.localId]
      );
    }
  }

  if (mappings.achats) {
    for (const m of mappings.achats) {
      await db.run(
        "UPDATE achats SET server_id = ?, sync_status = 'synced' WHERE id = ?",
        [m.serverId, m.localId]
      );
      await db.run(
        "UPDATE achat_details SET sync_status = 'synced' WHERE achat_id = ?",
        [m.localId]
      );
    }
  }
}

// =====================================================
// REQUÊTES DE LECTURE GLOBALE POUR L'APPLICATION
// =====================================================

export async function sqliteGetProduits(): Promise<any[]> {
  if (!db) return [];
  const res = await db.query(`
    SELECT p.*, 
           p.quantite_stock as stockActuel,
           p.server_id as id
    FROM produits p
    WHERE p.actif = 1
    ORDER BY p.nom ASC
  `);
  
  const list = res.values || [];
  for (const prod of list) {
    const resTarifs = await db.query(
      "SELECT id, designation, prix, actif FROM tarifs WHERE produit_id = ? AND actif = 1",
      [prod.id]
    );
    prod.tarifs = resTarifs.values || [];
  }
  return list;
}

export async function sqliteGetClients(): Promise<any[]> {
  if (!db) return [];
  const res = await db.query(`
    SELECT id, server_id, nom, prenom, telephone, adresse, email, type_client as typeClient, solde_dette as soldeDette
    FROM clients
    WHERE actif = 1
    ORDER BY nom ASC
  `);
  return res.values || [];
}

export async function sqliteGetFournisseurs(): Promise<any[]> {
  if (!db) return [];
  const res = await db.query(`
    SELECT f.id, f.server_id, f.nom, f.contact, f.telephone, f.adresse, f.email,
           COALESCE(SUM(a.reste_a_payer), 0) as totalDette,
           CASE WHEN COALESCE(SUM(a.reste_a_payer), 0) > 0 THEN 1 ELSE 0 END as aDette
    FROM fournisseurs f
    LEFT JOIN achats a ON (a.fournisseur_id = f.id OR (f.server_id IS NOT NULL AND a.fournisseur_id = f.server_id))
    WHERE f.actif = 1
    GROUP BY f.id
    ORDER BY f.nom ASC
  `);
  return res.values || [];
}

export async function sqliteGetVentes(limit = 100): Promise<any[]> {
  if (!db) return [];
  const res = await db.query(`
    SELECT v.id, v.server_id, v.reference, v.date_vente as dateVente,
           v.montant_total as montantTotal, v.montant_paye as montantPaye,
           v.reste_a_payer as resteAPayer, v.statut, v.notes, v.sync_status,
           c.nom as client_nom, c.prenom as client_prenom
    FROM ventes v
    LEFT JOIN clients c ON v.client_id = c.id OR (v.client_id IS NOT NULL AND v.client_id = c.server_id)
    ORDER BY v.date_vente DESC
    LIMIT ?
  `, [limit]);
  return res.values || [];
}

// --- ENREGISTRER UN ACHAT LOCAL ---
export async function sqliteCreateLocalAchat(achat: {
  fournisseurId: number;
  utilisateurId?: number;
  dateAchat?: string;
  montantTotal: number;
  montantPaye: number;
  resteAPayer: number;
  notes?: string;
  details?: Array<{
    produitId: number;
    quantite: number;
    prixUnitaire: number;
    montant: number;
  }>;
}): Promise<number> {
  if (!db) throw new Error('SQLite non disponible');

  const ref = `ACH-MOB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const nowIso = achat.dateAchat || new Date().toISOString();

  const res = await db.run(`
    INSERT INTO achats (reference, fournisseur_id, utilisateur_id, date_achat, montant_total, montant_paye, reste_a_payer, notes, sync_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `, [
    ref,
    achat.fournisseurId,
    achat.utilisateurId || 1,
    nowIso,
    achat.montantTotal,
    achat.montantPaye,
    achat.resteAPayer,
    achat.notes || null,
    nowIso,
    nowIso
  ]);

  const localAchatId = res.changes?.lastId || 0;

  if (achat.details) {
    for (const d of achat.details) {
      await db.run(`
        INSERT INTO achat_details (achat_id, produit_id, quantite, prix_unitaire, montant, sync_status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `, [localAchatId, d.produitId, d.quantite, d.prixUnitaire, d.montant]);

      // Incrémenter le stock local lors d'un achat
      await db.run(`
        UPDATE produits SET quantite_stock = quantite_stock + ? WHERE server_id = ? OR id = ?
      `, [d.quantite, d.produitId, d.produitId]);
    }
  }

  return localAchatId;
}

// --- CRÉER UN TARIF LOCAL ---
export async function sqliteCreateLocalTarif(tarif: {
  produitId: number;
  designation: string;
  prix: number;
}): Promise<number> {
  if (!db) throw new Error('SQLite non disponible');
  const res = await db.run(`
    INSERT INTO tarifs (produit_id, designation, prix, actif, sync_status)
    VALUES (?, ?, ?, 1, 'pending')
  `, [tarif.produitId, tarif.designation, tarif.prix]);
  return res.changes?.lastId || 0;
}

// --- AJUSTER LE STOCK LOCAL ---
export async function sqliteCreateLocalAjustement(ajust: {
  produitId: number;
  typeOperation: string;
  quantite: number;
  motif?: string;
}): Promise<void> {
  if (!db) throw new Error('SQLite non disponible');
  const delta = (ajust.typeOperation === 'entree' || ajust.typeOperation === 'ajustement_positif')
    ? ajust.quantite
    : -ajust.quantite;

  await db.run(`
    UPDATE produits SET quantite_stock = MAX(0, quantite_stock + ?) WHERE server_id = ? OR id = ?
  `, [delta, ajust.produitId, ajust.produitId]);

  await db.run(`
    INSERT INTO mouvements_stock (produit_id, type_operation, quantite, stock_avant, stock_apres, motif, sync_status)
    VALUES (?, ?, ?, 0, 0, ?, 'pending')
  `, [ajust.produitId, ajust.typeOperation, ajust.quantite, ajust.motif || 'Ajustement local']);
}

export async function sqliteGetDepenses(limit = 50): Promise<any[]> {
  if (!db) return [];
  const res = await db.query(`
    SELECT id, server_id, numero, categorie, description, montant,
           mode_paiement as modePaiement, beneficiaire,
           date_depense as dateDepense, sync_status, has_justificatif as hasJustificatif
    FROM depenses
    ORDER BY date_depense DESC
    LIMIT ?
  `, [limit]);
  return res.values || [];
}

export async function sqliteGetAchats(limit = 50): Promise<any[]> {
  if (!db) return [];
  const res = await db.query(`
    SELECT a.id, a.server_id, a.reference, a.date_achat as dateAchat,
           a.montant_total as montantTotal, a.montant_paye as montantPaye,
           a.reste_a_payer as resteAPayer, a.statut, a.sync_status,
           f.nom as fournisseur_nom
    FROM achats a
    LEFT JOIN fournisseurs f ON a.fournisseur_id = f.id OR (a.fournisseur_id IS NOT NULL AND a.fournisseur_id = f.server_id)
    ORDER BY a.date_achat DESC
    LIMIT ?
  `, [limit]);
  return res.values || [];
}

export async function sqliteGetDashboardStats(periode: string = 'jour'): Promise<any> {
  if (!db) return null;
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  let dateFilterVentes = `date_vente LIKE '${today}%'`;
  let dateFilterDepenses = `date_depense LIKE '${today}%'`;

  if (periode === 'semaine') {
    const s = new Date(now);
    s.setDate(now.getDate() - 7);
    const startStr = s.toISOString().split('T')[0];
    dateFilterVentes = `date_vente >= '${startStr}'`;
    dateFilterDepenses = `date_depense >= '${startStr}'`;
  } else if (periode === 'mois') {
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    dateFilterVentes = `date_vente LIKE '${monthStr}%'`;
    dateFilterDepenses = `date_depense LIKE '${monthStr}%'`;
  } else if (periode === 'annee') {
    const yearStr = `${now.getFullYear()}`;
    dateFilterVentes = `date_vente LIKE '${yearStr}%'`;
    dateFilterDepenses = `date_depense LIKE '${yearStr}%'`;
  }

  const [resVentes, resEncaissements, resDepenses, resStock, resClients, resDettes, resAchats, resCaisse, resTop] = await Promise.all([
    // Ventes de la période
    db.query(`SELECT COUNT(*) as count, COALESCE(SUM(montant_total), 0) as total FROM ventes WHERE ${dateFilterVentes}`),
    // Encaissements de la période (montant payé)
    db.query(`SELECT COALESCE(SUM(montant_paye), 0) as total FROM ventes WHERE ${dateFilterVentes}`),
    // Dépenses de la période
    db.query(`SELECT COUNT(*) as count, COALESCE(SUM(montant), 0) as total FROM depenses WHERE ${dateFilterDepenses}`),
    // Stock produits
    db.query(`SELECT COUNT(*) as count, COALESCE(SUM(quantite_stock), 0) as totalStock FROM produits WHERE actif = 1`),
    // Clients actifs
    db.query(`SELECT COUNT(*) as count FROM clients WHERE actif = 1`),
    // Dettes clients (reste à payer)
    db.query(`SELECT COUNT(*) as count, COALESCE(SUM(reste_a_payer), 0) as total FROM ventes WHERE reste_a_payer > 0`),
    // Dettes fournisseurs (achats avec reste à payer)
    db.query(`SELECT COUNT(*) as count, COALESCE(SUM(reste_a_payer), 0) as total FROM achats WHERE reste_a_payer > 0`),
    // Caisse active
    db.query(`SELECT * FROM caisses WHERE statut = 'ouverte' ORDER BY id DESC LIMIT 1`),
    // Top produits
    db.query(`
      SELECT p.nom, COALESCE(SUM(vd.quantite), 0) as totalVendu, COALESCE(SUM(vd.montant), 0) as chiffreAffaires
      FROM vente_details vd
      JOIN ventes v ON v.id = vd.vente_id
      JOIN produits p ON p.id = vd.produit_id OR p.server_id = vd.produit_id
      WHERE ${dateFilterVentes}
      GROUP BY p.nom
      ORDER BY chiffreAffaires DESC
      LIMIT 5
    `).catch(() => ({ values: [] })),
  ]);

  const ventesTotal = resVentes.values?.[0]?.total || 0;
  const depensesTotal = resDepenses.values?.[0]?.total || 0;
  const caisseRow = resCaisse.values?.[0] || null;

  // Premier produit pour le stock principal
  const resProduitPrincipal = await db.query(`
    SELECT nom, quantite_stock as stockActuel FROM produits WHERE actif = 1 ORDER BY quantite_stock DESC LIMIT 1
  `);

  return {
    ventes: {
      count: resVentes.values?.[0]?.count || 0,
      total: ventesTotal,
    },
    encaissements: {
      total: resEncaissements.values?.[0]?.total || 0,
    },
    depenses: {
      count: resDepenses.values?.[0]?.count || 0,
      total: depensesTotal,
    },
    beneficeEstime: ventesTotal - depensesTotal,
    stock: resProduitPrincipal.values?.length
      ? [{ nom: resProduitPrincipal.values[0].nom, stockActuel: resProduitPrincipal.values[0].stockActuel }]
      : [{ nom: 'Pani', stockActuel: 500 }],
    dettesClients: {
      count: resDettes.values?.[0]?.count || 0,
      total: resDettes.values?.[0]?.total || 0,
    },
    dettesFournisseurs: {
      count: resAchats.values?.[0]?.count || 0,
      total: resAchats.values?.[0]?.total || 0,
    },
    ecartStock: { totalEcart: 0 },
    caisse: caisseRow ? {
      reference: caisseRow.reference,
      soldeTheorique: caisseRow.solde_theorique,
      statut: caisseRow.statut,
      utilisateur: { nom: 'Administrateur', prenom: 'Local' },
    } : null,
    topProduits: (resTop?.values || []).map((t: any) => ({
      nom: t.nom,
      totalVendu: t.totalVendu,
      chiffreAffaires: t.chiffreAffaires
    })),
    totalProduits: resStock.values?.[0]?.count || 1,
    totalStock: resStock.values?.[0]?.totalStock || 500,
    totalClients: resClients.values?.[0]?.count || 1,
    isFromSQLite: true,
  };
}

export async function sqliteGetPendingCount(): Promise<number> {
  if (!db) return 0;
  const [resV, resC, resD, resA] = await Promise.all([
    db.query("SELECT COUNT(*) as c FROM ventes WHERE sync_status = 'pending'"),
    db.query("SELECT COUNT(*) as c FROM clients WHERE sync_status = 'pending'"),
    db.query("SELECT COUNT(*) as c FROM depenses WHERE sync_status = 'pending'"),
    db.query("SELECT COUNT(*) as c FROM achats WHERE sync_status = 'pending'"),
  ]);

  return (resV.values?.[0]?.c || 0) + (resC.values?.[0]?.c || 0) + (resD.values?.[0]?.c || 0) + (resA.values?.[0]?.c || 0);
}

// =====================================================
// RÉINITIALISATION COMPLÈTE — EFFACE TOUT LE SQLite LOCAL
// Utilisé lors d'un changement de serveur ou d'une réinitialisation manuelle
// =====================================================

export async function sqliteDropAllData(): Promise<void> {
  if (!db) return;
  const tables = [
    'inventaire_details', 'inventaires',
    'mouvements_caisse', 'mouvements_stock',
    'achat_details', 'achats',
    'depenses',
    'paiements_clients',
    'vente_details', 'ventes',
    'caisses',
    'tarifs', 'produits',
    'fournisseurs', 'clients',
    'utilisateurs', 'roles',
  ];
  for (const table of tables) {
    try {
      await db.run(`DELETE FROM ${table}`);
    } catch (_) { /* table peut ne pas exister */ }
  }
  // Réinitialiser les séquences auto-increment
  try { await db.run("DELETE FROM sqlite_sequence"); } catch (_) {}
  console.log('[SQLite] 🗑️ Toutes les données locales effacées — prêt pour re-synchronisation depuis le Cloud');
}

export { db };
