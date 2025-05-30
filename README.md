# ConsentApp Backend

Ce dossier contient l’API Node.js/Express pour ConsentApp, avec une base de données PostgreSQL gérée par Prisma. L’API gère l’authentification des utilisateurs, la création et la gestion des consentements, les paiements via Stripe, ainsi que les notifications.

## Structure

Le backend est actuellement contenu dans un fichier principal, avec des dépendances et configurations associées :

- **`server.js`** : Point d’entrée du serveur Express. Contient :
  - La configuration d’Express (middleware, CORS, Stripe).
  - Les routes pour l’authentification, les consentements, les paiements Stripe, les notifications, et les tests.
  - Un middleware d’authentification JWT (`authenticateToken`).
  - Des fonctions de chiffrement/déchiffrement avec `CryptoJS`.
  - La gestion des webhooks Stripe pour les paiements.
- **`.env`** : Variables d’environnement (port, clés Stripe, secret JWT, URL de la base de données, clé AES pour le chiffrement).
- **`package.json`** : Liste des dépendances et scripts pour lancer le serveur.
- **`prisma/`** : Dossier généré par Prisma, contenant le schéma de la base de données (`schema.prisma`) et les migrations.
- **`node_modules/`** : Dossier des dépendances Node.js (non versionné, généré par `npm install`).

> **Note** : À l’avenir, il pourrait être utile de refactoriser `server.js` en séparant les routes, middleware, et utilitaires dans des dossiers dédiés (`routes/`, `middleware/`, `utils/`) pour améliorer la scalabilité et la lisibilité. Exemple de structure future :
>
> - `routes/` : Dossier pour les routes (ex. `auth.js`, `consent.js`).
> - `middleware/` : Dossier pour les middleware (ex. `authenticateToken.js`).
> - `utils/` : Dossier pour les utilitaires (ex. `prisma.js`, `encryption.js`).

## Fonctionnalités

- **Authentification des utilisateurs** :
  - Inscription (`/api/auth/signup`) avec validation Zod et hachage du mot de passe (bcrypt).
  - Connexion (`/api/auth/login`) avec génération de token JWT.
- **Gestion des consentements** :
  - Création d’un consentement (`/api/consent`) avec déduction d’un crédit si l’utilisateur n’est pas abonné.
  - Historique des consentements (`/api/consent/history`) avec filtres (statut, pagination).
  - Actions sur les consentements : accepter (`/api/consent/:id/accept-partner`), refuser (`/api/consent/:id/refuse-partner`), supprimer (`/api/consent/:id`).
  - Chiffrement des données de consentement avec `CryptoJS`.
- **Paiements Stripe** :
  - Création d’un `PaymentIntent` (`/api/packs/payment-sheet`) pour acheter des crédits (1€ pour 1 crédit, 10€ pour 10 crédits).
  - Webhook Stripe (`/api/stripe/webhook`) pour gérer les événements de paiement (actuellement partiel, à compléter).
- **Notifications** :
  - Récupération des notifications non lues (`/api/notifications/unread`).
  - Marquage des notifications comme lues (`/api/notifications/mark-as-read`).
  - Création automatique d’une notification lorsqu’un consentement est créé.
- **Informations utilisateur** :
  - Récupération des informations de l’utilisateur connecté (`/api/user/info`), incluant le nombre de crédits.
- **Tests** :
  - Route de test pour la base de données (`/test-db`).
  - Route de test pour Stripe (`/test-stripe`).

## Installation

