import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

const orderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive('La quantité doit être positive'),
});

const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'La commande doit contenir au moins un article'),
  deliveryAddress: z.string().min(5, 'L\'adresse de livraison est requise'),
  deliveryQuartier: z.string().optional(),
  deliveryCity: z.string().default('Lomé'),
  landmark: z.string().optional(),
  phoneContact: z.string().min(8, 'Le numéro de téléphone est requis'),
  paymentMode: z.enum(['CASH', 'MOBILE_MONEY', 'CARD', 'WALLET']).default('CASH'),
  desiredTime: z.string().optional(),
});

const updateOrderStatusSchema = z.object({
  status: z.enum([
    'SUBMITTED', 'PENDING_ADMIN_VALIDATION', 'VALIDATED', 'REJECTED',
    'ASSIGNED_TO_COURIER', 'ACCEPTED_BY_COURIER', 'PURCHASING',
    'ITEM_UNAVAILABLE', 'PURCHASE_COMPLETE', 'IN_DELIVERY',
    'DELIVERED', 'CANCELLED',
  ]),
  note: z.string().optional(),
  rejectionReason: z.string().optional(),
  adminNote: z.string().optional(),
});

const updateOrderItemSchema = z.object({
  finalPrice: z.number().int().positive().optional(),
  available: z.boolean().optional(),
  replacementNote: z.string().optional(),
});

function generateOrderNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `MCT-${dateStr}-${rand}`;
}

