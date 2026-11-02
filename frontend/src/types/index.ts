export interface Role {
  id: number;
  nom: string;
  description?: string;
}

export interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  actif: boolean;
  roleId: number;
  role: Role;
  createdAt?: string;
}

export interface Tarif {
  id: number;
  produitId: number;
  designation: string;
  prix: number;
  actif: boolean;
}

export interface Produit {
  id: number;
  nom: string;
  description?: string;
  unite: string;
  actif: boolean;
  tarifs: Tarif[];
  stockActuel?: number;
  estFaible?: boolean;
}

export interface Client {
  id: number;
  nom: string;
  prenom?: string;
  telephone?: string;
  adresse?: string;
  email?: string;
  typeClient: 'particulier' | 'grossiste' | 'revendeur';
  actif: boolean;
  totalVentes?: number;
  totalPaye?: number;
  totalDette?: number;
  aDette?: boolean;
}

export interface Fournisseur {
  id: number;
  nom: string;
  contact?: string;
  telephone?: string;
  adresse?: string;
  email?: string;
  actif: boolean;
  totalAchats?: number;
  totalPaye?: number;
  totalDette?: number;
  aDette?: boolean;
}

export interface VenteDetail {
  id?: number;
  produitId: number;
  produit?: Produit;
  tarifId: number;
  tarif?: Tarif;
  quantite: number;
  prixUnitaire: number;
  montant: number;
}

export interface Vente {
  id: number;
  reference: string;
  clientId?: number | null;
  client?: Client | null;
  utilisateurId: number;
  utilisateur: User;
  dateVente: string;
  montantTotal: number;
  montantPaye: number;
  resteAPayer: number;
  statut: 'validee' | 'annulee';
  notes?: string;
  details: VenteDetail[];
}

export interface AchatDetail {
  id?: number;
  produitId: number;
  produit?: Produit;
  quantite: number;
  prixUnitaire: number;
  montant: number;
}

export interface Achat {
  id: number;
  reference: string;
  fournisseurId: number;
  fournisseur: Fournisseur;
  utilisateurId: number;
  utilisateur: User;
  dateAchat: string;
  montantTotal: number;
  montantPaye: number;
  resteAPayer: number;
  statut: 'commande' | 'receptionne' | 'paye';
  notes?: string;
  details: AchatDetail[];
}

export interface Caisse {
  id: number;
  reference: string;
  utilisateurId: number;
  utilisateur?: User;
  dateOuverture: string;
  dateCloture?: string | null;
  soldeInitial: number;
  soldeTheorique: number;
  soldeReel?: number | null;
  ecart?: number | null;
  statut: 'ouverte' | 'cloturee';
  notes?: string;
  totalEncaissements?: number;
  totalDecaissements?: number;
}

export interface MouvementCaisse {
  id: number;
  caisseId: number;
  utilisateurId: number;
  utilisateur?: User;
  typeOperation: string;
  montant: number;
  soldeAvant: number;
  soldeApres: number;
  description?: string;
  dateMouvement: string;
}

export interface Justificatif {
  id: number;
  nomFichier: string;
  cheminFichier: string;
  typeFichier: string;
  tailleFichier: number;
  createdAt: string;
}

export interface Depense {
  id: number;
  numero: string;
  utilisateurId: number;
  utilisateur: User;
  categorie: string;
  description: string;
  montant: number;
  modePaiement: string;
  beneficiaire?: string;
  dateDepense: string;
  hasJustificatif: boolean;
  notes?: string;
  justificatifs: Justificatif[];
}

export interface MouvementStock {
  id: number;
  produitId: number;
  produit?: Produit;
  typeOperation: string;
  quantite: number;
  stockAvant: number;
  stockApres: number;
  motif?: string;
  dateMouvement: string;
}

export interface InventaireDetail {
  id: number;
  produitId: number;
  produit: Produit;
  stockTheorique: number;
  stockPhysique: number;
  ecart: number;
  motifEcart?: string;
}

export interface Inventaire {
  id: number;
  reference: string;
  utilisateurId: number;
  utilisateur: User;
  dateInventaire: string;
  statut: 'en_cours' | 'valide' | 'annule';
  notes?: string;
  details: InventaireDetail[];
}

export interface DashboardData {
  periode: string;
  dateDebut: string;
  dateFin: string;
  ventes: {
    total: number;
    montantPaye: number;
    count: number;
  };
  encaissements: {
    total: number;
  };
  depenses: {
    total: number;
    count: number;
  };
  achats: {
    total: number;
  };
  dettesClients: {
    total: number;
    count: number;
  };
  dettesFournisseurs: {
    total: number;
    count: number;
  };
  caisse: {
    id: number;
    reference: string;
    soldeInitial: number;
    soldeTheorique: number;
    ouvertPar: string;
    dateOuverture: string;
  } | null;
  stock: Array<{
    produitId: number;
    nom: string;
    stockActuel: number;
  }>;
  ecartStock: {
    totalEcart: number;
    count: number;
  };
  beneficeEstime: number;
  topProduits: Array<{
    produitId: number;
    nom: string;
    totalVendu: number;
    chiffreAffaires: number;
  }>;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