1. **Naviguez dans le dossier** :
   ```bash
   cd app-backend

2. **Installez les dépendances** :
    npm install

3. **Configurez les variables d’environnement dans .env : Créez un fichier .env à la racine du dossier app-backend et ajoutez les variables suivantes :** 
PORT=3000
JWT_SECRET=<votre-secret-jwt>
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/consentapp
STRIPE_SECRET_KEY=<votre-clé-stripe>
STRIPE_WEBHOOK_SECRET=<votre-secret-webhook>
STRIPE_PUBLISHABLE_KEY=<votre-clé-publique-stripe>
AES_SECRET_KEY=<votre-clé-aes-pour-chiffrement>

PORT : Port sur lequel le serveur écoute (par défaut 3000).
JWT_SECRET : Clé secrète pour signer les tokens JWT (ex. générée avec crypto.randomBytes(32).toString('hex')).
DATABASE_URL : URL de connexion à votre base de données PostgreSQL.
STRIPE_SECRET_KEY : Clé secrète Stripe (obtenue depuis votre tableau de bord Stripe).
STRIPE_WEBHOOK_SECRET : Secret pour vérifier les webhooks Stripe.
STRIPE_PUBLISHABLE_KEY : Clé publique Stripe (utilisée côté frontend, mais stockée ici pour référence).
AES_SECRET_KEY : Clé pour le chiffrement AES avec CryptoJS (ex. une chaîne de 32 caractères).

4. **Initialisez la base de données avec Prisma : Assurez-vous que votre base de données PostgreSQL est en cours d’exécution, puis exécutez :**

npx prisma migrate dev

Cela appliquera les migrations définies dans prisma/schema.prisma et créera les tables nécessaires.

5. **Lancez le serveur :**

npm start

Le serveur démarrera sur le port défini dans PORT (par défaut 3000). Vous devriez voir un message dans la console :
text


Serveur démarré sur le port 3000 à <date>


Dépendances principales
express : Framework pour créer l’API.
prisma : CLI pour gérer les migrations de la base de données.
@prisma/client : Client Prisma pour interagir avec la base de données PostgreSQL.
jsonwebtoken : Génération et vérification des tokens JWT.
bcryptjs : Hachage des mots de passe.
stripe : Intégration des paiements Stripe.
cors : Gestion des requêtes cross-origin.
dotenv : Chargement des variables d’environnement.
zod : Validation des données des requêtes.
crypto-js : Chiffrement/déchiffrement des données de consentement.
À compléter : Ajoutez ici toute nouvelle dépendance que vous installez à l’avenir (ex. jest pour les tests, winston pour les logs).

Routes principales
Authentification
POST /api/auth/signup : Inscription d’un utilisateur.
Corps : { email, password, firstName, lastName, dateOfBirth, photoUrl }.
Retour : { token, user }.
POST /api/auth/login : Connexion d’un utilisateur.
Corps : { email, password }.
Retour : { token, user }.
Utilisateur
GET /api/user/info : Récupère les informations de l’utilisateur connecté (nécessite un token JWT).
Retour : { user, packQuantity }.
Consentements
POST /api/consent : Crée un nouveau consentement.
Corps : { partnerEmail, consentData }.
Retour : { message, consentId }.
GET /api/consent/history : Récupère l’historique des consentements (avec pagination et filtres).
Query : ?skip=<number>&take=<number>&status=<ALL|PENDING|ACCEPTED|REFUSED>.
Retour : { consents }.
DELETE /api/consent/:id : Supprime un consentement (par l’initiateur).
Retour : { message }.
PUT /api/consent/:id/accept-partner : Accepte un consentement (par le partenaire).
Retour : { message }.
PUT /api/consent/:id/refuse-partner : Refuse un consentement (par le partenaire).
Retour : { message }.
Notifications
GET /api/notifications/unread : Récupère les notifications non lues.
Retour : [notification].
PUT /api/notifications/mark-as-read : Marque des notifications comme lues.
Corps : { notificationIds }.
Retour : { message }.
Paiements
POST /api/packs/payment-sheet : Crée un PaymentIntent pour acheter des crédits.
Corps : { quantity }.
Retour : { paymentIntent, ephemeralKey, customer, publishableKey }.
POST /api/stripe/webhook : Webhook Stripe pour gérer les événements de paiement.
Corps : Événement Stripe brut.
Retour : { received: true }.
Tests
GET /test-db : Teste la connexion à la base de données.
Retour : { success, users }.
GET /test-stripe : Teste la connexion à Stripe.
Retour : { success, customers }.
À compléter : Ajoutez ici toute nouvelle route que vous créez à l’avenir (ex. POST /api/user/update-profile pour mettre à jour le profil utilisateur).

Schéma de la base de données
Le schéma de la base de données est défini dans prisma/schema.prisma. Voici les principales tables utilisées :

User : Stocke les informations des utilisateurs (email, mot de passe haché, nom, etc.).
Consent : Stocke les consentements (initiateur, partenaire, statut, données chiffrées).
PackConsentement : Stocke le nombre de crédits par utilisateur.
Notification : Stocke les notifications (type, message, état lu/non lu).
À compléter : Ajoutez ici toute nouvelle table ou modification du schéma (ex. ajout d’une table Subscription pour gérer les abonnements).

Tests
À compléter : Ajoutez ici les instructions pour exécuter les tests une fois que vous les aurez implémentés (ex. npm test avec Jest).

Déploiement
À compléter : Ajoutez ici les instructions pour déployer le backend (ex. sur Railway, Heroku, ou un VPS). Exemple :

Configurez les variables d’environnement sur la plateforme de déploiement.
Déployez avec :
bash

Réduire

Envelopper

Copier
git push <nom-de-la-plateforme> main
Remarques
Webhook Stripe : La route /api/stripe/webhook est partiellement implémentée. Actuellement, elle vérifie les événements mais ne met pas à jour les crédits (packConsentement.quantity). Une mise à jour temporaire est effectuée dans /api/packs/payment-sheet, mais cela devrait être déplacé dans le webhook pour une gestion correcte des paiements.
Chiffrement : Les données des consentements sont chiffrées avec CryptoJS (AES). Assurez-vous que AES_SECRET_KEY est sécurisé et sauvegardé, car il est nécessaire pour déchiffrer les données.
Scalabilité : Pour les futures évolutions, envisagez de séparer les routes, middleware, et utilitaires dans des dossiers dédiés (ex. routes/, middleware/, utils/) pour faciliter la maintenance.
Logs : Les logs sont actuellement affichés dans la console. À l’avenir, envisagez d’utiliser un outil comme winston pour une gestion plus robuste des logs.
À compléter : Ajoutez ici toute remarque ou note importante (ex. problèmes connus, limitations, ou bonnes pratiques).

Développement
Ce backend a été construit avec l’aide de Grok (xAI) pour répondre aux besoins de ConsentApp. Toute contribution est la bienvenue ! Si vous rencontrez des problèmes, ouvrez une issue sur le dépôt GitHub.

À compléter : Ajoutez ici des informations sur les contributeurs ou les outils utilisés pour le développement (ex. "Développé avec VS C

Schéma de la base de données
Le schéma de la base de données est défini dans prisma/schema.prisma. Voici les principales tables utilisées :

User : Stocke les informations des utilisateurs (email, mot de passe haché, nom, etc.).
Consent : Stocke les consentements (initiateur, partenaire, statut, données chiffrées).
PackConsentement : Stocke le nombre de crédits par utilisateur.
Notification : Stocke les notifications (type, message, état lu/non lu).
À compléter : Ajoutez ici toute nouvelle table ou modification du schéma (ex. ajout d’une table Subscription pour gérer les abonnements).

Tests
À compléter : Ajoutez ici les instructions pour exécuter les tests une fois que vous les aurez implémentés (ex. npm test avec Jest).

Déploiement
À compléter : Ajoutez ici les instructions pour déployer le backend (ex. sur Railway, Heroku, ou un VPS). Exemple :

Configurez les variables d’environnement sur la plateforme de déploiement.
Déployez avec :
bash

Réduire

Envelopper

Copier
git push <nom-de-la-plateforme> main
Remarques

# ConsentApp

ConsentApp est une application mobile permettant de gérer le consentement à la pratique sexuelle de manière sécurisée et transparente, avec validation par empreinte biométrique. L’application utilise React Native pour le frontend et Node.js avec Prisma pour le backend, déployé sur Railway.

## Fonctionnalités

- **Inscription et Connexion** :
  - Les utilisateurs peuvent s’inscrire avec leur email, mot de passe, prénom et nom.
  - Connexion sécurisée avec email et mot de passe.
  - Persistance de la session grâce à un token JWT stocké dans `SecureStore`.

- **Gestion des Consentements** :
  - Création de consentements avec un partenaire (via email).
  - Historique des consentements (filtrable par statut : PENDING, ACCEPTED, REFUSED).
  - Acceptation, refus, ou suppression d’un consentement.
  - Validation biométrique des consentements (par empreinte).

- **Notifications** :
  - Affichage des notifications non lues (ex. : nouvelle demande de consentement, validation biométrique).
  - Possibilité de marquer toutes les notifications comme lues.

- **Système de Crédits** :
  - Achat de crédits pour créer des consentements (1€ pour 1 consentement, 10€ pour 10 consentements).
  - Intégration avec Stripe pour les paiements sécurisés.

- **Sécurité** :
  - Authentification par JWT.
  - Chiffrement des données sensibles (consentements) avec CryptoJS.
  - Validation des entrées avec Zod.

## Structure du Projet

- **Frontend** : `/ConsentApp/app-frontend`
  - React Native avec Expo.
  - Navigation avec `@react-navigation`.
  - Gestion de l’état avec Context API (`AuthContext`).
  - Appels API avec Axios.

- **Backend** : `/ConsentApp/app-backend`
  - Node.js avec Express.
  - Base de données PostgreSQL via Prisma.
  - Déploiement sur Railway.

## Prérequis

- Node.js (v18 ou supérieur)
- Expo CLI (`npm install -g expo-cli`)
- Compte Stripe pour les paiements
- Base de données PostgreSQL (configurée via Railway ou localement)

## Installation

### Backend
1. Navigue dans le répertoire backend :
   ```bash
   cd ConsentApp/app-backend
