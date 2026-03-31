import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

const updateCourierSchema = z.object({
  zone: z.string().optional(),
  available: z.boolean().optional(),
  transport: z.enum(['MOTO', 'VELO', 'VOITURE', 'A_PIED']).optional(),
});

export default async function couriersRoutes(fastify: FastifyInstance) {
  // GET /api/couriers — Liste des coursiers (admin)
  fastify.route({
    method: 'GET',
    url: '/',
    preHandler: [fastify.requireRole('ADMIN')],
    handler: async (request: FastifyRequest<{
      Querystring: { available?: string; zone?: string; page?: string; limit?: string }
    }>, reply: FastifyReply) => {
      try {
        const { available, zone, page = '1', limit = '20' } = request.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where: any = {};
        if (available !== undefined) where.available = available === 'true';
        if (zone) where.zone = { contains: zone, mode: 'insensitive' };

        const [couriers, total] = await Promise.all([
          fastify.prisma.courier.findMany({
            where, skip, take,
            include: {
              user: { select: { id: true, name: true, phone: true, email: true, status: true, createdAt: true } },
              _count: { select: { assignments: true } },
            },
            orderBy: { avgRating: 'desc' },
          }),
          fastify.prisma.courier.count({ where }),
        ]);

        return reply.send({
          success: true, data: couriers,
          pagination: { page: parseInt(page), limit: take, total, totalPages: Math.ceil(total / take) },
        });
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: error.message });
      }
    },
  });

  // GET /api/couriers/:id — Détail d'un coursier
  fastify.route({
    method: 'GET',
    url: '/:id',
    preHandler: [fastify.authenticate],
    handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const courier = await fastify.prisma.courier.findUnique({
          where: { id: request.params.id },
          include: {
            user: { select: { id: true, name: true, phone: true, email: true, status: true, createdAt: true } },
            assignments: {
              take: 10,
              include: {
                order: { select: { id: true, orderNumber: true, status: true, estimatedTotal: true, createdAt: true } },
              },
              orderBy: { assignedAt: 'desc' },
            },
          },
        });

        if (!courier) {
          return reply.status(404).send({ success: false, message: 'Coursier non trouvé' });
        }

        return reply.send({ success: true, data: courier });
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: error.message });
      }
    },
  });

  // PUT /api/couriers/:id — Modifier un coursier
  fastify.route({
    method: 'PUT',
    url: '/:id',
    preHandler: [fastify.authenticate],
    handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const parsed = updateCourierSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            success: false, message: 'Données invalides',
            errors: parsed.error.flatten().fieldErrors,
          });
        }

        if (request.user.role === 'COURIER') {
          const courier = await fastify.prisma.courier.findUnique({ where: { userId: request.user.id } });
          if (!courier || courier.id !== request.params.id) {
            return reply.status(403).send({ success: false, message: 'Accès refusé' });
          }
        } else if (request.user.role !== 'ADMIN') {
          return reply.status(403).send({ success: false, message: 'Accès refusé' });
        }

        const courier = await fastify.prisma.courier.update({
          where: { id: request.params.id },
          data: parsed.data,
          include: { user: { select: { name: true, phone: true } } },
        });

        return reply.send({ success: true, message: 'Coursier mis à jour', data: courier });
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: error.message });
      }
    },
  });

  // GET /api/couriers/:id/stats — Statistiques d'un coursier
  fastify.route({
    method: 'GET',
    url: '/:id/stats',
    preHandler: [fastify.authenticate],
    handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const courierId = request.params.id;

        const [totalMissions, completedMissions, pendingMissions, refusedMissions, totalEarnings] = await Promise.all([
          fastify.prisma.assignment.count({ where: { courierId } }),
          fastify.prisma.assignment.count({ where: { courierId, status: 'COMPLETED' } }),
          fastify.prisma.assignment.count({ where: { courierId, status: { in: ['PENDING', 'ACCEPTED'] } } }),
          fastify.prisma.assignment.count({ where: { courierId, status: 'REFUSED' } }),
          fastify.prisma.order.aggregate({
            where: { assignment: { courierId }, status: 'DELIVERED' },
            _sum: { finalTotal: true },
          }),
        ]);

        return reply.send({
          success: true,
          data: {
            totalMissions, completedMissions, pendingMissions, refusedMissions,
            totalEarnings: totalEarnings._sum.finalTotal || 0,
            currency: 'FCFA',
          },
        });
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: error.message });
      }
    },
  });
}
