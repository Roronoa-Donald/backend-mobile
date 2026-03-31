import { buildApp } from './app';
import { env } from './config/env';

async function start() {
  try {
    const app = await buildApp();

    await app.listen({
      port: parseInt(env.PORT),
      host: env.HOST,
    });

    console.log(`
╔══════════════════════════════════════════════════╗
║                                                  ║
║   🛒 MarketCourse API                           ║
║   ─────────────────────────────────────          ║
║                                                  ║
║   🚀 Serveur démarré avec succès !               ║
║   📍 URL: http://${env.HOST}:${env.PORT}             ║
║   🔧 Environnement: ${env.NODE_ENV.padEnd(20)}    ║
║   📊 Santé: http://localhost:${env.PORT}/api/health ║
║                                                  ║
║   📋 Routes disponibles:                         ║
║   ├── POST   /api/auth/register                  ║
║   ├── POST   /api/auth/login                     ║
║   ├── GET    /api/auth/me                        ║
║   ├── GET    /api/categories                     ║
║   ├── GET    /api/products                       ║
║   ├── POST   /api/orders                         ║
║   ├── GET    /api/orders                         ║
║   ├── PATCH  /api/orders/:id/status              ║
║   ├── POST   /api/assignments                    ║
║   ├── GET    /api/couriers                       ║
║   ├── GET    /api/notifications                  ║
║   └── GET    /api/dashboard/stats                ║
║                                                  ║
╚══════════════════════════════════════════════════╝
    `);
  } catch (err) {
    console.error('❌ Erreur au démarrage du serveur:', err);
    process.exit(1);
  }
}

start();
