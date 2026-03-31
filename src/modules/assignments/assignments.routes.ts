import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

export default async function assignmentsRoutes(fastify: FastifyInstance) {
  // POST /api/assignments — Affecter un coursier à une commande (admin)
  fastify.route({
    method: 'POST',
    url: '/',
    preHandler: [fastify.requireRole('ADMIN')],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const schema = z.object({
          orderId: z.string().uuid('ID de commande invalide'),
          courierId: z.string().uuid('ID de coursier invalide'),
          note: z.string().optional(),
        });

        const parsed = schema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            success: false, message: 'Données invalides',
            errors: parsed.error.flatten().fieldErrors,
          });
        }

        const { orderId, courierId, note } = parsed.data;

        const order = await fastify.prisma.order.findUnique({
          where: { id: orderId },
          include: { assignment: true },
        });

        if (!order) {
          return reply.status(404).send({ success: false, message: 'Commande non trouvée' });
        }

        if (!['VALIDATED', 'PENDING_ADMIN_VALIDATION'].includes(order.status)) {
          return reply.status(400).send({
            success: false, message: 'La commande doit être validée avant l\'affectation',
          });
        }

        if (order.assignment) {
          return reply.status(409).send({
            success: false, message: 'Cette commande est déjà affectée à un coursier',
          });
        }

        const courier = await fastify.prisma.courier.findUnique({
          where: { id: courierId },
          include: { user: { select: { name: true, status: true } } },
        });

        if (!courier) {
          return reply.status(404).send({ success: false, message: 'Coursier non trouvé' });
        }

        if (!courier.available || courier.user.status !== 'ACTIVE') {
          return reply.status(400).send({ success: false, message: 'Ce coursier n\'est pas disponible' });
        }

        const admin = await fastify.prisma.admin.findUnique({
          where: { userId: request.user.id },
        });

        if (!admin) {
          return reply.status(403).send({ success: false, message: 'Profil administrateur non trouvé' });
        }

        const [assignment] = await fastify.prisma.$transaction([
          fastify.prisma.assignment.create({
            data: { orderId, courierId, adminId: admin.id, note },
            include: {
              order: { select: { orderNumber: true } },
              courier: { include: { user: { select: { name: true, phone: true } } } },
              admin: { include: { user: { select: { name: true } } } },
            },
          }),
          fastify.prisma.order.update({
            where: { id: orderId },
            data: {
              status: 'ASSIGNED_TO_COURIER',
              statusLogs: {
                create: {
                  status: 'ASSIGNED_TO_COURIER',
                  changedById: request.user.id,
                  note: `Commande affectée au coursier ${courier.user.name}`,
                },
              },
            },
          }),
          fastify.prisma.notification.create({
            data: {
              userId: courier.userId,
              title: 'Nouvelle mission',
              message: `Vous avez une nouvelle mission : commande ${order.orderNumber || orderId}`,
            },
          }),
        ]);

        return reply.status(201).send({
          success: true, message: 'Coursier affecté avec succès', data: assignment,
        });
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: error.message });
      }
    },
  });

  // GET /api/assignments — Liste des affectations
  fastify.route({
    method: 'GET',
    url: '/',
    preHandler: [fastify.authenticate],
    handler: async (request: FastifyRequest<{
      Querystring: { status?: string; page?: string; limit?: string }
    }>, reply: FastifyReply) => {
      try {
        const { status, page = '1', limit = '20' } = request.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where: any = {};

        if (request.user.role === 'COURIER') {
          const courier = await fastify.prisma.courier.findUnique({ where: { userId: request.user.id } });
          if (courier) where.courierId = courier.id;
        }

        if (status) where.status = status;

        const [assignments, total] = await Promise.all([
          fastify.prisma.assignment.findMany({
            where, skip, take,
            include: {
              order: {
                include: {
                  items: { include: { product: { select: { id: true, name: true, unit: true } } } },
                  client: { include: { user: { select: { name: true, phone: true } } } },
                },
              },
              courier: { include: { user: { select: { name: true, phone: true } } } },
              admin: { include: { user: { select: { name: true } } } },
            },
            orderBy: { assignedAt: 'desc' },
          }),
          fastify.prisma.assignment.count({ where }),
        ]);

        return reply.send({
          success: true, data: assignments,
          pagination: { page: parseInt(page), limit: take, total, totalPages: Math.ceil(total / take) },
        });
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: error.message });
      }
    },
  });

  // PATCH /api/assignments/:id/accept — Accepter une mission (coursier)
  fastify.route({
    method: 'PATCH',
    url: '/:id/accept',
    preHandler: [fastify.requireRole('COURIER')],
    handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const assignment = await fastify.prisma.assignment.findUnique({
          where: { id: request.params.id },
          include: { order: true },
        });

        if (!assignment) {
          return reply.status(404).send({ success: false, message: 'Affectation non trouvée' });
        }

        await fastify.prisma.$transaction([
          fastify.prisma.assignment.update({
            where: { id: request.params.id },
            data: { status: 'ACCEPTED', acceptedAt: new Date() },
          }),
          fastify.prisma.order.update({
            where: { id: assignment.orderId },
            data: {
              status: 'ACCEPTED_BY_COURIER',
              statusLogs: {
                create: {
                  status: 'ACCEPTED_BY_COURIER',
                  changedById: request.user.id,
                  note: 'Mission acceptée par le coursier',
                },
              },
            },
          }),
        ]);

        return reply.send({ success: true, message: 'Mission acceptée avec succès' });
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: error.message });
      }
    },
  });

  // PATCH /api/assignments/:id/refuse — Refuser une mission (coursier)
  fastify.route({
    method: 'PATCH',
    url: '/:id/refuse',
    preHandler: [fastify.requireRole('COURIER')],
    handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const body = z.object({ reason: z.string().optional() }).safeParse(request.body);

        const assignment = await fastify.prisma.assignment.findUnique({
          where: { id: request.params.id },
        });

        if (!assignment) {
          return reply.status(404).send({ success: false, message: 'Affectation non trouvée' });
        }

        const reason = body.success ? body.data.reason || 'Aucune raison' : 'Aucune raison';

        await fastify.prisma.$transaction([
          fastify.prisma.assignment.update({
            where: { id: request.params.id },
            data: { status: 'REFUSED', note: reason },
          }),
          fastify.prisma.order.update({
            where: { id: assignment.orderId },
            data: {
              status: 'VALIDATED',
              statusLogs: {
                create: {
                  status: 'VALIDATED',
                  changedById: request.user.id,
                  note: `Mission refusée par le coursier : ${reason}`,
                },
              },
            },
          }),
        ]);

        // Notify admins separately (outside transaction)
        const admins = await fastify.prisma.admin.findMany({ include: { user: { select: { id: true } } } });
        for (const admin of admins) {
          await fastify.prisma.notification.create({
            data: {
              userId: admin.user.id,
              title: 'Mission refusée',
              message: `Le coursier a refusé la mission. Réaffectation nécessaire.`,
            },
          });
        }

        return reply.send({
          success: true,
          message: 'Mission refusée. L\'administrateur sera notifié pour réaffectation.',
        });
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: error.message });
      }
    },
  });

  // GET /api/assignments/couriers/available — Coursiers disponibles (admin)
  fastify.route({
    method: 'GET',
    url: '/couriers/available',
    preHandler: [fastify.requireRole('ADMIN')],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const couriers = await fastify.prisma.courier.findMany({
          where: { available: true, user: { status: 'ACTIVE' } },
          include: {
            user: { select: { id: true, name: true, phone: true } },
            _count: {
              select: { assignments: { where: { status: { in: ['PENDING', 'ACCEPTED'] } } } },
            },
          },
          orderBy: { avgRating: 'desc' },
        });

        return reply.send({ success: true, data: couriers });
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: error.message });
      }
    },
  });
}
