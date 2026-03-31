import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(8).optional(),
  email: z.string().email().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

export default async function usersRoutes(fastify: FastifyInstance) {
  // GET /api/users — Liste des utilisateurs (admin)
  fastify.route({
    method: 'GET',
    url: '/',
    preHandler: [fastify.requireRole('ADMIN')],
    handler: async (request: FastifyRequest<{
      Querystring: { role?: string; status?: string; page?: string; limit?: string; search?: string }
    }>, reply: FastifyReply) => {
      try {
        const { role, status, page = '1', limit = '20', search } = request.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where: any = {};
        if (role) where.role = role;
        if (status) where.status = status;
        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            { email: { contains: search, mode: 'insensitive' } },
          ];
        }

        const [users, total] = await Promise.all([
          fastify.prisma.user.findMany({
            where,
            skip,
            take,
            select: {
              id: true, name: true, phone: true, email: true,
              role: true, status: true, createdAt: true,
              client: true, courier: true,
            },
            orderBy: { createdAt: 'desc' },
          }),
          fastify.prisma.user.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: users,
          pagination: { page: parseInt(page), limit: take, total, totalPages: Math.ceil(total / take) },
        });
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: error.message });
      }
    },
  });

  // GET /api/users/:id — Détail d'un utilisateur
  fastify.route({
    method: 'GET',
    url: '/:id',
    preHandler: [fastify.authenticate],
    handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const user = await fastify.prisma.user.findUnique({
          where: { id: request.params.id },
          select: {
            id: true, name: true, phone: true, email: true,
            role: true, status: true, avatarUrl: true, createdAt: true,
            client: true, courier: true,
          },
        });

        if (!user) {
          return reply.status(404).send({ success: false, message: 'Utilisateur non trouvé' });
        }

        return reply.send({ success: true, data: user });
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: error.message });
      }
    },
  });

  // PUT /api/users/:id — Modifier un utilisateur
  fastify.route({
    method: 'PUT',
    url: '/:id',
    preHandler: [fastify.authenticate],
    handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const parsed = updateUserSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            success: false, message: 'Données invalides',
            errors: parsed.error.flatten().fieldErrors,
          });
        }

        if (request.user.role !== 'ADMIN' && request.user.id !== request.params.id) {
          return reply.status(403).send({ success: false, message: 'Accès refusé' });
        }

        if (parsed.data.status && request.user.role !== 'ADMIN') {
          return reply.status(403).send({ success: false, message: 'Seul l\'administrateur peut modifier le statut' });
        }

        const user = await fastify.prisma.user.update({
          where: { id: request.params.id },
          data: parsed.data,
          select: { id: true, name: true, phone: true, email: true, role: true, status: true, createdAt: true },
        });

        return reply.send({ success: true, message: 'Utilisateur mis à jour', data: user });
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: error.message });
      }
    },
  });

  // DELETE /api/users/:id — Désactiver un utilisateur (admin)
  fastify.route({
    method: 'DELETE',
    url: '/:id',
    preHandler: [fastify.requireRole('ADMIN')],
    handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        await fastify.prisma.user.update({
          where: { id: request.params.id },
          data: { status: 'SUSPENDED' },
        });
        return reply.send({ success: true, message: 'Utilisateur suspendu avec succès' });
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: error.message });
      }
    },
  });
}