export default async function ordersRoutes(fastify: FastifyInstance) {
  // POST /api/orders — Créer une commande (client)
  fastify.route({
    method: 'POST',
    url: '/',
    preHandler: [fastify.requireRole('CLIENT')],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const parsed = createOrderSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            success: false, message: 'Données invalides',
            errors: parsed.error.flatten().fieldErrors,
          });
        }

        const { items, ...orderData } = parsed.data;

        const client = await fastify.prisma.client.findUnique({
          where: { userId: request.user.id },
        });

        if (!client) {
          return reply.status(404).send({ success: false, message: 'Profil client non trouvé' });
        }

        const productIds = items.map((i: { productId: string }) => i.productId);
        const products = await fastify.prisma.product.findMany({
          where: { id: { in: productIds } },
        });

        if (products.length !== productIds.length) {
          return reply.status(400).send({ success: false, message: 'Un ou plusieurs produits sont introuvables' });
        }

        let estimatedTotal = 0;
        const orderItems = items.map((item: { productId: string; quantity: number }) => {
          const product = products.find((p: any) => p.id === item.productId)!;
          const lineTotal = product.estimatedPrice * item.quantity;
          estimatedTotal += lineTotal;
          return {
            productId: item.productId,
            quantity: item.quantity,
            estimatedPrice: product.estimatedPrice,
          };
        });

        const order = await fastify.prisma.order.create({
          data: {
            clientId: client.id,
            orderNumber: generateOrderNumber(),
            estimatedTotal,
            status: 'SUBMITTED',
            deliveryAddress: orderData.deliveryAddress,
            deliveryQuartier: orderData.deliveryQuartier,
            deliveryCity: orderData.deliveryCity,
            landmark: orderData.landmark,
            phoneContact: orderData.phoneContact,
            paymentMode: orderData.paymentMode,
            desiredTime: orderData.desiredTime,
            items: { create: orderItems },
            statusLogs: {
              create: {
                status: 'SUBMITTED',
                changedById: request.user.id,
                note: 'Commande soumise par le client',
              },
            },
          },
          include: {
            items: { include: { product: { select: { id: true, name: true, unit: true, imageUrl: true } } } },
            client: { include: { user: { select: { name: true, phone: true } } } },
          },
        });

        const admins = await fastify.prisma.admin.findMany({
          include: { user: { select: { id: true } } },
        });

        if (admins.length > 0) {
          await fastify.prisma.notification.createMany({
            data: admins.map((admin: any) => ({
              userId: admin.user.id,
              title: 'Nouvelle commande',
              message: `Nouvelle commande ${order.orderNumber} reçue de ${order.client.user.name}`,
            })),
          });
        }

        return reply.status(201).send({
          success: true, message: 'Commande créée avec succès', data: order,
        });
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: error.message });
      }
    },
  });

  // GET /api/orders — Liste des commandes
  fastify.route({
    method: 'GET',
    url: '/',
    preHandler: [fastify.authenticate],
    handler: async (request: FastifyRequest<{
      Querystring: { status?: string; page?: string; limit?: string; sortBy?: string; sortOrder?: string }
    }>, reply: FastifyReply) => {
      try {
        const { status, page = '1', limit = '20', sortBy = 'createdAt', sortOrder = 'desc' } = request.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where: any = {};

        if (request.user.role === 'CLIENT') {
          const client = await fastify.prisma.client.findUnique({ where: { userId: request.user.id } });
          if (client) where.clientId = client.id;
        } else if (request.user.role === 'COURIER') {
          const courier = await fastify.prisma.courier.findUnique({ where: { userId: request.user.id } });
          if (courier) where.assignment = { courierId: courier.id };
        }

        if (status) where.status = status;

        const [orders, total] = await Promise.all([
          fastify.prisma.order.findMany({
            where, skip, take,
            include: {
              items: { include: { product: { select: { id: true, name: true, unit: true } } } },
              client: { include: { user: { select: { name: true, phone: true } } } },
              assignment: { include: { courier: { include: { user: { select: { name: true, phone: true } } } } } },
            },
            orderBy: { [sortBy]: sortOrder },
          }),
          fastify.prisma.order.count({ where }),
        ]);

        return reply.send({
          success: true, data: orders,
          pagination: { page: parseInt(page), limit: take, total, totalPages: Math.ceil(total / take) },
        });
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: error.message });
      }
    },
  });

  // GET /api/orders/:id — Détail d'une commande
  fastify.route({
    method: 'GET',
    url: '/:id',
    preHandler: [fastify.authenticate],
    handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const order = await fastify.prisma.order.findUnique({
          where: { id: request.params.id },
          include: {
            items: { include: { product: true } },
            client: { include: { user: { select: { id: true, name: true, phone: true, email: true } } } },
            assignment: {
              include: {
                courier: { include: { user: { select: { id: true, name: true, phone: true } } } },
                admin: { include: { user: { select: { id: true, name: true } } } },
              },
            },
            statusLogs: {
              include: { changedBy: { select: { name: true, role: true } } },
              orderBy: { createdAt: 'asc' },
            },
            payments: true,
          },
        });

        if (!order) {
          return reply.status(404).send({ success: false, message: 'Commande non trouvée' });
        }

        return reply.send({ success: true, data: order });
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: error.message });
      }
    },
  });

  // PATCH /api/orders/:id/status — Changer le statut
  fastify.route({
    method: 'PATCH',
    url: '/:id/status',
    preHandler: [fastify.authenticate],
    handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const parsed = updateOrderStatusSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            success: false, message: 'Données invalides',
            errors: parsed.error.flatten().fieldErrors,
          });
        }

        const { status, note, rejectionReason, adminNote } = parsed.data;

        const rolePermissions: Record<string, string[]> = {
          PENDING_ADMIN_VALIDATION: ['ADMIN'],
          VALIDATED: ['ADMIN'],
          REJECTED: ['ADMIN'],
          ASSIGNED_TO_COURIER: ['ADMIN'],
          ACCEPTED_BY_COURIER: ['COURIER'],
          PURCHASING: ['COURIER'],
          ITEM_UNAVAILABLE: ['COURIER'],
          PURCHASE_COMPLETE: ['COURIER'],
          IN_DELIVERY: ['COURIER'],
          DELIVERED: ['COURIER', 'ADMIN'],
          CANCELLED: ['ADMIN', 'CLIENT'],
        };

        const allowedRoles = rolePermissions[status] || [];
        if (!allowedRoles.includes(request.user.role)) {
          return reply.status(403).send({
            success: false,
            message: `Vous n'avez pas la permission de passer la commande au statut "${status}"`,
          });
        }

        const updateData: any = { status };
        if (rejectionReason) updateData.rejectionReason = rejectionReason;
        if (adminNote) updateData.adminNote = adminNote;

        if (status === 'DELIVERED') {
          const existingOrder = await fastify.prisma.order.findUnique({
            where: { id: request.params.id },
            include: { items: true },
          });
          if (existingOrder) {
            const finalTotal = existingOrder.items.reduce((sum: number, item: any) => {
              return sum + (item.finalPrice || item.estimatedPrice) * item.quantity;
            }, 0);
            updateData.finalTotal = finalTotal + existingOrder.deliveryFee + existingOrder.serviceFee;
          }
        }

        const order = await fastify.prisma.order.update({
          where: { id: request.params.id },
          data: {
            ...updateData,
            statusLogs: {
              create: {
                status,
                changedById: request.user.id,
                note: note || `Statut changé en ${status}`,
              },
            },
          },
          include: {
            items: { include: { product: { select: { id: true, name: true } } } },
            client: { include: { user: { select: { name: true, phone: true } } } },
            assignment: true,
          },
        });

        const clientUser = await fastify.prisma.client.findUnique({
          where: { id: order.clientId },
          include: { user: { select: { id: true } } },
        });

        const statusMessages: Record<string, string> = {
          VALIDATED: 'Votre commande a été validée par l\'administrateur',
          REJECTED: `Votre commande a été rejetée : ${rejectionReason || 'Raison non spécifiée'}`,
          ASSIGNED_TO_COURIER: 'Un coursier a été affecté à votre commande',
          ACCEPTED_BY_COURIER: 'Le coursier a accepté votre commande',
          PURCHASING: 'Le coursier est en train d\'acheter vos produits au marché',
          IN_DELIVERY: 'Votre commande est en route !',
          DELIVERED: 'Votre commande a été livrée. Merci !',
          CANCELLED: 'Votre commande a été annulée',
        };

        if (clientUser && statusMessages[status]) {
          await fastify.prisma.notification.create({
            data: {
              userId: clientUser.user.id,
              title: `Commande ${order.orderNumber}`,
              message: statusMessages[status],
            },
          });
        }

        return reply.send({
          success: true,
          message: `Statut de la commande mis à jour : ${status}`,
          data: order,
        });
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: error.message });
      }
    },
  });

  // PATCH /api/orders/:orderId/items/:itemId — Modifier un article (coursier)
  fastify.route({
    method: 'PATCH',
    url: '/:orderId/items/:itemId',
    preHandler: [fastify.requireRole('COURIER', 'ADMIN')],
    handler: async (request: FastifyRequest<{
      Params: { orderId: string; itemId: string }
    }>, reply: FastifyReply) => {
      try {
        const parsed = updateOrderItemSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            success: false, message: 'Données invalides',
            errors: parsed.error.flatten().fieldErrors,
          });
        }

        const item = await fastify.prisma.orderItem.update({
          where: { id: request.params.itemId },
          data: parsed.data,
          include: { product: { select: { id: true, name: true } } },
        });

        return reply.send({ success: true, message: 'Article mis à jour', data: item });
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: error.message });
      }
    },
  });
}
