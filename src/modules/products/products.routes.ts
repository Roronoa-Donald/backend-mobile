import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

const createProductSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  categoryId: z.string().uuid('ID de catégorie invalide'),
  estimatedPrice: z.number().int().positive('Le prix doit être positif'),
  unit: z.string().min(1, 'L\'unité est requise'),
  imageUrl: z.string().url().optional().nullable(),
  description: z.string().optional().nullable(),
  available: z.boolean().default(true),
});

const updateProductSchema = createProductSchema.partial();

export default async function productsRoutes(fastify: FastifyInstance) {
  // GET /api/products — Liste des produits (public)
  fastify.get<{
    Querystring: {
      categoryId?: string; search?: string; available?: string;
      page?: string; limit?: string; sortBy?: string; sortOrder?: string;
    }
  }>('/', async (request, reply) => {
    try {
      const {
        categoryId, search, available,
        page = '1', limit = '50',
        sortBy = 'name', sortOrder = 'asc',
      } = request.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      const where: any = {};
      if (categoryId) where.categoryId = categoryId;
      if (available !== undefined) where.available = available === 'true';
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [products, total] = await Promise.all([
        fastify.prisma.product.findMany({
          where, skip, take,
          include: { category: { select: { id: true, name: true, icon: true } } },
          orderBy: { [sortBy]: sortOrder },
        }),
        fastify.prisma.product.count({ where }),
      ]);

      return reply.send({
        success: true, data: products,
        pagination: { page: parseInt(page), limit: take, total, totalPages: Math.ceil(total / take) },
      });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  });

  // GET /api/products/:id — Détail (public)
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    try {
      const product = await fastify.prisma.product.findUnique({
        where: { id: request.params.id },
        include: { category: true },
      });

      if (!product) {
        return reply.status(404).send({ success: false, message: 'Produit non trouvé' });
      }

      return reply.send({ success: true, data: product });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  });

  // POST /api/products — Créer (admin)
  fastify.route({
    method: 'POST',
    url: '/',
    preHandler: [fastify.requireRole('ADMIN')],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const parsed = createProductSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            success: false, message: 'Données invalides',
            errors: parsed.error.flatten().fieldErrors,
          });
        }

        const product = await fastify.prisma.product.create({
          data: parsed.data,
          include: { category: { select: { id: true, name: true, icon: true } } },
        });

        return reply.status(201).send({
          success: true, message: 'Produit créé avec succès', data: product,
        });
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: error.message });
      }
    },
  });

  // PUT /api/products/:id — Modifier (admin)
  fastify.route({
    method: 'PUT',
    url: '/:id',
    preHandler: [fastify.requireRole('ADMIN')],
    handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const parsed = updateProductSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            success: false, message: 'Données invalides',
            errors: parsed.error.flatten().fieldErrors,
          });
        }

        const product = await fastify.prisma.product.update({
          where: { id: request.params.id },
          data: parsed.data,
          include: { category: { select: { id: true, name: true, icon: true } } },
        });

        return reply.send({ success: true, message: 'Produit mis à jour', data: product });
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: error.message });
      }
    },
  });

  // DELETE /api/products/:id — Supprimer (admin)
  fastify.route({
    method: 'DELETE',
    url: '/:id',
    preHandler: [fastify.requireRole('ADMIN')],
    handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        await fastify.prisma.product.delete({ where: { id: request.params.id } });
        return reply.send({ success: true, message: 'Produit supprimé' });
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: error.message });
      }
    },
  });
}
