import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export default async function dashboardRoutes(fastify: FastifyInstance) {
  // GET /api/dashboard/stats — Statistiques globales (admin)
  fastify.route({
    method: 'GET',
    url: '/stats',
    preHandler: [fastify.requireRole('ADMIN')],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
          totalOrders, todayOrders, pendingOrders, inProgressOrders,
          deliveredOrders, cancelledOrders, totalClients, totalCouriers,
          activeCouriers, totalRevenue, todayRevenue,
        ] = await Promise.all([
          fastify.prisma.order.count(),
          fastify.prisma.order.count({ where: { createdAt: { gte: today } } }),
          fastify.prisma.order.count({
            where: { status: { in: ['SUBMITTED', 'PENDING_ADMIN_VALIDATION'] } },
          }),
          fastify.prisma.order.count({
            where: {
              status: { in: ['VALIDATED', 'ASSIGNED_TO_COURIER', 'ACCEPTED_BY_COURIER', 'PURCHASING', 'PURCHASE_COMPLETE', 'IN_DELIVERY'] },
            },
          }),
          fastify.prisma.order.count({ where: { status: 'DELIVERED' } }),
          fastify.prisma.order.count({ where: { status: 'CANCELLED' } }),
          fastify.prisma.client.count(),
          fastify.prisma.courier.count(),
          fastify.prisma.courier.count({ where: { available: true, user: { status: 'ACTIVE' } } }),
          fastify.prisma.order.aggregate({ where: { status: 'DELIVERED' }, _sum: { finalTotal: true } }),
          fastify.prisma.order.aggregate({
            where: { status: 'DELIVERED', updatedAt: { gte: today } },
            _sum: { finalTotal: true },
          }),
        ]);

        return reply.send({
          success: true,
          data: {
            orders: {
              total: totalOrders, today: todayOrders, pending: pendingOrders,
              inProgress: inProgressOrders, delivered: deliveredOrders, cancelled: cancelledOrders,
            },
            users: { totalClients, totalCouriers, activeCouriers },
            revenue: {
              total: totalRevenue._sum.finalTotal || 0,
              today: todayRevenue._sum.finalTotal || 0,
              currency: 'FCFA',
            },
          },
        });
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: error.message });
      }
    },
  });

  // GET /api/dashboard/recent-orders — Dernières commandes
  fastify.route({
    method: 'GET',
    url: '/recent-orders',
    preHandler: [fastify.requireRole('ADMIN')],
    handler: async (request: FastifyRequest<{ Querystring: { limit?: string } }>, reply: FastifyReply) => {
      try {
        const limit = parseInt((request.query as any).limit || '10');

        const orders = await fastify.prisma.order.findMany({
          take: limit,
          include: {
            client: { include: { user: { select: { name: true, phone: true } } } },
            items: { include: { product: { select: { name: true } } } },
            assignment: { include: { courier: { include: { user: { select: { name: true } } } } } },
          },
          orderBy: { createdAt: 'desc' },
        });

        return reply.send({ success: true, data: orders });
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: error.message });
      }
    },
  });

  // GET /api/dashboard/order-stats — Statistiques par statut
  fastify.route({
    method: 'GET',
    url: '/order-stats',
    preHandler: [fastify.requireRole('ADMIN')],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const stats = await fastify.prisma.order.groupBy({
          by: ['status'],
          _count: { status: true },
        });

        return reply.send({
          success: true,
          data: stats.map((s: any) => ({ status: s.status, count: s._count.status })),
        });
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: error.message });
      }
    },
  });
}
