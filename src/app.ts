import Fastify, { FastifyError } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env';

// Plugins
import prismaPlugin from './plugins/prisma';
import authPlugin from './plugins/auth';

// Routes
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import categoriesRoutes from './modules/categories/categories.routes';
import productsRoutes from './modules/products/products.routes';
import ordersRoutes from './modules/orders/orders.routes';
import assignmentsRoutes from './modules/assignments/assignments.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import couriersRoutes from './modules/couriers/couriers.routes';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'development' ? 'info' : 'warn',
      transport: env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
  });

  // CORS
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Plugins
  await app.register(prismaPlugin);
  await app.register(authPlugin);

  // Error handler global
  app.setErrorHandler((error: FastifyError, request, reply) => {
    app.log.error(error);

    const statusCode = error.statusCode || 500;
    const message = statusCode === 500
      ? 'Erreur interne du serveur'
      : error.message;

    reply.status(statusCode).send({
      success: false,
      message,
      ...(env.NODE_ENV === 'development' && { stack: error.stack }),
    });
  });

  // Route de santé
  app.get('/api/health', async () => ({
    success: true,
    message: 'MarketCourse API fonctionne correctement 🚀',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  }));

  // Enregistrement des routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(usersRoutes, { prefix: '/api/users' });
  await app.register(categoriesRoutes, { prefix: '/api/categories' });
  await app.register(productsRoutes, { prefix: '/api/products' });
  await app.register(ordersRoutes, { prefix: '/api/orders' });
  await app.register(assignmentsRoutes, { prefix: '/api/assignments' });
  await app.register(notificationsRoutes, { prefix: '/api/notifications' });
  await app.register(dashboardRoutes, { prefix: '/api/dashboard' });
  await app.register(couriersRoutes, { prefix: '/api/couriers' });

  return app;
}