Installe les dépendances :
bash

Réduire

Envelopper

Copier
npm install
Configure les variables d’environnement dans un fichier .env :
text

Réduire

Envelopper

Copier
DATABASE_URL="postgresql://user:password@localhost:5432/consentapp"
JWT_SECRET="ton-secret-jwt"
AES_SECRET_KEY="ton-secret-aes"
STRIPE_SECRET_KEY="ton-secret-stripe"
STRIPE_WEBHOOK_SECRET="ton-secret-webhook"
PORT=8080
Lance les migrations Prisma :
bash

Réduire

Envelopper

Copier
npx prisma migrate dev
Démarre le serveur :
bash

Réduire

Envelopper

Copier
npm start

PORT=8080
Lance les migrations Prisma :
bash

Réduire

Envelopper

Copier
npx prisma migrate dev
Démarre le serveur :
bash

Réduire

Envelopper

Copier
npm start
Frontend
Navigue dans le répertoire frontend :
bash

Réduire

Envelopper

Copier
cd ConsentApp/app-frontend
Installe les dépendances :
bash

Réduire

Envelopper

Copier
npm install
Configure les variables d’environnement dans constants.js :
javascript

Réduire

Envelopper

Copier
export const API_URL = 'https://ton-backend-url.up.railway.app/api';
export const STRIPE_PUBLISHABLE_KEY = 'ton-stripe-publishable-key';
Démarre l’application :
bash

