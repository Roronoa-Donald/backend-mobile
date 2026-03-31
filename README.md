# 🛒 MarketCourse API

API backend pour la plateforme MarketCourse — commande de condiments et produits de cuisine au Togo.

## Stack technique

- **Framework** : Fastify (Node.js / TypeScript)
- **ORM** : Prisma
- **Base de données** : PostgreSQL
- **Auth** : JWT + bcrypt
- **Validation** : Zod

## Installation

```bash
# Installer les dépendances
npm install

# Configurer la base de données
# Modifier le fichier .env avec votre DATABASE_URL PostgreSQL
cp .env.example .env

# Générer le client Prisma
npm run db:generate

# Créer les tables (migration)
npm run db:migrate

# Peupler la base de données avec les produits togolais
npm run db:seed

# Démarrer le serveur de développement
npm run dev
```

## Routes API

### Authentification
- `POST /api/auth/register` — Inscription
- `POST /api/auth/login` — Connexion
- `GET /api/auth/me` — Profil utilisateur

### Catégories
- `GET /api/categories` — Liste des catégories
- `GET /api/categories/:id` — Détail avec produits
- `POST /api/categories` — Créer (admin)
- `PUT /api/categories/:id` — Modifier (admin)
- `DELETE /api/categories/:id` — Supprimer (admin)

### Produits
- `GET /api/products` — Liste (filtres: categoryId, search, available)
- `GET /api/products/:id` — Détail
- `POST /api/products` — Créer (admin)
- `PUT /api/products/:id` — Modifier (admin)
- `DELETE /api/products/:id` — Supprimer (admin)

### Commandes
- `POST /api/orders` — Créer une commande (client)
- `GET /api/orders` — Liste (filtrée selon le rôle)
- `GET /api/orders/:id` — Détail
- `PATCH /api/orders/:id/status` — Changer le statut
- `PATCH /api/orders/:orderId/items/:itemId` — Modifier un article

### Affectations
- `POST /api/assignments` — Affecter un coursier (admin)
- `GET /api/assignments` — Liste des affectations
- `PATCH /api/assignments/:id/accept` — Accepter mission (coursier)
- `PATCH /api/assignments/:id/refuse` — Refuser mission (coursier)
- `GET /api/assignments/couriers/available` — Coursiers disponibles (admin)

### Coursiers
- `GET /api/couriers` — Liste (admin)
- `GET /api/couriers/:id` — Détail
- `PUT /api/couriers/:id` — Modifier
- `GET /api/couriers/:id/stats` — Statistiques

### Notifications
- `GET /api/notifications` — Liste
- `PATCH /api/notifications/:id/read` — Marquer comme lu
- `PATCH /api/notifications/read-all` — Tout marquer comme lu

### Dashboard (admin)
- `GET /api/dashboard/stats` — Statistiques globales
- `GET /api/dashboard/recent-orders` — Dernières commandes
- `GET /api/dashboard/order-stats` — Stats par statut

### Santé
- `GET /api/health` — Vérification du serveur

## Comptes de démonstration

| Rôle | Téléphone | Mot de passe |
|------|-----------|-------------|
| Admin | +22890000001 | password123 |
| Client | +22890000002 | password123 |
| Coursier | +22890000003 | password123 |

## Commandes disponibles

```bash
npm run dev          # Serveur de développement
npm run build        # Build TypeScript
npm run start        # Production
npm run db:generate  # Générer client Prisma
npm run db:migrate   # Migrations
npm run db:push      # Push schéma sans migration
npm run db:seed      # Peupler la BDD
npm run db:studio    # Interface Prisma Studio
```
