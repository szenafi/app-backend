require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const CryptoJS = require('crypto-js');

// Initialisation de l'application et Prisma
const app = express();
const prisma = new PrismaClient({
  transactionOptions: {
    maxWait: 5000,
    timeout: 10000,
  },
  log: ['error'],
});

// Configuration CORS pour Railway
app.use(cors({
  origin: '*', // Autorise toutes les origines pour les tests
  // origin: ['https://*.expo.dev', 'exp://192.168.95.14:8081', 'http://localhost:8081'],
  credentials: true,
}));

// Middleware pour le webhook Stripe (doit être avant express.json())
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log('Webhook Stripe reçu:', event.type);
  } catch (err) {
    console.error('Erreur de vérification du webhook Stripe:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const userId = parseInt(paymentIntent.metadata.userId, 10);
      const quantity = parseInt(paymentIntent.metadata.packQuantity, 10);

      if (isNaN(userId) || isNaN(quantity)) {
        console.error('Metadata invalide:', paymentIntent.metadata);
        return res.status(400).json({ message: 'Metadata invalide' });
      }
      
    }
    res.json({ received: true });
  } catch (error) {
    console.error('Erreur traitement webhook:', error.message);
    res.status(500).json({ message: 'Erreur webhook', error: error.message });
  }
});

// Middleware JSON pour les autres routes (après le webhook)
app.use(express.json());

// Middleware de validation Zod
const validate = (schema) => async (req, res, next) => {
  try {
    req.body = await schema.parseAsync(req.body);
    next();
  } catch (error) {
    console.error('Erreur validation Zod:', error);
    res.status(400).json({ message: 'Erreur de validation', errors: error.errors });
  }
};

// Schémas Zod
const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  photoUrl: z.string().optional(),
});
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
const consentSchema = z.object({
  partnerEmail: z.string().email(),
  consentData: z.object({ message: z.string() }),
});
const packPaymentSchema = z.object({
  quantity: z.number().int().positive(),
});

// Middleware d'authentification JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];
  if (!token) {
    console.log('Aucun token fourni dans la requête:', req.path, 'Headers:', req.headers);
    return res.status(401).json({ message: 'Token manquant' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log('Erreur JWT:', err.message, 'Token:', token, 'Path:', req.path);
      return res.status(403).json({ message: 'Token invalide' });
    }
    console.log('Token valide pour', req.path, 'Utilisateur:', user);
    req.user = user;
    next();
  });
};

// Fonctions de chiffrement
const encrypt = (data) => CryptoJS.AES.encrypt(data, process.env.AES_SECRET_KEY).toString();
const decrypt = (ciphertext) => CryptoJS.AES.decrypt(ciphertext, process.env.AES_SECRET_KEY).toString(CryptoJS.enc.Utf8);

