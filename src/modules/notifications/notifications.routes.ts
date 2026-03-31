import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export default async function notificationsRoutes(fastify: FastifyInstance) {
  // GET /api/notifications — Liste des notifications
  fastify.route({
    method: 'GET',
    url: '/',
    preHandler: [fastify.authenticate],
    handler: async (request: FastifyRequest<{
      Querystring: { read?: string; page?: string; limit?: string }
    }>, reply: FastifyReply) => {
      try {
        const { read, page = '1', limit = '20' } = request.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where: any = { userId: request.user.id };
        if (read !== undefined) where.read = read === 'true';

        const [notifications, total, unreadCount] = await Promise.all([
          fastify.prisma.notification.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
          fastify.prisma.notification.count({ where }),
          fastify.prisma.notification.count({ where: { userId: request.user.id, read: false } }),
        ]);

        return reply.send({
          success: true, data: notifications, unreadCount,
          pagination: { page: parseInt(page), limit: take, total, totalPages: Math.ceil(total / take) },
        });
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: error.message });
      }
    },
  });

  // PATCH /api/notifications/:id/read — Marquer comme lu
  fastify.route({
    method: 'PATCH',
    url: '/:id/read',
    preHandler: [fastify.authenticate],
    handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        await fastify.prisma.notification.update({
          where: { id: request.params.id },
          data: { read: true },
        });
        return reply.send({ success: true, message: 'Notification marquée comme lue' });
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: error.message });
      }
    },
  });

  // PATCH /api/notifications/read-all — Marquer toutes comme lues
  fastify.route({
    method: 'PATCH',
    url: '/read-all',
    preHandler: [fastify.authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await fastify.prisma.notification.updateMany({
          where: { userId: request.user.id, read: false },
          data: { read: true },
        });
        return reply.send({ success: true, message: 'Toutes les notifications marquées comme lues' });
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: error.message });
      }
    },
  });
}
