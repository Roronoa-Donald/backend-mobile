import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { env } from '../config/env';

// Extend Fastify
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (...roles: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: string; role: string };
    user: { id: string; role: string };
  }
}

async function authPlugin(fastify: FastifyInstance) {
  await fastify.register(import('@fastify/jwt'), {
    secret: env.JWT_SECRET,
    sign: { expiresIn: '7d' },
  });

  // Décorateur d'authentification
  fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({
        success: false,
        message: 'Non authentifié. Veuillez vous connecter.',
      });
    }
  });

  // Décorateur de contrôle de rôle
  fastify.decorate('requireRole', function (...roles: string[]) {
    return async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        await request.jwtVerify();
        const user = request.user;
        if (!roles.includes(user.role)) {
          reply.status(403).send({
            success: false,
            message: 'Accès refusé. Vous n\'avez pas les permissions nécessaires.',
          });
        }
      } catch (err) {
        reply.status(401).send({
          success: false,
          message: 'Non authentifié. Veuillez vous connecter.',
        });
      }
    };
  });
}

export default fp(authPlugin, {
  name: 'auth',
});
