import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

const createCategorySchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  icon: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

const updateCategorySchema = createCategorySchema.partial();

export default async function categoriesRoutes(fastify: FastifyInstance) {
  // GET /api/categories — Liste des catégories (public)
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const categories = await fastify.prisma.category.findMany({
        orderBy: { sortOrder: 'asc' },
        include: { _count: { select: { products: true } } },
      });
      return reply.send({ success: true, data: categories });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  });

  // GET /api/categories/:id — Détail avec produits (public)
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    try {
      const category = await fastify.prisma.category.findUnique({
        where: { id: request.params.id },
        include: {
          products: { where: { available: true }, orderBy: { name: 'asc' } },
        },
      });

      if (!category) {
        return reply.status(404).send({ success: false, message: 'Catégorie non trouvée' });
      }

      return reply.send({ success: true, data: category });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  });

  // POST /api/categories — Créer (admin)
  fastify.route({
    method: 'POST',
    url: '/',
    preHandler: [fastify.requireRole('ADMIN')],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const parsed = createCategorySchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            success: false, message: 'Données invalides',
            errors: parsed.error.flatten().fieldErrors,
          });
        }

        const category = await fastify.prisma.category.create({ data: parsed.data });

        return reply.status(201).send({
          success: true, message: 'Catégorie créée avec succès', data: category,
        });
      } catch (error: any) {
        if (error.code === 'P2002') {
          return reply.status(409).send({ success: false, message: 'Cette catégorie existe déjà' });
        }
        return reply.status(500).send({ success: false, message: error.message });
      }
    },
  });

  // PUT /api/categories/:id — Modifier (admin)
  fastify.route({
    method: 'PUT',
    url: '/:id',
    preHandler: [fastify.requireRole('ADMIN')],
    handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const parsed = updateCategorySchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            success: false, message: 'Données invalides',
            errors: parsed.error.flatten().fieldErrors,
          });
        }

        const category = await fastify.prisma.category.update({
          where: { id: request.params.id },
          data: parsed.data,
        });

        return reply.send({ success: true, message: 'Catégorie mise à jour', data: category });
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: error.message });
      }
    },
  });

  // DELETE /api/categories/:id — Supprimer (admin)
  fastify.route({
    method: 'DELETE',
    url: '/:id',
    preHandler: [fastify.requireRole('ADMIN')],
    handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        await fastify.prisma.category.delete({ where: { id: request.params.id } });
        return reply.send({ success: true, message: 'Catégorie supprimée' });
      } catch (error: any) {
        return reply.status(500).send({ success: false, message: error.message });
      }
    },
  });
}
