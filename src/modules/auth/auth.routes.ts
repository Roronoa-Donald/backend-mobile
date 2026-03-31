import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { registerSchema, loginSchema } from './auth.schema';

export default async function authRoutes(fastify: FastifyInstance) {
  const authService = new AuthService(fastify);

  // POST /api/auth/register — Inscription
  fastify.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = registerSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          message: 'Données invalides',
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const result = await authService.register(parsed.data);
      return reply.status(201).send({
        success: true,
        message: 'Inscription réussie',
        data: result,
      });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Erreur interne du serveur',
      });
    }
  });

  // POST /api/auth/login — Connexion
  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          message: 'Données invalides',
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const result = await authService.login(parsed.data);
      return reply.status(200).send({
        success: true,
        message: 'Connexion réussie',
        data: result,
      });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Erreur interne du serveur',
      });
    }
  });

  // GET /api/auth/me — Profil de l'utilisateur connecté
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await authService.getProfile(request.user.id);
      return reply.status(200).send({
        success: true,
        data: user,
      });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Erreur interne du serveur',
      });
    }
  });
}
