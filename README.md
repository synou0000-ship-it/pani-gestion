# 🛒 PANI GESTION v1.0

**Plateforme Complète de Gestion Commerciale, de Stock et de Caisse**  
*Spécialement conçue pour la vente de Pani en Franc CFA (FCFA)*

---

## ✨ Points Forts du Système

- **Mode Hybride (En Ligne & Hors-Ligne)** : Fonctionne en local sans connexion Internet, et se synchronise automatiquement dès le retour du réseau.
- **Multi-Plateforme** : Navigateur Web, Application Windows (.exe desktop) et Application Mobile Android (APK).
- **Accès Distant & Local** : Utilisable sur le PC serveur ou depuis n'importe quel smartphone/tablette sur le réseau Wi-Fi local.
- **Tarification Flexible** : Gestion des tarifs rapides (500F, 1000F, 1500F, 2000F, 2500F) et prix libres personnalisés.
- **Gestion Sécurisée** : 5 rôles utilisateurs avec contrôle strict des permissions et traçabilité par journal d'audit.

---

## 📋 Modules Fonctionnels

| Module | Description |
|--------|-------------|
| 📊 **Tableau de bord** | KPIs en direct : chiffre d'affaires, panier moyen, bénéfice estimé, alertes stock faible, dettes clients & fournisseurs. |
| 🛍️ **Vente & Caisse POS** | Interface tactile de caisse rapide, boutons 500F/1000F/1500F/2000F, ventes au comptant ou à crédit, impression de tickets. |
| 📦 **Gestion des Stocks** | Suivi en temps réel des unités, entrées, sorties, pertes, casses et ajustements d'inventaire. |
| 🏦 **Sessions de Caisse** | Ouverture avec fond de caisse, encaissements automatiques, décaissements, clôture et calcul d'écart. |
| 💸 **Dépenses** | Enregistrement catégorisé des charges d'exploitation avec téléversement de justificatifs / reçus. |
| 👥 **Clients & Dettes** | Carnet d'adresses, suivi des crédits en cours, enregistrement des règlements et relevés de compte. |
| 🏭 **Fournisseurs & Achats** | Commandes fournisseurs, réceptions de marchandises avec réapprovisionnement automatique du stock. |
| 📋 **Inventaire Physique** | Sessions de comptage périodique, détection automatique des manques / surplus et régularisation. |
| 📈 **Rapports & Statistiques** | Rapports journaliers, mensuels, marges brutes, analyse des manques et export vers Excel. |
| 👤 **Gestion des Utilisateurs** | Contrôle des accès avec 5 rôles préconfigurés (Admin, Gestionnaire, Vendeur, Caissier, Comptable). |

---

## 🚀 Démarrage en 1 Clic (Local)

### Option 1 : Script Batch
Double-cliquez simplement sur :
```bat
demarrer.bat
```

### Option 2 : Script PowerShell (Recommandé)
Faites un clic-droit puis « Exécuter avec PowerShell » sur :
```powershell
demarrer.ps1
```

Le script démarre automatiquement PostgreSQL, le serveur backend et le frontend, puis ouvre votre navigateur sur **http://localhost:5173**.

---

## 🔑 Identifiants de Connexion

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| **Administrateur** | `admin@pani.com` | `Admin123!` |

*(Des comptes supplémentaires peuvent être créés directement depuis l'écran Utilisateurs)*

---

## 🌐 Accès Distant & Téléphone (Réseau Local Wi-Fi)

Pour utiliser l'application depuis votre smartphone, tablette ou autre ordinateur sur le même réseau Wi-Fi :

1. Sur le PC hôte, vérifiez votre adresse IP locale :
   ```powershell
   ipconfig
   # Exemple: 192.168.1.102
   ```
2. Sur votre téléphone ou autre appareil connecté au même Wi-Fi, ouvrez le navigateur et tapez :
   ```
   http://192.168.1.102:5173
   ```
3. L'application s'affiche immédiatement dans une interface adaptée aux écrans tactiles et smartphones !

---

## 📱 Application Mobile Android (APK)

Un projet Android avec **Capacitor** est préconfiguré :

1. Exécutez le script :
   ```bat
   build-android.bat
   ```
2. Le script génère la version web et synchronise les ressources avec le dossier `android`.
3. Pour ouvrir dans Android Studio et exporter l'APK :
   ```bash
   cd frontend
   npx cap open android
   ```
4. Dans Android Studio : **Build > Build Bundle(s) / APK(s) > Build APK(s)**.

---

## 🖥️ Application Windows (.EXE Installateur)

Pour générer l'installateur Windows autonome avec Electron :

1. Exécutez le script :
   ```bat
   build-windows.bat
   ```
2. L'installateur `.exe` sera généré dans le dossier :
   ```
   c:\projet-goita\pani-gestion\electron\dist-electron\
   ```

---

## 🗄️ Architecture & Base de Données

- **Backend** : Node.js, Express, TypeScript, Prisma ORM
- **Base de données** : PostgreSQL 16
  - URL locale : `postgresql://postgres:root@localhost:5432/pani_gestion`
- **Frontend** : React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite
- **Desktop** : Electron
- **Mobile** : Capacitor

---

## 📞 Support & Maintenance

PANI GESTION v1.0 — Développé selon le cahier des charges officiel.
