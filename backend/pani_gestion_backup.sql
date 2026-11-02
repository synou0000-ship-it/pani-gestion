--
-- PostgreSQL database dump
--

-- Dumped from database version 16.2
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Achat; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Achat" (
    id integer NOT NULL,
    reference text NOT NULL,
    "fournisseurId" integer NOT NULL,
    "utilisateurId" integer NOT NULL,
    "dateAchat" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "montantTotal" numeric(15,2) NOT NULL,
    "montantPaye" numeric(15,2) DEFAULT 0 NOT NULL,
    "resteAPayer" numeric(15,2) DEFAULT 0 NOT NULL,
    statut text DEFAULT 'receptionne'::text NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Achat" OWNER TO postgres;

--
-- Name: AchatDetail; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AchatDetail" (
    id integer NOT NULL,
    "achatId" integer NOT NULL,
    "produitId" integer NOT NULL,
    quantite numeric(15,3) NOT NULL,
    "prixUnitaire" numeric(15,2) NOT NULL,
    montant numeric(15,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AchatDetail" OWNER TO postgres;

--
-- Name: AchatDetail_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."AchatDetail_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."AchatDetail_id_seq" OWNER TO postgres;

--
-- Name: AchatDetail_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."AchatDetail_id_seq" OWNED BY public."AchatDetail".id;


--
-- Name: Achat_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Achat_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Achat_id_seq" OWNER TO postgres;

--
-- Name: Achat_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Achat_id_seq" OWNED BY public."Achat".id;


--
-- Name: Caisse; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Caisse" (
    id integer NOT NULL,
    reference text NOT NULL,
    "utilisateurId" integer NOT NULL,
    "dateOuverture" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dateCloture" timestamp(3) without time zone,
    "soldeInitial" numeric(15,2) NOT NULL,
    "soldeTheorique" numeric(15,2) DEFAULT 0 NOT NULL,
    "soldeReel" numeric(15,2),
    ecart numeric(15,2),
    statut text DEFAULT 'ouverte'::text NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Caisse" OWNER TO postgres;

--
-- Name: Caisse_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Caisse_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Caisse_id_seq" OWNER TO postgres;

--
-- Name: Caisse_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Caisse_id_seq" OWNED BY public."Caisse".id;


--
-- Name: Client; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Client" (
    id integer NOT NULL,
    nom text NOT NULL,
    prenom text,
    telephone text,
    adresse text,
    email text,
    "typeClient" text DEFAULT 'particulier'::text NOT NULL,
    actif boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Client" OWNER TO postgres;

--
-- Name: Client_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Client_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Client_id_seq" OWNER TO postgres;

--
-- Name: Client_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Client_id_seq" OWNED BY public."Client".id;


--
-- Name: Depense; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Depense" (
    id integer NOT NULL,
    numero text NOT NULL,
    "utilisateurId" integer NOT NULL,
    categorie text NOT NULL,
    description text NOT NULL,
    montant numeric(15,2) NOT NULL,
    "modePaiement" text DEFAULT 'especes'::text NOT NULL,
    beneficiaire text,
    "dateDepense" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    notes text,
    "hasJustificatif" boolean DEFAULT false NOT NULL,
    "mouvementCaisseId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Depense" OWNER TO postgres;

--
-- Name: Depense_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Depense_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Depense_id_seq" OWNER TO postgres;

--
-- Name: Depense_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Depense_id_seq" OWNED BY public."Depense".id;


--
-- Name: Fournisseur; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Fournisseur" (
    id integer NOT NULL,
    nom text NOT NULL,
    contact text,
    telephone text,
    adresse text,
    email text,
    actif boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Fournisseur" OWNER TO postgres;

--
-- Name: Fournisseur_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Fournisseur_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Fournisseur_id_seq" OWNER TO postgres;

--
-- Name: Fournisseur_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Fournisseur_id_seq" OWNED BY public."Fournisseur".id;


--
-- Name: Inventaire; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Inventaire" (
    id integer NOT NULL,
    reference text NOT NULL,
    "utilisateurId" integer NOT NULL,
    "dateInventaire" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    statut text DEFAULT 'en_cours'::text NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Inventaire" OWNER TO postgres;

--
-- Name: InventaireDetail; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."InventaireDetail" (
    id integer NOT NULL,
    "inventaireId" integer NOT NULL,
    "produitId" integer NOT NULL,
    "stockTheorique" numeric(15,3) NOT NULL,
    "stockPhysique" numeric(15,3) NOT NULL,
    ecart numeric(15,3) NOT NULL,
    "motifEcart" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."InventaireDetail" OWNER TO postgres;

--
-- Name: InventaireDetail_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."InventaireDetail_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."InventaireDetail_id_seq" OWNER TO postgres;

--
-- Name: InventaireDetail_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."InventaireDetail_id_seq" OWNED BY public."InventaireDetail".id;


--
-- Name: Inventaire_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Inventaire_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Inventaire_id_seq" OWNER TO postgres;

--
-- Name: Inventaire_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Inventaire_id_seq" OWNED BY public."Inventaire".id;


--
-- Name: JournalAudit; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."JournalAudit" (
    id integer NOT NULL,
    "utilisateurId" integer,
    action text NOT NULL,
    "table" text NOT NULL,
    "enregistrementId" integer,
    "anciennesValeurs" jsonb,
    "nouvellesValeurs" jsonb,
    "adresseIp" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."JournalAudit" OWNER TO postgres;

--
-- Name: JournalAudit_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."JournalAudit_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."JournalAudit_id_seq" OWNER TO postgres;

--
-- Name: JournalAudit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."JournalAudit_id_seq" OWNED BY public."JournalAudit".id;


--
-- Name: Justificatif; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Justificatif" (
    id integer NOT NULL,
    "depenseId" integer NOT NULL,
    "nomFichier" text NOT NULL,
    "cheminFichier" text NOT NULL,
    "typeFichier" text NOT NULL,
    "tailleFichier" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Justificatif" OWNER TO postgres;

--
-- Name: Justificatif_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Justificatif_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Justificatif_id_seq" OWNER TO postgres;

--
-- Name: Justificatif_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Justificatif_id_seq" OWNED BY public."Justificatif".id;


--
-- Name: MouvementCaisse; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."MouvementCaisse" (
    id integer NOT NULL,
    "caisseId" integer NOT NULL,
    "utilisateurId" integer NOT NULL,
    "typeOperation" text NOT NULL,
    montant numeric(15,2) NOT NULL,
    "soldeAvant" numeric(15,2) NOT NULL,
    "soldeApres" numeric(15,2) NOT NULL,
    description text,
    "dateMouvement" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."MouvementCaisse" OWNER TO postgres;

--
-- Name: MouvementCaisse_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."MouvementCaisse_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."MouvementCaisse_id_seq" OWNER TO postgres;

--
-- Name: MouvementCaisse_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."MouvementCaisse_id_seq" OWNED BY public."MouvementCaisse".id;


--
-- Name: MouvementStock; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."MouvementStock" (
    id integer NOT NULL,
    "produitId" integer NOT NULL,
    "typeOperation" text NOT NULL,
    quantite numeric(15,3) NOT NULL,
    "stockAvant" numeric(15,3) NOT NULL,
    "stockApres" numeric(15,3) NOT NULL,
    motif text,
    "venteId" integer,
    "achatId" integer,
    "inventaireId" integer,
    "dateMouvement" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."MouvementStock" OWNER TO postgres;

--
-- Name: MouvementStock_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."MouvementStock_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."MouvementStock_id_seq" OWNER TO postgres;

--
-- Name: MouvementStock_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."MouvementStock_id_seq" OWNED BY public."MouvementStock".id;


--
-- Name: PaiementClient; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PaiementClient" (
    id integer NOT NULL,
    "venteId" integer,
    "clientId" integer NOT NULL,
    montant numeric(15,2) NOT NULL,
    "modePaiement" text DEFAULT 'especes'::text NOT NULL,
    "datePaiement" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    notes text,
    "mouvementCaisseId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."PaiementClient" OWNER TO postgres;

--
-- Name: PaiementClient_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."PaiementClient_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."PaiementClient_id_seq" OWNER TO postgres;

--
-- Name: PaiementClient_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."PaiementClient_id_seq" OWNED BY public."PaiementClient".id;


--
-- Name: PaiementFournisseur; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PaiementFournisseur" (
    id integer NOT NULL,
    "achatId" integer,
    "fournisseurId" integer NOT NULL,
    montant numeric(15,2) NOT NULL,
    "modePaiement" text DEFAULT 'especes'::text NOT NULL,
    "datePaiement" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    notes text,
    "mouvementCaisseId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."PaiementFournisseur" OWNER TO postgres;

--
-- Name: PaiementFournisseur_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."PaiementFournisseur_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."PaiementFournisseur_id_seq" OWNER TO postgres;

--
-- Name: PaiementFournisseur_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."PaiementFournisseur_id_seq" OWNED BY public."PaiementFournisseur".id;


--
-- Name: Produit; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Produit" (
    id integer NOT NULL,
    nom text NOT NULL,
    description text,
    unite text DEFAULT 'unité'::text NOT NULL,
    actif boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Produit" OWNER TO postgres;

--
-- Name: Produit_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Produit_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Produit_id_seq" OWNER TO postgres;

--
-- Name: Produit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Produit_id_seq" OWNED BY public."Produit".id;


--
-- Name: Role; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Role" (
    id integer NOT NULL,
    nom text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Role" OWNER TO postgres;

--
-- Name: Role_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Role_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Role_id_seq" OWNER TO postgres;

--
-- Name: Role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Role_id_seq" OWNED BY public."Role".id;


--
-- Name: Tarif; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Tarif" (
    id integer NOT NULL,
    "produitId" integer NOT NULL,
    designation text NOT NULL,
    prix numeric(15,2) NOT NULL,
    actif boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Tarif" OWNER TO postgres;

--
-- Name: Tarif_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Tarif_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Tarif_id_seq" OWNER TO postgres;

--
-- Name: Tarif_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Tarif_id_seq" OWNED BY public."Tarif".id;


--
-- Name: Utilisateur; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Utilisateur" (
    id integer NOT NULL,
    nom text NOT NULL,
    prenom text NOT NULL,
    email text NOT NULL,
    telephone text,
    "motDePasse" text NOT NULL,
    actif boolean DEFAULT true NOT NULL,
    "roleId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Utilisateur" OWNER TO postgres;

--
-- Name: Utilisateur_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Utilisateur_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Utilisateur_id_seq" OWNER TO postgres;

--
-- Name: Utilisateur_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Utilisateur_id_seq" OWNED BY public."Utilisateur".id;


--
-- Name: Vente; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Vente" (
    id integer NOT NULL,
    reference text NOT NULL,
    "clientId" integer,
    "utilisateurId" integer NOT NULL,
    "dateVente" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "montantTotal" numeric(15,2) NOT NULL,
    "montantPaye" numeric(15,2) DEFAULT 0 NOT NULL,
    "resteAPayer" numeric(15,2) DEFAULT 0 NOT NULL,
    statut text DEFAULT 'validee'::text NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Vente" OWNER TO postgres;

--
-- Name: VenteDetail; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."VenteDetail" (
    id integer NOT NULL,
    "venteId" integer NOT NULL,
    "produitId" integer NOT NULL,
    "tarifId" integer NOT NULL,
    quantite numeric(15,3) NOT NULL,
    "prixUnitaire" numeric(15,2) NOT NULL,
    montant numeric(15,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."VenteDetail" OWNER TO postgres;

--
-- Name: VenteDetail_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."VenteDetail_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."VenteDetail_id_seq" OWNER TO postgres;

--
-- Name: VenteDetail_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."VenteDetail_id_seq" OWNED BY public."VenteDetail".id;


--
-- Name: Vente_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Vente_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Vente_id_seq" OWNER TO postgres;

--
-- Name: Vente_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Vente_id_seq" OWNED BY public."Vente".id;


--
-- Name: Achat id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Achat" ALTER COLUMN id SET DEFAULT nextval('public."Achat_id_seq"'::regclass);


--
-- Name: AchatDetail id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AchatDetail" ALTER COLUMN id SET DEFAULT nextval('public."AchatDetail_id_seq"'::regclass);


--
-- Name: Caisse id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Caisse" ALTER COLUMN id SET DEFAULT nextval('public."Caisse_id_seq"'::regclass);


--
-- Name: Client id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Client" ALTER COLUMN id SET DEFAULT nextval('public."Client_id_seq"'::regclass);


--
-- Name: Depense id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Depense" ALTER COLUMN id SET DEFAULT nextval('public."Depense_id_seq"'::regclass);


--
-- Name: Fournisseur id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Fournisseur" ALTER COLUMN id SET DEFAULT nextval('public."Fournisseur_id_seq"'::regclass);


--
-- Name: Inventaire id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Inventaire" ALTER COLUMN id SET DEFAULT nextval('public."Inventaire_id_seq"'::regclass);


--
-- Name: InventaireDetail id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InventaireDetail" ALTER COLUMN id SET DEFAULT nextval('public."InventaireDetail_id_seq"'::regclass);


--
-- Name: JournalAudit id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."JournalAudit" ALTER COLUMN id SET DEFAULT nextval('public."JournalAudit_id_seq"'::regclass);


--
-- Name: Justificatif id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Justificatif" ALTER COLUMN id SET DEFAULT nextval('public."Justificatif_id_seq"'::regclass);


--
-- Name: MouvementCaisse id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MouvementCaisse" ALTER COLUMN id SET DEFAULT nextval('public."MouvementCaisse_id_seq"'::regclass);


--
-- Name: MouvementStock id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MouvementStock" ALTER COLUMN id SET DEFAULT nextval('public."MouvementStock_id_seq"'::regclass);


--
-- Name: PaiementClient id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PaiementClient" ALTER COLUMN id SET DEFAULT nextval('public."PaiementClient_id_seq"'::regclass);


--
-- Name: PaiementFournisseur id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PaiementFournisseur" ALTER COLUMN id SET DEFAULT nextval('public."PaiementFournisseur_id_seq"'::regclass);


--
-- Name: Produit id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Produit" ALTER COLUMN id SET DEFAULT nextval('public."Produit_id_seq"'::regclass);


--
-- Name: Role id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Role" ALTER COLUMN id SET DEFAULT nextval('public."Role_id_seq"'::regclass);


--
-- Name: Tarif id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Tarif" ALTER COLUMN id SET DEFAULT nextval('public."Tarif_id_seq"'::regclass);


--
-- Name: Utilisateur id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Utilisateur" ALTER COLUMN id SET DEFAULT nextval('public."Utilisateur_id_seq"'::regclass);


--
-- Name: Vente id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Vente" ALTER COLUMN id SET DEFAULT nextval('public."Vente_id_seq"'::regclass);


--
-- Name: VenteDetail id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VenteDetail" ALTER COLUMN id SET DEFAULT nextval('public."VenteDetail_id_seq"'::regclass);


--
-- Data for Name: Achat; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Achat" (id, reference, "fournisseurId", "utilisateurId", "dateAchat", "montantTotal", "montantPaye", "resteAPayer", statut, notes, "createdAt", "updatedAt") FROM stdin;
1	ACH-20261101092916-639	1	1	2026-11-01 09:29:16.163	30000.00	10000.00	20000.00	receptionne	Approvisionnement hebdo Pani	2026-11-01 09:29:16.163	2026-11-01 09:29:16.163
\.


--
-- Data for Name: AchatDetail; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AchatDetail" (id, "achatId", "produitId", quantite, "prixUnitaire", montant, "createdAt") FROM stdin;
1	1	1	100.000	300.00	30000.00	2026-11-01 09:29:16.191
\.


--
-- Data for Name: Caisse; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Caisse" (id, reference, "utilisateurId", "dateOuverture", "dateCloture", "soldeInitial", "soldeTheorique", "soldeReel", ecart, statut, notes, "createdAt", "updatedAt") FROM stdin;
1	CS-20261101091733-367	1	2026-11-01 09:17:33.731	\N	0.00	141900.00	\N	\N	ouverte	\N	2026-11-01 09:17:33.731	2026-11-02 16:41:49.348
\.


--
-- Data for Name: Client; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Client" (id, nom, prenom, telephone, adresse, email, "typeClient", actif, "createdAt", "updatedAt") FROM stdin;
1	Client Comptant			\N	\N	particulier	t	2026-11-01 08:58:58.303	2026-11-01 08:58:58.303
2	Traoré	Mamadou	+223 76 11 22 33	Marché Médine	\N	grossiste	t	2026-11-01 08:58:58.32	2026-11-01 08:58:58.32
3	Diallo	Awa	+223 66 44 55 66	Badalabougou	\N	particulier	t	2026-11-01 08:58:58.333	2026-11-01 08:58:58.333
4	Konaté	Oumar	+223 79 88 99 00	Faladié	\N	revendeur	t	2026-11-01 08:58:58.346	2026-11-01 08:58:58.346
5	Diallo Mobile	\N	76112233	\N	\N	particulier	t	2026-11-01 18:40:37.18	2026-11-01 18:40:37.18
\.


--
-- Data for Name: Depense; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Depense" (id, numero, "utilisateurId", categorie, description, montant, "modePaiement", beneficiaire, "dateDepense", notes, "hasJustificatif", "mouvementCaisseId", "createdAt", "updatedAt") FROM stdin;
1	DEP-20261101092634-842	1	Transport	Achat carburant livraison Pani	1500.00	especes	Station Total	2026-11-01 09:26:34.971	\N	f	2	2026-11-01 09:26:34.971	2026-11-01 09:26:34.971
2	DEP-20261102015236-809	1	telephone	Connexion 	12500.00	especes	Djenne center	2026-11-02 01:52:36.912	\N	t	20	2026-11-02 01:52:36.912	2026-11-02 01:52:36.912
3	DEP-WEB-1793609786293	1	reparation	OOOO	6000.00	especes	LLLL	2026-11-02 08:56:26.293	[SYNCHRO]	f	24	2026-11-02 13:51:19.809	2026-11-02 13:51:19.809
4	DEP-20261102163751-231	1	livraison	Moto	8000.00	especes	Po	2026-11-02 16:37:52.029	\N	f	28	2026-11-02 16:37:52.029	2026-11-02 16:37:52.029
5	DEP-MOB-1793637469825-837	1	livraison	Moto	8000.00	especes	Po	2026-11-02 16:37:52.954	[SYNCHRO]	f	29	2026-11-02 16:37:52.958	2026-11-02 16:37:52.958
\.


--
-- Data for Name: Fournisseur; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Fournisseur" (id, nom, contact, telephone, adresse, email, actif, "createdAt", "updatedAt") FROM stdin;
1	Fournisseur Central Pani	Service Commercial	+223 20 22 33 44	Zone Industrielle	contact@fournisseur-pani.com	t	2026-11-01 08:58:58.378	2026-11-01 08:58:58.378
\.


--
-- Data for Name: Inventaire; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Inventaire" (id, reference, "utilisateurId", "dateInventaire", statut, notes, "createdAt", "updatedAt") FROM stdin;
1	INV-20261101092636-943	1	2026-11-01 09:26:36.423	valide	Inventaire de contrôle mensuel	2026-11-01 09:26:36.423	2026-11-01 09:27:01.526
\.


--
-- Data for Name: InventaireDetail; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."InventaireDetail" (id, "inventaireId", "produitId", "stockTheorique", "stockPhysique", ecart, "motifEcart", "createdAt") FROM stdin;
1	1	1	495.000	495.000	0.000	Comptage conforme	2026-11-01 09:26:36.45
\.


--
-- Data for Name: JournalAudit; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."JournalAudit" (id, "utilisateurId", action, "table", "enregistrementId", "anciennesValeurs", "nouvellesValeurs", "adresseIp", "createdAt") FROM stdin;
1	1	LOGIN	Utilisateur	1	\N	\N	::1	2026-11-01 09:01:35.976
2	1	LOGIN	Utilisateur	1	\N	\N	::1	2026-11-01 09:16:32.068
3	1	LOGIN	Utilisateur	1	\N	\N	::1	2026-11-01 09:16:46.554
4	1	LOGIN	Utilisateur	1	\N	\N	::1	2026-11-01 09:17:33.482
5	1	OUVERTURE_CAISSE	Caisse	1	\N	{"reference": "CS-20261101091733-367", "soldeInitial": 0}	::1	2026-11-01 09:17:33.752
6	1	CREATE	Vente	1	\N	{"reference": "VNT-20261101091733-899", "montantTotal": "1000"}	::1	2026-11-01 09:17:33.97
7	1	LOGIN	Utilisateur	1	\N	\N	::1	2026-11-01 09:17:51.372
8	1	LOGIN	Utilisateur	1	\N	\N	::1	2026-11-01 09:23:01.747
9	1	LOGIN	Utilisateur	1	\N	\N	::1	2026-11-01 09:25:50.809
10	1	CREATE	Vente	2	\N	{"reference": "VNT-20261101092551-972", "montantTotal": "2400"}	::1	2026-11-01 09:25:51.414
11	1	LOGIN	Utilisateur	1	\N	\N	::1	2026-11-01 09:26:17.843
12	1	LOGIN	Utilisateur	1	\N	\N	::1	2026-11-01 09:26:34.792
13	1	CREATE_DEPENSE	Depense	1	\N	{"numero": "DEP-20261101092634-842", "montant": 1500, "categorie": "Transport", "hasJustificatif": false}	::1	2026-11-01 09:26:34.989
14	1	CREATE_INVENTAIRE	Inventaire	1	\N	{"reference": "INV-20261101092636-943"}	::1	2026-11-01 09:26:36.477
15	1	LOGIN	Utilisateur	1	\N	\N	::1	2026-11-01 09:27:01.365
16	1	VALIDER_INVENTAIRE	Inventaire	1	\N	\N	::1	2026-11-01 09:27:01.557
17	1	LOGIN	Utilisateur	1	\N	\N	::1	2026-11-01 09:27:22.363
18	1	LOGIN	Utilisateur	1	\N	\N	::1	2026-11-01 09:27:37.415
19	1	LOGIN	Utilisateur	1	\N	\N	::1	2026-11-01 09:28:09.322
20	1	CREATE	Vente	3	\N	{"reference": "VNT-20261101092809-145", "montantTotal": "2000"}	::1	2026-11-01 09:28:09.715
21	1	PAIEMENT_DETTE_CLIENT	PaiementClient	3	\N	{"montant": 1000, "clientId": 2, "modePaiement": "especes"}	::1	2026-11-01 09:28:09.999
22	1	LOGIN	Utilisateur	1	\N	\N	::1	2026-11-01 09:28:52.539
23	1	LOGIN	Utilisateur	1	\N	\N	::1	2026-11-01 09:29:16.012
24	1	CREATE_ACHAT	Achat	1	\N	{"statut": "receptionne", "reference": "ACH-20261101092916-639", "totalAchat": 30000, "montantPayeNum": 10000}	::1	2026-11-01 09:29:16.266
25	1	LOGIN	Utilisateur	1	\N	\N	::1	2026-11-01 09:31:55.073
26	1	CREATE	Vente	4	\N	{"reference": "VNT-20261101094043-362", "montantTotal": "1500"}	::1	2026-11-01 09:40:43.224
27	1	LOGIN	Utilisateur	1	\N	\N	::1	2026-11-01 09:44:29.639
28	1	CREATE	Vente	5	\N	{"reference": "VNT-20261101095241-926", "montantTotal": "2500"}	::1	2026-11-01 09:52:41.751
29	1	LOGIN	Utilisateur	1	\N	\N	::ffff:127.0.0.1	2026-11-01 18:40:09.359
30	1	LOGIN	Utilisateur	1	\N	\N	::ffff:127.0.0.1	2026-11-01 18:40:37.055
31	1	SYNC_BIDIRECTIONAL_PUSH	Sync	\N	\N	{"errorsCount": 0, "ventesSynced": 1, "clientsSynced": 1, "depensesSynced": 0}	::1	2026-11-01 18:40:37.322
32	1	LOGIN	Utilisateur	1	\N	\N	::ffff:127.0.0.1	2026-11-01 18:40:53.47
33	1	LOGIN	Utilisateur	1	\N	\N	::1	2026-11-01 19:33:38.824
34	1	CREATE	Vente	7	\N	{"reference": "VNT-20261101194448-135", "montantTotal": "1000"}	::1	2026-11-01 19:44:49.115
35	1	CREATE	Vente	8	\N	{"reference": "VNT-20261101194506-393", "montantTotal": "10000"}	::1	2026-11-01 19:45:06.447
36	1	LOGIN	Utilisateur	1	\N	\N	127.0.0.1	2026-11-01 21:18:30.83
37	1	LOGIN	Utilisateur	1	\N	\N	127.0.0.1	2026-11-01 21:38:11.962
38	1	LOGIN	Utilisateur	1	\N	\N	127.0.0.1	2026-11-01 21:40:43.65
39	1	LOGIN	Utilisateur	1	\N	\N	127.0.0.1	2026-11-01 21:42:33.97
40	1	CREATE	Vente	9	\N	{"reference": "VNT-20261101214358-724", "montantTotal": "20000"}	127.0.0.1	2026-11-01 21:43:59.111
41	1	LOGIN	Utilisateur	1	\N	\N	127.0.0.1	2026-11-01 21:44:52.182
42	1	CREATE	Vente	10	\N	{"reference": "VNT-20261101214539-636", "montantTotal": "4000"}	127.0.0.1	2026-11-01 21:45:39.299
43	1	LOGIN	Utilisateur	1	\N	\N	127.0.0.1	2026-11-01 21:48:18.691
44	1	LOGIN	Utilisateur	1	\N	\N	127.0.0.1	2026-11-01 21:51:02.716
45	1	SYNC_BIDIRECTIONAL_PUSH	Sync	\N	\N	{"errorsCount": 0, "ventesSynced": 1, "clientsSynced": 0, "depensesSynced": 0}	127.0.0.1	2026-11-01 21:51:10.41
46	1	LOGIN	Utilisateur	1	\N	\N	127.0.0.1	2026-11-01 21:56:54.484
47	1	CREATE	Vente	12	\N	{"reference": "VNT-20261101220356-872", "montantTotal": "40000"}	127.0.0.1	2026-11-01 22:03:56.642
48	1	SYNC_BIDIRECTIONAL_PUSH	Sync	\N	\N	{"errorsCount": 0, "ventesSynced": 1, "clientsSynced": 0, "depensesSynced": 0}	127.0.0.1	2026-11-01 22:19:55.918
49	1	LOGIN	Utilisateur	1	\N	\N	127.0.0.1	2026-11-01 22:41:24.637
50	1	LOGIN	Utilisateur	1	\N	\N	127.0.0.1	2026-11-01 23:07:51.196
51	1	LOGIN	Utilisateur	1	\N	\N	127.0.0.1	2026-11-01 23:08:28.306
52	1	LOGIN	Utilisateur	1	\N	\N	127.0.0.1	2026-11-01 23:10:51.171
53	1	CREATE	Vente	14	\N	{"reference": "VNT-20261101231206-994", "montantTotal": "8000"}	127.0.0.1	2026-11-01 23:12:07.107
54	1	CREATE	Vente	15	\N	{"reference": "VNT-20261101231300-297", "montantTotal": "10000"}	127.0.0.1	2026-11-01 23:13:00.976
55	1	SYNC_BIDIRECTIONAL_PUSH	Sync	\N	\N	{"errorsCount": 0, "achatsSynced": 0, "ventesSynced": 1, "clientsSynced": 0, "depensesSynced": 0}	127.0.0.1	2026-11-01 23:16:39.111
56	1	LOGIN	Utilisateur	1	\N	\N	127.0.0.1	2026-11-02 01:24:22.807
57	1	LOGIN	Utilisateur	1	\N	\N	127.0.0.1	2026-11-02 01:24:40.083
58	1	SYNC_BIDIRECTIONAL_PUSH	Sync	\N	\N	{"errorsCount": 0, "achatsSynced": 0, "ventesSynced": 1, "clientsSynced": 0, "depensesSynced": 0}	127.0.0.1	2026-11-02 01:24:56.994
59	1	LOGIN	Utilisateur	1	\N	\N	127.0.0.1	2026-11-02 01:50:00.262
60	1	CREATE_DEPENSE	Depense	2	\N	{"numero": "DEP-20261102015236-809", "montant": 12500, "categorie": "telephone", "hasJustificatif": true}	127.0.0.1	2026-11-02 01:52:36.958
61	1	CREATE	Vente	18	\N	{"reference": "VNT-20261102034252-672", "montantTotal": "20000"}	127.0.0.1	2026-11-02 03:42:53.084
62	1	LOGIN	Utilisateur	1	\N	\N	127.0.0.1	2026-11-02 13:51:17.068
63	1	SYNC_BIDIRECTIONAL_PUSH	Sync	\N	\N	{"errorsCount": 0, "achatsSynced": 0, "ventesSynced": 2, "clientsSynced": 0, "depensesSynced": 1}	127.0.0.1	2026-11-02 13:51:19.882
64	1	LOGIN	Utilisateur	1	\N	\N	127.0.0.1	2026-11-02 13:58:33.251
65	1	SYNC_BIDIRECTIONAL_PUSH	Sync	\N	\N	{"errorsCount": 0, "achatsSynced": 0, "ventesSynced": 1, "clientsSynced": 0, "depensesSynced": 0}	127.0.0.1	2026-11-02 14:02:13.973
66	1	LOGIN	Utilisateur	1	\N	\N	127.0.0.1	2026-11-02 15:11:56.12
67	1	SYNC_BIDIRECTIONAL_PUSH	Sync	\N	\N	{"errorsCount": 0, "achatsSynced": 0, "ventesSynced": 1, "clientsSynced": 0, "depensesSynced": 0}	127.0.0.1	2026-11-02 15:12:03.985
68	1	LOGIN	Utilisateur	1	\N	\N	127.0.0.1	2026-11-02 16:32:54.86
69	1	SYNC_BIDIRECTIONAL_PUSH	Sync	\N	\N	{"errorsCount": 0, "achatsSynced": 0, "ventesSynced": 1, "clientsSynced": 0, "depensesSynced": 0}	127.0.0.1	2026-11-02 16:32:57.441
70	1	LOGIN	Utilisateur	1	\N	\N	127.0.0.1	2026-11-02 16:35:03.272
71	1	CREATE_DEPENSE	Depense	4	\N	{"numero": "DEP-20261102163751-231", "montant": 8000, "categorie": "livraison", "hasJustificatif": false}	127.0.0.1	2026-11-02 16:37:52.066
72	1	SYNC_BIDIRECTIONAL_PUSH	Sync	\N	\N	{"errorsCount": 0, "achatsSynced": 0, "ventesSynced": 0, "clientsSynced": 0, "depensesSynced": 1}	127.0.0.1	2026-11-02 16:37:52.972
73	1	LOGIN	Utilisateur	1	\N	\N	127.0.0.1	2026-11-02 16:41:25.572
74	1	SYNC_BIDIRECTIONAL_PUSH	Sync	\N	\N	{"errorsCount": 0, "achatsSynced": 0, "ventesSynced": 1, "clientsSynced": 0, "depensesSynced": 0}	127.0.0.1	2026-11-02 16:41:49.406
75	1	SYNC_BIDIRECTIONAL_PUSH	Sync	\N	\N	{"errorsCount": 0, "achatsSynced": 0, "ventesSynced": 1, "clientsSynced": 0, "depensesSynced": 0}	127.0.0.1	2026-11-02 16:41:56.172
\.


--
-- Data for Name: Justificatif; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Justificatif" (id, "depenseId", "nomFichier", "cheminFichier", "typeFichier", "tailleFichier", "createdAt") FROM stdin;
1	2	null-20261101-WA0001.jpg	uploads\\justificatif-1793584356640-219641940.jpg	image/jpeg	17049	2026-11-02 01:52:36.928
\.


--
-- Data for Name: MouvementCaisse; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."MouvementCaisse" (id, "caisseId", "utilisateurId", "typeOperation", montant, "soldeAvant", "soldeApres", description, "dateMouvement", "createdAt") FROM stdin;
1	1	1	encaissement_vente	2400.00	0.00	2400.00	Encaissement vente VNT-20261101092551-972	2026-11-01 09:25:51.353	2026-11-01 09:25:51.353
2	1	1	decaissement_depense	1500.00	2400.00	900.00	Dépense [Transport]: Achat carburant livraison Pani	2026-11-01 09:26:34.953	2026-11-01 09:26:34.953
3	1	1	encaissement_vente	500.00	900.00	1400.00	Encaissement vente VNT-20261101092809-145	2026-11-01 09:28:09.65	2026-11-01 09:28:09.65
4	1	1	paiement_client_dette	1000.00	1400.00	2400.00	Règlement dette client: Traoré Mamadou	2026-11-01 09:28:09.961	2026-11-01 09:28:09.961
5	1	1	paiement_fournisseur	10000.00	2400.00	-7600.00	Paiement achat ACH-20261101092916-639	2026-11-01 09:29:16.234	2026-11-01 09:29:16.234
6	1	1	encaissement_vente	2000.00	-7600.00	-5600.00	Encaissement vente VNT-20261101094043-362	2026-11-01 09:40:43.182	2026-11-01 09:40:43.182
7	1	1	encaissement_vente	2500.00	-5600.00	-3100.00	Encaissement vente VNT-20261101095241-926	2026-11-01 09:52:41.683	2026-11-01 09:52:41.683
8	1	1	entree_vente	1000.00	-3100.00	-2100.00	Paiement Vente VTE-TEST-PUSH-1793558437102 (Synchro)	2026-11-01 18:40:37.279	2026-11-01 18:40:37.279
9	1	1	encaissement_vente	1000.00	-2100.00	-1100.00	Encaissement vente VNT-20261101194448-135	2026-11-01 19:44:49.056	2026-11-01 19:44:49.056
10	1	1	encaissement_vente	10000.00	-1100.00	8900.00	Encaissement vente VNT-20261101194506-393	2026-11-01 19:45:06.403	2026-11-01 19:45:06.403
11	1	1	encaissement_vente	20000.00	8900.00	28900.00	Encaissement vente VNT-20261101214358-724	2026-11-01 21:43:59.08	2026-11-01 21:43:59.08
12	1	1	encaissement_vente	4000.00	28900.00	32900.00	Encaissement vente VNT-20261101214539-636	2026-11-01 21:45:39.261	2026-11-01 21:45:39.261
13	1	1	entree_vente	7500.00	32900.00	40400.00	Paiement Vente VTE-MOB-1793569746832-591 (Synchro)	2026-11-01 21:51:10.331	2026-11-01 21:51:10.331
14	1	1	encaissement_vente	40000.00	40400.00	80400.00	Encaissement vente VNT-20261101220356-872	2026-11-01 22:03:56.607	2026-11-01 22:03:56.607
15	1	1	entree_vente	10000.00	80400.00	90400.00	Paiement Vente VTE-MOB-1793570139266-915 (Synchro)	2026-11-01 22:19:55.886	2026-11-01 22:19:55.886
16	1	1	encaissement_vente	8000.00	90400.00	98400.00	Encaissement vente VNT-20261101231206-994	2026-11-01 23:12:07.074	2026-11-01 23:12:07.074
17	1	1	encaissement_vente	10000.00	98400.00	108400.00	Encaissement vente VNT-20261101231300-297	2026-11-01 23:13:00.934	2026-11-01 23:13:00.934
18	1	1	entree_vente	3000.00	108400.00	111400.00	Paiement Vente VTE-MOB-1793574847082-91 (Synchro)	2026-11-01 23:16:39.078	2026-11-01 23:16:39.078
19	1	1	entree_vente	26000.00	111400.00	137400.00	Paiement Vente VTE-MOB-1793582160959-619 (Synchro)	2026-11-02 01:24:56.987	2026-11-02 01:24:56.987
20	1	1	decaissement_depense	12500.00	137400.00	124900.00	Dépense [telephone]: Connexion 	2026-11-02 01:52:36.887	2026-11-02 01:52:36.887
21	1	1	encaissement_vente	20000.00	124900.00	144900.00	Encaissement vente VNT-20261102034252-672	2026-11-02 03:42:52.989	2026-11-02 03:42:52.989
22	1	1	entree_vente	4000.00	144900.00	148900.00	Paiement Vente VTE-MOB-1793609200989-854 (Synchro)	2026-11-02 13:51:19.48	2026-11-02 13:51:19.48
23	1	1	entree_vente	4000.00	148900.00	152900.00	Paiement Vente VTE-LOC-1793626703167-785 (Synchro)	2026-11-02 13:51:19.63	2026-11-02 13:51:19.63
24	1	1	sortie_depense	6000.00	152900.00	146900.00	Dépense DEP-WEB-1793609786293: OOOO	2026-11-02 13:51:19.781	2026-11-02 13:51:19.781
25	1	1	entree_vente	1000.00	146900.00	147900.00	Paiement Vente VTE-MOB-1793627971195-500 (Synchro)	2026-11-02 14:02:13.961	2026-11-02 14:02:13.961
26	1	1	entree_vente	2000.00	147900.00	149900.00	Paiement Vente VTE-LOC-1793632211750-202 (Synchro)	2026-11-02 15:12:03.973	2026-11-02 15:12:03.973
27	1	1	entree_vente	3000.00	149900.00	152900.00	Paiement Vente VTE-LOC-1793634841262-593 (Synchro)	2026-11-02 16:32:57.389	2026-11-02 16:32:57.389
28	1	1	decaissement_depense	8000.00	152900.00	144900.00	Dépense [livraison]: Moto	2026-11-02 16:37:51.995	2026-11-02 16:37:51.995
29	1	1	sortie_depense	8000.00	144900.00	136900.00	Dépense DEP-MOB-1793637469825-837: Moto	2026-11-02 16:37:52.922	2026-11-02 16:37:52.922
30	1	1	entree_vente	5000.00	136900.00	141900.00	Paiement Vente VTE-MOB-1793637586077-179 (Synchro)	2026-11-02 16:41:49.334	2026-11-02 16:41:49.334
\.


--
-- Data for Name: MouvementStock; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."MouvementStock" (id, "produitId", "typeOperation", quantite, "stockAvant", "stockApres", motif, "venteId", "achatId", "inventaireId", "dateMouvement", "createdAt") FROM stdin;
1	1	entree	500.000	0.000	500.000	Stock initial de démarrage	\N	\N	\N	2026-11-01 08:58:58.267	2026-11-01 08:58:58.267
2	1	sortie_vente	2.000	500.000	498.000	Vente VNT-20261101091733-899	1	\N	\N	2026-11-01 09:17:33.947	2026-11-01 09:17:33.947
3	1	sortie_vente	3.000	498.000	495.000	Vente VNT-20261101092551-972	2	\N	\N	2026-11-01 09:25:51.333	2026-11-01 09:25:51.333
4	1	sortie_vente	1.000	495.000	494.000	Vente VNT-20261101092809-145	3	\N	\N	2026-11-01 09:28:09.637	2026-11-01 09:28:09.637
5	1	entree	100.000	494.000	594.000	Réception achat ref ACH-20261101092916-639	\N	1	\N	2026-11-01 09:29:16.216	2026-11-01 09:29:16.216
6	1	sortie_vente	1.000	594.000	593.000	Vente VNT-20261101094043-362	4	\N	\N	2026-11-01 09:40:43.169	2026-11-01 09:40:43.169
7	1	sortie_vente	1.000	593.000	592.000	Vente VNT-20261101095241-926	5	\N	\N	2026-11-01 09:52:41.668	2026-11-01 09:52:41.668
8	1	sortie_vente	1.000	592.000	591.000	Vente VTE-TEST-PUSH-1793558437102 (Synchro)	6	\N	\N	2026-11-01 18:40:37.253	2026-11-01 18:40:37.253
9	1	sortie_vente	1.000	591.000	590.000	Vente VNT-20261101194448-135	7	\N	\N	2026-11-01 19:44:49.037	2026-11-01 19:44:49.037
10	1	sortie_vente	10.000	590.000	580.000	Vente VNT-20261101194506-393	8	\N	\N	2026-11-01 19:45:06.388	2026-11-01 19:45:06.388
11	1	sortie_vente	8.000	580.000	572.000	Vente VNT-20261101214358-724	9	\N	\N	2026-11-01 21:43:59.064	2026-11-01 21:43:59.064
12	1	sortie_vente	4.000	572.000	568.000	Vente VNT-20261101214539-636	10	\N	\N	2026-11-01 21:45:39.246	2026-11-01 21:45:39.246
13	1	sortie_vente	1.000	568.000	567.000	Vente VTE-MOB-1793569746832-591 (Synchro)	11	\N	\N	2026-11-01 21:51:10.201	2026-11-01 21:51:10.201
14	1	sortie_vente	1.000	567.000	566.000	Vente VTE-MOB-1793569746832-591 (Synchro)	11	\N	\N	2026-11-01 21:51:10.232	2026-11-01 21:51:10.232
15	1	sortie_vente	1.000	566.000	565.000	Vente VTE-MOB-1793569746832-591 (Synchro)	11	\N	\N	2026-11-01 21:51:10.257	2026-11-01 21:51:10.257
16	1	sortie_vente	1.000	565.000	564.000	Vente VTE-MOB-1793569746832-591 (Synchro)	11	\N	\N	2026-11-01 21:51:10.283	2026-11-01 21:51:10.283
17	1	sortie_vente	1.000	564.000	563.000	Vente VTE-MOB-1793569746832-591 (Synchro)	11	\N	\N	2026-11-01 21:51:10.31	2026-11-01 21:51:10.31
18	1	sortie_vente	2.000	563.000	561.000	Vente VNT-20261101220356-872	12	\N	\N	2026-11-01 22:03:56.593	2026-11-01 22:03:56.593
19	1	sortie_vente	4.000	561.000	557.000	Vente VTE-MOB-1793570139266-915 (Synchro)	13	\N	\N	2026-11-01 22:19:55.864	2026-11-01 22:19:55.864
20	1	sortie_vente	4.000	557.000	553.000	Vente VNT-20261101231206-994	14	\N	\N	2026-11-01 23:12:07.058	2026-11-01 23:12:07.058
21	1	sortie_vente	5.000	553.000	548.000	Vente VNT-20261101231300-297	15	\N	\N	2026-11-01 23:13:00.918	2026-11-01 23:13:00.918
22	1	sortie_vente	1.000	548.000	547.000	Vente VTE-MOB-1793574847082-91 (Synchro)	16	\N	\N	2026-11-01 23:16:38.995	2026-11-01 23:16:38.995
23	1	sortie_vente	1.000	547.000	546.000	Vente VTE-MOB-1793574847082-91 (Synchro)	16	\N	\N	2026-11-01 23:16:39.028	2026-11-01 23:16:39.028
24	1	sortie_vente	1.000	546.000	545.000	Vente VTE-MOB-1793574847082-91 (Synchro)	16	\N	\N	2026-11-01 23:16:39.056	2026-11-01 23:16:39.056
25	1	sortie_vente	11.000	545.000	534.000	Vente VTE-MOB-1793582160959-619 (Synchro)	17	\N	\N	2026-11-02 01:24:56.978	2026-11-02 01:24:56.978
26	1	sortie_vente	1.000	534.000	533.000	Vente VTE-MOB-1793582160959-619 (Synchro)	17	\N	\N	2026-11-02 01:24:56.981	2026-11-02 01:24:56.981
27	1	sortie_vente	1.000	533.000	532.000	Vente VTE-MOB-1793582160959-619 (Synchro)	17	\N	\N	2026-11-02 01:24:56.984	2026-11-02 01:24:56.984
28	1	sortie_vente	40.000	532.000	492.000	Vente VNT-20261102034252-672	18	\N	\N	2026-11-02 03:42:52.97	2026-11-02 03:42:52.97
29	1	sortie_vente	2.000	492.000	490.000	Vente VTE-MOB-1793609200989-854 (Synchro)	19	\N	\N	2026-11-02 13:51:19.442	2026-11-02 13:51:19.442
30	1	sortie_vente	2.000	490.000	488.000	Vente VTE-LOC-1793626703167-785 (Synchro)	20	\N	\N	2026-11-02 13:51:19.609	2026-11-02 13:51:19.609
31	1	sortie_vente	1.000	488.000	487.000	Vente VTE-MOB-1793627971195-500 (Synchro)	21	\N	\N	2026-11-02 14:02:13.954	2026-11-02 14:02:13.954
32	1	sortie_vente	1.000	487.000	486.000	Vente VTE-LOC-1793632211750-202 (Synchro)	22	\N	\N	2026-11-02 15:12:03.965	2026-11-02 15:12:03.965
33	1	sortie_vente	1.000	486.000	485.000	Vente VTE-LOC-1793634841262-593 (Synchro)	23	\N	\N	2026-11-02 16:32:57.247	2026-11-02 16:32:57.247
34	1	sortie_vente	1.000	485.000	484.000	Vente VTE-LOC-1793634841262-593 (Synchro)	23	\N	\N	2026-11-02 16:32:57.348	2026-11-02 16:32:57.348
35	1	sortie_vente	2.000	484.000	482.000	Vente VTE-MOB-1793637586077-179 (Synchro)	24	\N	\N	2026-11-02 16:41:49.274	2026-11-02 16:41:49.274
\.


--
-- Data for Name: PaiementClient; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PaiementClient" (id, "venteId", "clientId", montant, "modePaiement", "datePaiement", notes, "mouvementCaisseId", "createdAt") FROM stdin;
1	2	1	2400.00	ESPECES	2026-11-01 09:25:51.389	\N	1	2026-11-01 09:25:51.389
2	3	2	500.00	ESPECES	2026-11-01 09:28:09.683	\N	3	2026-11-01 09:28:09.683
3	\N	2	1000.00	especes	2026-11-01 09:28:09.984	Règlement partiel dette	4	2026-11-01 09:28:09.984
4	6	5	1000.00	especes	2026-11-01 18:40:37.307	Paiement comptant synchro vente VTE-TEST-PUSH-1793558437102	8	2026-11-01 18:40:37.307
\.


--
-- Data for Name: PaiementFournisseur; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PaiementFournisseur" (id, "achatId", "fournisseurId", montant, "modePaiement", "datePaiement", notes, "mouvementCaisseId", "createdAt") FROM stdin;
1	1	1	10000.00	especes	2026-11-01 09:29:16.249	\N	5	2026-11-01 09:29:16.249
\.


--
-- Data for Name: Produit; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Produit" (id, nom, description, unite, actif, "createdAt", "updatedAt") FROM stdin;
1	Pani	Produit consommable Pani - Conditionnement commercial	unité	t	2026-11-01 08:58:58.13	2026-11-01 08:58:58.13
\.


--
-- Data for Name: Role; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Role" (id, nom, description, "createdAt", "updatedAt") FROM stdin;
1	Administrateur	Accès complet à tous les modules	2026-11-01 08:58:57.114	2026-11-01 08:58:57.114
2	Gestionnaire	Stocks, ventes, achats et rapports	2026-11-01 08:58:57.208	2026-11-01 08:58:57.208
3	Vendeur	Enregistrement des ventes et consultation limitée	2026-11-01 08:58:57.216	2026-11-01 08:58:57.216
4	Caissier	Gestion de caisse et encaissements	2026-11-01 08:58:57.223	2026-11-01 08:58:57.223
5	Comptable	Dépenses, dettes et rapports financiers	2026-11-01 08:58:57.233	2026-11-01 08:58:57.233
\.


--
-- Data for Name: Tarif; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Tarif" (id, "produitId", designation, prix, actif, "createdAt", "updatedAt") FROM stdin;
1	1	Petit prix	500.00	t	2026-11-01 08:58:58.171	2026-11-01 08:58:58.171
2	1	Prix intermédiaire 1	1000.00	t	2026-11-01 08:58:58.191	2026-11-01 08:58:58.191
3	1	Prix intermédiaire 2	1500.00	t	2026-11-01 08:58:58.204	2026-11-01 08:58:58.204
4	1	Prix supérieur	2000.00	t	2026-11-01 08:58:58.218	2026-11-01 08:58:58.218
5	1	Prix grossiste / spécifique	2500.00	t	2026-11-01 08:58:58.233	2026-11-01 08:58:58.233
\.


--
-- Data for Name: Utilisateur; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Utilisateur" (id, nom, prenom, email, telephone, "motDePasse", actif, "roleId", "createdAt", "updatedAt") FROM stdin;
1	Sissoko	Administrateur	admin@pani.com	+223 70 00 00 00	$2a$10$3xW99ZWie0rxsE2qJqD9Ju6mGi5U9HVkyCFQEau2zq58kobY0X2AK	t	1	2026-11-01 08:58:58.001	2026-11-01 08:58:58.001
2	Coulibaly	Vendeur	vendeur@pani.com	+223 71 00 00 00	$2a$10$3xW99ZWie0rxsE2qJqD9Ju6mGi5U9HVkyCFQEau2zq58kobY0X2AK	t	3	2026-11-01 08:58:58.076	2026-11-01 08:58:58.076
\.


--
-- Data for Name: Vente; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Vente" (id, reference, "clientId", "utilisateurId", "dateVente", "montantTotal", "montantPaye", "resteAPayer", statut, notes, "createdAt", "updatedAt") FROM stdin;
1	VNT-20261101091733-899	1	1	2026-11-01 09:17:33.893	1000.00	0.00	1000.00	validee	\N	2026-11-01 09:17:33.893	2026-11-01 09:17:33.893
2	VNT-20261101092551-972	1	1	2026-11-01 09:25:51.154	2400.00	2400.00	0.00	validee	Vente tarif spécifique négocié	2026-11-01 09:25:51.154	2026-11-01 09:25:51.154
3	VNT-20261101092809-145	2	1	2026-11-01 09:28:09.584	2000.00	1500.00	500.00	validee	Vente avec crédit partiel	2026-11-01 09:28:09.584	2026-11-01 09:28:09.976
4	VNT-20261101094043-362	\N	1	2026-11-01 09:40:43.111	1500.00	2000.00	-500.00	validee		2026-11-01 09:40:43.111	2026-11-01 09:40:43.111
5	VNT-20261101095241-926	\N	1	2026-11-01 09:52:41.548	2500.00	2500.00	0.00	validee		2026-11-01 09:52:41.548	2026-11-01 09:52:41.548
6	VTE-TEST-PUSH-1793558437102	5	1	2026-11-01 18:40:37.212	1000.00	1000.00	0.00	validee	[SYNCHRO]	2026-11-01 18:40:37.216	2026-11-01 18:40:37.216
7	VNT-20261101194448-135	\N	1	2026-11-01 19:44:48.964	1000.00	1000.00	0.00	validee		2026-11-01 19:44:48.964	2026-11-01 19:44:48.964
8	VNT-20261101194506-393	\N	1	2026-11-01 19:45:06.327	10000.00	10000.00	0.00	validee		2026-11-01 19:45:06.327	2026-11-01 19:45:06.327
9	VNT-20261101214358-724	\N	1	2026-11-01 21:43:59.004	20000.00	20000.00	0.00	validee		2026-11-01 21:43:59.004	2026-11-01 21:43:59.004
10	VNT-20261101214539-636	\N	1	2026-11-01 21:45:39.198	4000.00	4000.00	0.00	validee		2026-11-01 21:45:39.198	2026-11-01 21:45:39.198
11	VTE-MOB-1793569746832-591	\N	1	2026-11-01 21:49:06	7500.00	7500.00	0.00	validee	[SYNCHRO]	2026-11-01 21:51:10.164	2026-11-01 21:51:10.164
12	VNT-20261101220356-872	\N	1	2026-11-01 22:03:56.532	40000.00	40000.00	0.00	validee		2026-11-01 22:03:56.532	2026-11-01 22:03:56.532
13	VTE-MOB-1793570139266-915	\N	1	2026-11-01 21:55:39.266	10000.00	10000.00	0.00	validee	[SYNCHRO]	2026-11-01 22:19:55.829	2026-11-01 22:19:55.829
14	VNT-20261101231206-994	\N	1	2026-11-01 23:12:07.001	8000.00	8000.00	0.00	validee		2026-11-01 23:12:07.001	2026-11-01 23:12:07.001
15	VNT-20261101231300-297	\N	1	2026-11-01 23:13:00.852	10000.00	10000.00	0.00	validee		2026-11-01 23:13:00.852	2026-11-01 23:13:00.852
16	VTE-MOB-1793574847082-91	\N	1	2026-11-01 23:14:07.082	3000.00	3000.00	0.00	validee	[SYNCHRO]	2026-11-01 23:16:38.938	2026-11-01 23:16:38.938
17	VTE-MOB-1793582160959-619	\N	1	2026-11-02 01:16:00	26000.00	26000.00	0.00	validee	[SYNCHRO]	2026-11-02 01:24:56.974	2026-11-02 01:24:56.974
18	VNT-20261102034252-672	\N	1	2026-11-02 03:42:52.902	20000.00	20000.00	0.00	validee		2026-11-02 03:42:52.902	2026-11-02 03:42:52.902
19	VTE-MOB-1793609200989-854	\N	1	2026-11-02 08:46:40.99	4000.00	4000.00	0.00	validee	[SYNCHRO]	2026-11-02 13:51:19.373	2026-11-02 13:51:19.373
20	VTE-LOC-1793626703167-785	\N	1	2026-11-02 13:38:23.167	4000.00	4000.00	0.00	validee	[SYNCHRO]	2026-11-02 13:51:19.569	2026-11-02 13:51:19.569
21	VTE-MOB-1793627971195-500	\N	1	2026-11-02 13:59:31	1000.00	1000.00	0.00	validee	[SYNCHRO]	2026-11-02 14:02:13.943	2026-11-02 14:02:13.943
22	VTE-LOC-1793632211750-202	\N	1	2026-11-02 15:10:11.75	2000.00	2000.00	0.00	validee	[SYNCHRO]	2026-11-02 15:12:03.952	2026-11-02 15:12:03.952
23	VTE-LOC-1793634841262-593	\N	1	2026-11-02 15:54:01.262	3000.00	3000.00	0.00	validee	[SYNCHRO]	2026-11-02 16:32:57.078	2026-11-02 16:32:57.078
24	VTE-MOB-1793637586077-179	\N	1	2026-11-02 16:39:46.077	5000.00	5000.00	0.00	validee	[SYNCHRO]	2026-11-02 16:41:49.235	2026-11-02 16:41:49.235
\.


--
-- Data for Name: VenteDetail; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."VenteDetail" (id, "venteId", "produitId", "tarifId", quantite, "prixUnitaire", montant, "createdAt") FROM stdin;
1	1	1	1	2.000	500.00	1000.00	2026-11-01 09:17:33.893
2	2	1	1	3.000	800.00	2400.00	2026-11-01 09:25:51.154
3	3	1	1	1.000	2000.00	2000.00	2026-11-01 09:28:09.584
4	4	1	3	1.000	1500.00	1500.00	2026-11-01 09:40:43.111
5	5	1	5	1.000	2500.00	2500.00	2026-11-01 09:52:41.548
6	6	1	2	1.000	1000.00	1000.00	2026-11-01 18:40:37.229
7	7	1	2	1.000	1000.00	1000.00	2026-11-01 19:44:48.964
8	8	1	2	10.000	1000.00	10000.00	2026-11-01 19:45:06.327
9	9	1	5	8.000	2500.00	20000.00	2026-11-01 21:43:59.004
10	10	1	2	4.000	1000.00	4000.00	2026-11-01 21:45:39.198
11	11	1	3	1.000	1500.00	1500.00	2026-11-01 21:51:10.177
12	11	1	2	1.000	1000.00	1000.00	2026-11-01 21:51:10.214
13	11	1	4	1.000	2000.00	2000.00	2026-11-01 21:51:10.241
14	11	1	1	1.000	500.00	500.00	2026-11-01 21:51:10.267
15	11	1	5	1.000	2500.00	2500.00	2026-11-01 21:51:10.292
16	12	1	1	2.000	20000.00	40000.00	2026-11-01 22:03:56.532
17	13	1	5	4.000	2500.00	10000.00	2026-11-01 22:19:55.844
18	14	1	4	4.000	2000.00	8000.00	2026-11-01 23:12:07.001
19	15	1	4	5.000	2000.00	10000.00	2026-11-01 23:13:00.852
20	16	1	2	1.000	1000.00	1000.00	2026-11-01 23:16:38.955
21	16	1	3	1.000	1500.00	1500.00	2026-11-01 23:16:39.01
22	16	1	1	1.000	500.00	500.00	2026-11-01 23:16:39.038
23	17	1	4	11.000	2000.00	22000.00	2026-11-02 01:24:56.975
24	17	1	5	1.000	2500.00	2500.00	2026-11-02 01:24:56.979
25	17	1	3	1.000	1500.00	1500.00	2026-11-02 01:24:56.982
26	18	1	1	40.000	500.00	20000.00	2026-11-02 03:42:52.902
27	19	1	4	2.000	2000.00	4000.00	2026-11-02 13:51:19.391
28	20	1	4	2.000	2000.00	4000.00	2026-11-02 13:51:19.586
29	21	1	2	1.000	1000.00	1000.00	2026-11-02 14:02:13.947
30	22	1	4	1.000	2000.00	2000.00	2026-11-02 15:12:03.957
31	23	1	2	1.000	1000.00	1000.00	2026-11-02 16:32:57.103
32	23	1	4	1.000	2000.00	2000.00	2026-11-02 16:32:57.29
33	24	1	5	2.000	2500.00	5000.00	2026-11-02 16:41:49.249
\.


--
-- Name: AchatDetail_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."AchatDetail_id_seq"', 1, true);


--
-- Name: Achat_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Achat_id_seq"', 1, true);


--
-- Name: Caisse_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Caisse_id_seq"', 1, true);


--
-- Name: Client_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Client_id_seq"', 5, true);


--
-- Name: Depense_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Depense_id_seq"', 5, true);


--
-- Name: Fournisseur_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Fournisseur_id_seq"', 1, true);


--
-- Name: InventaireDetail_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."InventaireDetail_id_seq"', 1, true);


--
-- Name: Inventaire_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Inventaire_id_seq"', 1, true);


--
-- Name: JournalAudit_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."JournalAudit_id_seq"', 75, true);


--
-- Name: Justificatif_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Justificatif_id_seq"', 1, true);


--
-- Name: MouvementCaisse_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."MouvementCaisse_id_seq"', 30, true);


--
-- Name: MouvementStock_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."MouvementStock_id_seq"', 35, true);


--
-- Name: PaiementClient_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."PaiementClient_id_seq"', 4, true);


--
-- Name: PaiementFournisseur_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."PaiementFournisseur_id_seq"', 1, true);


--
-- Name: Produit_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Produit_id_seq"', 1, true);


--
-- Name: Role_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Role_id_seq"', 5, true);


--
-- Name: Tarif_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Tarif_id_seq"', 5, true);


--
-- Name: Utilisateur_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Utilisateur_id_seq"', 2, true);


--
-- Name: VenteDetail_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."VenteDetail_id_seq"', 33, true);


--
-- Name: Vente_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Vente_id_seq"', 24, true);


--
-- Name: AchatDetail AchatDetail_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AchatDetail"
    ADD CONSTRAINT "AchatDetail_pkey" PRIMARY KEY (id);


--
-- Name: Achat Achat_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Achat"
    ADD CONSTRAINT "Achat_pkey" PRIMARY KEY (id);


--
-- Name: Caisse Caisse_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Caisse"
    ADD CONSTRAINT "Caisse_pkey" PRIMARY KEY (id);


--
-- Name: Client Client_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Client"
    ADD CONSTRAINT "Client_pkey" PRIMARY KEY (id);


--
-- Name: Depense Depense_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Depense"
    ADD CONSTRAINT "Depense_pkey" PRIMARY KEY (id);


--
-- Name: Fournisseur Fournisseur_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Fournisseur"
    ADD CONSTRAINT "Fournisseur_pkey" PRIMARY KEY (id);


--
-- Name: InventaireDetail InventaireDetail_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InventaireDetail"
    ADD CONSTRAINT "InventaireDetail_pkey" PRIMARY KEY (id);


--
-- Name: Inventaire Inventaire_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Inventaire"
    ADD CONSTRAINT "Inventaire_pkey" PRIMARY KEY (id);


--
-- Name: JournalAudit JournalAudit_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."JournalAudit"
    ADD CONSTRAINT "JournalAudit_pkey" PRIMARY KEY (id);


--
-- Name: Justificatif Justificatif_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Justificatif"
    ADD CONSTRAINT "Justificatif_pkey" PRIMARY KEY (id);


--
-- Name: MouvementCaisse MouvementCaisse_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MouvementCaisse"
    ADD CONSTRAINT "MouvementCaisse_pkey" PRIMARY KEY (id);


--
-- Name: MouvementStock MouvementStock_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MouvementStock"
    ADD CONSTRAINT "MouvementStock_pkey" PRIMARY KEY (id);


--
-- Name: PaiementClient PaiementClient_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PaiementClient"
    ADD CONSTRAINT "PaiementClient_pkey" PRIMARY KEY (id);


--
-- Name: PaiementFournisseur PaiementFournisseur_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PaiementFournisseur"
    ADD CONSTRAINT "PaiementFournisseur_pkey" PRIMARY KEY (id);


--
-- Name: Produit Produit_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Produit"
    ADD CONSTRAINT "Produit_pkey" PRIMARY KEY (id);


--
-- Name: Role Role_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_pkey" PRIMARY KEY (id);


--
-- Name: Tarif Tarif_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Tarif"
    ADD CONSTRAINT "Tarif_pkey" PRIMARY KEY (id);


--
-- Name: Utilisateur Utilisateur_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Utilisateur"
    ADD CONSTRAINT "Utilisateur_pkey" PRIMARY KEY (id);


--
-- Name: VenteDetail VenteDetail_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VenteDetail"
    ADD CONSTRAINT "VenteDetail_pkey" PRIMARY KEY (id);


--
-- Name: Vente Vente_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Vente"
    ADD CONSTRAINT "Vente_pkey" PRIMARY KEY (id);


--
-- Name: Achat_reference_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Achat_reference_key" ON public."Achat" USING btree (reference);


--
-- Name: Caisse_reference_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Caisse_reference_key" ON public."Caisse" USING btree (reference);


--
-- Name: Depense_numero_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Depense_numero_key" ON public."Depense" USING btree (numero);


--
-- Name: Inventaire_reference_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Inventaire_reference_key" ON public."Inventaire" USING btree (reference);


--
-- Name: Role_nom_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Role_nom_key" ON public."Role" USING btree (nom);


--
-- Name: Utilisateur_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Utilisateur_email_key" ON public."Utilisateur" USING btree (email);


--
-- Name: Vente_reference_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Vente_reference_key" ON public."Vente" USING btree (reference);


--
-- Name: AchatDetail AchatDetail_achatId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AchatDetail"
    ADD CONSTRAINT "AchatDetail_achatId_fkey" FOREIGN KEY ("achatId") REFERENCES public."Achat"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AchatDetail AchatDetail_produitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AchatDetail"
    ADD CONSTRAINT "AchatDetail_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES public."Produit"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Achat Achat_fournisseurId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Achat"
    ADD CONSTRAINT "Achat_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES public."Fournisseur"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Achat Achat_utilisateurId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Achat"
    ADD CONSTRAINT "Achat_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Caisse Caisse_utilisateurId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Caisse"
    ADD CONSTRAINT "Caisse_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Depense Depense_mouvementCaisseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Depense"
    ADD CONSTRAINT "Depense_mouvementCaisseId_fkey" FOREIGN KEY ("mouvementCaisseId") REFERENCES public."MouvementCaisse"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Depense Depense_utilisateurId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Depense"
    ADD CONSTRAINT "Depense_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InventaireDetail InventaireDetail_inventaireId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InventaireDetail"
    ADD CONSTRAINT "InventaireDetail_inventaireId_fkey" FOREIGN KEY ("inventaireId") REFERENCES public."Inventaire"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InventaireDetail InventaireDetail_produitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InventaireDetail"
    ADD CONSTRAINT "InventaireDetail_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES public."Produit"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Inventaire Inventaire_utilisateurId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Inventaire"
    ADD CONSTRAINT "Inventaire_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: JournalAudit JournalAudit_utilisateurId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."JournalAudit"
    ADD CONSTRAINT "JournalAudit_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Justificatif Justificatif_depenseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Justificatif"
    ADD CONSTRAINT "Justificatif_depenseId_fkey" FOREIGN KEY ("depenseId") REFERENCES public."Depense"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MouvementCaisse MouvementCaisse_caisseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MouvementCaisse"
    ADD CONSTRAINT "MouvementCaisse_caisseId_fkey" FOREIGN KEY ("caisseId") REFERENCES public."Caisse"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MouvementCaisse MouvementCaisse_utilisateurId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MouvementCaisse"
    ADD CONSTRAINT "MouvementCaisse_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MouvementStock MouvementStock_achatId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MouvementStock"
    ADD CONSTRAINT "MouvementStock_achatId_fkey" FOREIGN KEY ("achatId") REFERENCES public."Achat"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MouvementStock MouvementStock_inventaireId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MouvementStock"
    ADD CONSTRAINT "MouvementStock_inventaireId_fkey" FOREIGN KEY ("inventaireId") REFERENCES public."Inventaire"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MouvementStock MouvementStock_produitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MouvementStock"
    ADD CONSTRAINT "MouvementStock_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES public."Produit"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MouvementStock MouvementStock_venteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MouvementStock"
    ADD CONSTRAINT "MouvementStock_venteId_fkey" FOREIGN KEY ("venteId") REFERENCES public."Vente"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PaiementClient PaiementClient_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PaiementClient"
    ADD CONSTRAINT "PaiementClient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PaiementClient PaiementClient_mouvementCaisseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PaiementClient"
    ADD CONSTRAINT "PaiementClient_mouvementCaisseId_fkey" FOREIGN KEY ("mouvementCaisseId") REFERENCES public."MouvementCaisse"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PaiementClient PaiementClient_venteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PaiementClient"
    ADD CONSTRAINT "PaiementClient_venteId_fkey" FOREIGN KEY ("venteId") REFERENCES public."Vente"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PaiementFournisseur PaiementFournisseur_achatId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PaiementFournisseur"
    ADD CONSTRAINT "PaiementFournisseur_achatId_fkey" FOREIGN KEY ("achatId") REFERENCES public."Achat"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PaiementFournisseur PaiementFournisseur_fournisseurId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PaiementFournisseur"
    ADD CONSTRAINT "PaiementFournisseur_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES public."Fournisseur"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PaiementFournisseur PaiementFournisseur_mouvementCaisseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PaiementFournisseur"
    ADD CONSTRAINT "PaiementFournisseur_mouvementCaisseId_fkey" FOREIGN KEY ("mouvementCaisseId") REFERENCES public."MouvementCaisse"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Tarif Tarif_produitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Tarif"
    ADD CONSTRAINT "Tarif_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES public."Produit"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Utilisateur Utilisateur_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Utilisateur"
    ADD CONSTRAINT "Utilisateur_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: VenteDetail VenteDetail_produitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VenteDetail"
    ADD CONSTRAINT "VenteDetail_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES public."Produit"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: VenteDetail VenteDetail_tarifId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VenteDetail"
    ADD CONSTRAINT "VenteDetail_tarifId_fkey" FOREIGN KEY ("tarifId") REFERENCES public."Tarif"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: VenteDetail VenteDetail_venteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VenteDetail"
    ADD CONSTRAINT "VenteDetail_venteId_fkey" FOREIGN KEY ("venteId") REFERENCES public."Vente"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Vente Vente_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Vente"
    ADD CONSTRAINT "Vente_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Vente Vente_utilisateurId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Vente"
    ADD CONSTRAINT "Vente_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES public."Utilisateur"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