Réduire

Envelopper

Copier
npx expo start
Déploiement
Backend : Déployé sur Railway. Configure les variables d’environnement dans le tableau de bord Railway.
Frontend : Utilise Expo pour générer une build (APK ou IPA) ou teste via l’application Expo Go.
Technologies Utilisées
Frontend : React Native, Expo, Axios, React Navigation, Stripe React Native
Backend : Node.js, Express, Prisma, PostgreSQL, Stripe, Zod, CryptoJS
Déploiement : Railway
Contribuer
Fork le projet.
Crée une branche pour ta fonctionnalité (git checkout -b feature/nouvelle-fonctionnalite).
Commit tes changements (git commit -m "Ajoute nouvelle fonctionnalité").
Push ta branche (git push origin feature/nouvelle-fonctionnalite).
Ouvre une Pull Request.
Licence
Ce projet est sous licence MIT.

text

Réduire

Envelopper

Copier

**Changements effectués** :
- Ajouté des détails sur l’inscription et la persistance de la session.
- Mis à jour la section "Fonctionnalités" pour refléter les dernières modifications.
- Ajouté des instructions claires pour l’installation et le déploiement.

#### Mettre à jour `CHANGELOG.md`

Voici une version mise à jour de ton `CHANGELOG.md` pour documenter les changements récents :

```markdown
# Changelog

## [0.2.0] - 2025-04-03

### Ajouts
- Ajout de la fonctionnalité d’inscription (`SignupScreen.js`) avec navigation depuis l’écran de connexion.
- Ajout de la persistance de la session dans `AuthContext.js` : récupération des informations utilisateur via `/api/user/info` si un token est présent au démarrage.
- Ajout de la route `/api/notifications/mark-read` dans le backend pour correspondre aux appels frontend.

### Modifications
- Mise à jour de `DashboardScreen.js` pour utiliser l’endpoint `/api/packs/payment-sheet` au lieu de `/api/payment/create-payment-intent`.
- Amélioration de `AuthContext.js` :
  - Ajout de `setUser` dans le contexte pour permettre une mise à jour manuelle de l’état `user`.
  - Gestion des tokens invalides : suppression du token de `SecureStore` si `/api/user/info` échoue avec une erreur 401 ou 403.
- Mise à jour de `SignupScreen.js` pour utiliser la fonction `login` de `AuthContext` au lieu de `setUser` directement.

### Corrections
- Résolution de l’erreur `setUser is not a function` dans `SignupScreen.js`.
- Résolution de l’erreur de navigation dans `App.js` en supprimant les espaces entre les balises `<Stack.Screen />`.

## [0.1.0] - 2025-03-15

### Ajouts
- Initialisation du projet avec React Native (frontend) et Node.js/Prisma (backend).
- Mise en place de l’authentification (inscription, connexion) avec JWT.
- Gestion des consentements (création, historique, acceptation, refus, validation biométrique).
- Intégration de Stripe pour les paiements (achat de crédits).
- Système de notifications pour les demandes de consentement et validations biométriques.

### Corrections
- Corrections initiales des erreurs de navigation et des appels API.