// Routes d'authentification
app.post('/api/auth/signup', validate(signupSchema), async (req, res) => {
  try {
    console.log('Tentative signup avec:', req.body);
    const { email, password, firstName, lastName, dateOfBirth, photoUrl } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        photoUrl,
      },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('Signup réussi pour:', email);
    res.status(201).json({ token, user: { ...user, firstName: user.firstName ?? '', lastName: user.lastName ?? '' } });
  } catch (error) {
    console.error('Erreur signup:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// /ConsentApp/app-backend/server.js
// ... (autres imports et configurations)

// Route pour gérer la connexion
app.post('/api/auth/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Tentative de login avec :', { email, password });
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, password: true, firstName: true, lastName: true },
    });
    if (!user) {
      console.log('Utilisateur non trouvé :', email);
      return res.status(400).json({ message: 'Email ou mot de passe incorrect' });
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      console.log('Mot de passe incorrect pour :', email);
      return res.status(400).json({ message: 'Email ou mot de passe incorrect' });
    }
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('Login réussi pour :', email, 'Token généré :', token);
    res.json({ token, user: { id: user.id, email: user.email, firstName: user.firstName ?? '', lastName: user.lastName ?? '' } });
  } catch (error) {
    console.error('Erreur lors de la connexion :', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// ... (reste du fichier)

// Route pour récupérer les informations utilisateur
app.get('/api/user/info', authenticateToken, async (req, res) => {
  try {
    const [user, pack] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, email: true, firstName: true, lastName: true, dateOfBirth: true, photoUrl: true, stripeCustomerId: true, isSubscribed: true, subscriptionEndDate: true, score: true, badges: true, createdAt: true, updatedAt: true },
      }),
      prisma.packConsentement.findUnique({ where: { userId: req.user.id }, select: { quantity: true } }),
    ]);

    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    const response = {
      user: {
        ...user,
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        dateOfBirth: user.dateOfBirth?.toISOString() ?? null,
        photoUrl: user.photoUrl ?? '',
        subscriptionEndDate: user.subscriptionEndDate?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      packQuantity: pack?.quantity ?? 0,
    };
    console.log('Réponse /user/info pour userId', req.user.id, ':', response);
    res.json(response);
  } catch (error) {
    console.error('Erreur user/info:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Route pour créer un consentement
app.post('/api/consent', authenticateToken, validate(consentSchema), async (req, res) => {
  try {
    const { partnerEmail, consentData } = req.body;
    const [partner, user, userPack] = await Promise.all([
      prisma.user.findUnique({ where: { email: partnerEmail }, select: { id: true } }),
      prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, isSubscribed: true, firstName: true } }),
      prisma.packConsentement.findUnique({ where: { userId: req.user.id }, select: { quantity: true } }),
    ]);

    if (!partner) return res.status(400).json({ message: 'Partenaire non trouvé' });
    if (!user.isSubscribed && (!userPack || userPack.quantity < 1)) {
      return res.status(400).json({ message: 'Aucun consentement disponible' });
    }

    const paymentStatus = user.isSubscribed ? 'COMPLETED' : 'PENDING';
    const encryptedData = encrypt(JSON.stringify(consentData));

    const consent = await prisma.$transaction(async (tx) => {
      if (!user.isSubscribed && userPack) {
        await tx.packConsentement.update({
          where: { userId: req.user.id },
          data: { quantity: userPack.quantity - 1 },
        });
      }
      return tx.consent.create({
        data: {
          userId: req.user.id,
          partnerId: partner.id,
          status: 'PENDING',
          encryptedData,
          paymentStatus,
          initiatorConfirmed: true,
          partnerConfirmed: false,
          biometricValidated: false,
          deletedByInitiator: false,
          deletedByPartner: false,
          archived: false,
        },
        select: { id: true },
      });
    });

    await prisma.notification.create({
      data: {
        userId: partner.id,
        type: 'CONSENT_REQUEST',
        message: `Nouvelle demande de consentement de ${user.firstName || 'un utilisateur'}`,
        consentId: consent.id,
        isRead: false,
      },
    });

    res.status(201).json({ message: 'Consentement créé', consentId: consent.id });
  } catch (error) {
    console.error('Erreur consent:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Route d'historique des consentements et +++++
app.get('/api/consent/history', authenticateToken, async (req, res) => {
  try {
    const skip = parseInt(req.query.skip, 10) || 0;
    const take = parseInt(req.query.take, 10) || 10;
    const status = req.query.status?.toUpperCase() || 'ALL';

    const where = {
      OR: [{ userId: req.user.id }, { partnerId: req.user.id }],
      ...(status !== 'ALL' && { status }),
    };

    const consents = await prisma.consent.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, status: true, paymentStatus: true, userId: true, partnerId: true,
        initiatorConfirmed: true, partnerConfirmed: true, biometricValidated: true,
        biometricValidatedAt: true, deletedByInitiator: true, deletedByPartner: true,
        archived: true, createdAt: true, encryptedData: true,
        user: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
        partner: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
      },
    });

    res.json({ consents });
  } catch (error) {
    console.error('Erreur history:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Route pour supprimer un consentement
app.delete('/api/consent/:id', authenticateToken, async (req, res) => {
  try {
    const consentId = parseInt(req.params.id, 10);
    const consent = await prisma.consent.findUnique({ where: { id: consentId }, select: { userId: true } });
    if (!consent || consent.userId !== req.user.id) {
      return res.status(403).json({ message: 'Action non autorisée' });
    }

    await prisma.consent.update({
      where: { id: consentId },
      data: { deletedByInitiator: true },
    });
    res.json({ message: 'Consentement supprimé' });
  } catch (error) {
    console.error('Erreur delete consent:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Routes pour accepter/refuser un consentement
app.put('/api/consent/:id/accept-partner', authenticateToken, async (req, res) => {
  try {
    const consentId = parseInt(req.params.id, 10);
    const consent = await prisma.consent.findUnique({ where: { id: consentId }, select: { partnerId: true } });
    if (!consent || consent.partnerId !== req.user.id) {
      return res.status(403).json({ message: 'Action non autorisée' });
    }

    await prisma.consent.update({
      where: { id: consentId },
      data: { status: 'ACCEPTED', partnerConfirmed: true },
    });
    res.json({ message: 'Consentement accepté' });
  } catch (error) {
    console.error('Erreur accept consent:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

app.put('/api/consent/:id/refuse-partner', authenticateToken, async (req, res) => {
  try {
    const consentId = parseInt(req.params.id, 10);
    const consent = await prisma.consent.findUnique({ where: { id: consentId }, select: { partnerId: true } });
    if (!consent || consent.partnerId !== req.user.id) {
      return res.status(403).json({ message: 'Action non autorisée' });
    }

    await prisma.consent.update({
      where: { id: consentId },
      data: { status: 'REFUSED', partnerConfirmed: false },
    });
    res.json({ message: 'Consentement refusé' });
  } catch (error) {
    console.error('Erreur refuse consent:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});


// Ajouter cette route après les routes existantes pour accepter/refuser
// /ConsentApp/app-backend/server.js
app.put('/api/consent/:id/confirm-biometric', authenticateToken, async (req, res) => {
  try {
    const consentId = parseInt(req.params.id, 10);
    const { userId } = req.body;

    const consent = await prisma.consent.findUnique({
      where: { id: consentId },
      select: { userId: true, partnerId: true, initiatorConfirmed: true, partnerConfirmed: true, biometricValidated: true },
    });

    if (!consent) {
      return res.status(404).json({ message: 'Consentement non trouvé' });
    }

    const isInitiator = consent.userId === userId;
    const isPartner = consent.partnerId === userId;

    if (!isInitiator && !isPartner) {
      return res.status(403).json({ message: 'Action non autorisée' });
    }

    const updateData = {};
    if (isInitiator) {
      updateData.initiatorConfirmed = true;
    } else if (isPartner) {
      updateData.partnerConfirmed = true;
    }

    // Si les deux parties ont confirmé, marquer la validation biométrique comme complète
    const bothConfirmed = (isInitiator && consent.partnerConfirmed) || (isPartner && consent.initiatorConfirmed);
    if (bothConfirmed) {
      updateData.biometricValidated = true;
      updateData.biometricValidatedAt = new Date();
    }

    const updatedConsent = await prisma.consent.update({
      where: { id: consentId },
      data: updateData,
    });

    // Créer une notification pour l’autre partie
    const recipientId = isInitiator ? consent.partnerId : consent.userId;
    const senderRole = isInitiator ? 'l’initiateur' : 'le partenaire';
    await prisma.notification.create({
      data: {
        userId: recipientId,
        type: 'BIOMETRIC_CONFIRMATION',
        message: `${senderRole} a validé le consentement #${consentId} par biométrie.`,
        consentId: consentId,
        isRead: false,
      },
    });

    res.json({ message: 'Validation biométrique enregistrée' });
  } catch (error) {
    console.error('Erreur confirm-biometric:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Routes pour les notifications
app.get('/api/notifications/unread', authenticateToken, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id, isRead: false },
      orderBy: { createdAt: 'desc' },
      select: { id: true, type: true, message: true, consentId: true, isRead: true, createdAt: true },
    });
    res.json(notifications);
  } catch (error) {
    console.error('Erreur notifications:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

app.put('/api/notifications/mark-as-read', authenticateToken, async (req, res) => {
  try {
    const { notificationIds } = req.body;
    await prisma.notification.updateMany({
      where: { id: { in: notificationIds }, userId: req.user.id },
      data: { isRead: true },
    });
    res.json({ message: 'Notifications marquées comme lues' });
  } catch (error) {
    console.error('Erreur mark notifications:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Route pour créer un PaymentIntent (avec mise à jour temporaire)
app.post('/api/packs/payment-sheet', authenticateToken, validate(packPaymentSchema), async (req, res) => {
  try {
    const { quantity } = req.body;
    const amountInCents = quantity === 1 ? 100 : 1000; // 1€ pour 1, 10€ pour 10

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, stripeCustomerId: true },
    });
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({ email: user.email });
      stripeCustomerId = customer.id;
      await prisma.user.update({
        where: { id: req.user.id },
        data: { stripeCustomerId },
      });
      console.log(`Nouveau client Stripe créé pour userId ${req.user.id}:`, stripeCustomerId);
    }

    // Mise à jour temporaire de quantity (à supprimer une fois le webhook corrigé)
    const updatedPack = await prisma.$transaction(async (tx) => {
      const pack = await tx.packConsentement.findUnique({ where: { userId: req.user.id } });
      if (pack) {
        return await tx.packConsentement.update({
          where: { userId: req.user.id },
          data: { quantity: pack.quantity + quantity, purchasedAt: new Date() },
        });
      } else {
        return await tx.packConsentement.create({
          data: { userId: req.user.id, quantity, purchasedAt: new Date() },
        });
      }
    });
    console.log(`Mise à jour temporaire quantity pour userId ${req.user.id} :`, updatedPack);

    const [ephemeralKey, paymentIntent] = await Promise.all([
      stripe.ephemeralKeys.create({ customer: stripeCustomerId }, { apiVersion: '2022-11-15' }),
      stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'eur',
        customer: stripeCustomerId,
        automatic_payment_methods: { enabled: true },
        metadata: { userId: req.user.id.toString(), packQuantity: quantity.toString() },
      }),
    ]);

    const response = {
      paymentIntent: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: stripeCustomerId,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    };
    console.log(`PaymentIntent créé pour userId ${req.user.id}, quantité: ${quantity}:`, response);
    res.json(response);
  } catch (error) {
    console.error('Erreur payment-sheet:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Routes de test
app.get('/test-db', async (req, res) => {
  try {
    const users = await prisma.user.findMany({ take: 1, select: { id: true, email: true } });
    res.json({ success: true, users });
  } catch (error) {
    console.error('Erreur test-db:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

app.get('/test-stripe', async (req, res) => {
  try {
    const customers = await stripe.customers.list({ limit: 1 });
    res.json({ success: true, customers });
  } catch (error) {
    console.error('Erreur test-stripe:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Lancement du serveur
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT} à ${new Date().toISOString()}`);
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (err) => {
  console.error('Erreur non capturée:', err);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});