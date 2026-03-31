import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { env } from '../config/env';

// Extend Fastify with prisma
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

async function prismaPlugin(fastify: FastifyInstance) {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
  });

  const adapter = new PrismaPg(pool);

  const prisma = new PrismaClient({
    adapter,
  } as any);

  console.log('✅ Connexion PostgreSQL établie');

  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async (instance) => {
    await instance.prisma.$disconnect();
    await pool.end();
  });
}

export default fp(prismaPlugin, {
  name: 'prisma',
});
