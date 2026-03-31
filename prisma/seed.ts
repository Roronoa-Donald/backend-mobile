import { PrismaClient, UserRole, CourierTransport } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log('🌱 Début du seeding de la base de données MarketCourse...');

  // ============================================================
  // CATÉGORIES
  // ============================================================
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: 'Légumes frais' },
      update: {},
      create: { name: 'Légumes frais', icon: '🥬', sortOrder: 1 },
    }),
    prisma.category.upsert({
      where: { name: 'Feuilles & légumes-feuilles' },
      update: {},
      create: { name: 'Feuilles & légumes-feuilles', icon: '🌿', sortOrder: 2 },
    }),
    prisma.category.upsert({
      where: { name: 'Céréales & féculents' },
      update: {},
      create: { name: 'Céréales & féculents', icon: '🌾', sortOrder: 3 },
    }),
    prisma.category.upsert({
      where: { name: 'Tubercules' },
      update: {},
      create: { name: 'Tubercules', icon: '🥔', sortOrder: 4 },
    }),
    prisma.category.upsert({
      where: { name: 'Épices & condiments' },
      update: {},
      create: { name: 'Épices & condiments', icon: '🌶️', sortOrder: 5 },
    }),
    prisma.category.upsert({
      where: { name: 'Huiles & matières grasses' },
      update: {},
      create: { name: 'Huiles & matières grasses', icon: '🫒', sortOrder: 6 },
    }),
    prisma.category.upsert({
      where: { name: 'Protéines séchées & fumées' },
      update: {},
      create: { name: 'Protéines séchées & fumées', icon: '🐟', sortOrder: 7 },
    }),
    prisma.category.upsert({
      where: { name: 'Produits transformés' },
      update: {},
      create: { name: 'Produits transformés', icon: '🏭', sortOrder: 8 },
    }),
  ]);

  const [legumes, feuilles, cereales, tubercules, epices, huiles, proteines, transformes] = categories;

  console.log(`✅ ${categories.length} catégories créées`);

  // ============================================================
  // PRODUITS TOGOLAIS
  // ============================================================
  const produitsData = [
    // --- Légumes frais ---
    { name: 'Tomate fraîche', categoryId: legumes.id, estimatedPrice: 500, unit: 'tas', description: 'Tomates fraîches du marché' },
    { name: 'Tomate cerise locale', categoryId: legumes.id, estimatedPrice: 300, unit: 'tas', description: 'Petites tomates locales' },
    { name: 'Oignon rouge', categoryId: legumes.id, estimatedPrice: 400, unit: 'tas', description: 'Oignons rouges frais' },
    { name: 'Oignon blanc', categoryId: legumes.id, estimatedPrice: 500, unit: 'tas', description: 'Oignons blancs' },
    { name: 'Piment frais (vert)', categoryId: legumes.id, estimatedPrice: 200, unit: 'tas', description: 'Piment vert frais du Togo' },
    { name: 'Piment frais (rouge)', categoryId: legumes.id, estimatedPrice: 250, unit: 'tas', description: 'Piment rouge frais piquant' },
    { name: 'Ail frais', categoryId: legumes.id, estimatedPrice: 300, unit: 'tas', description: 'Tête d\'ail frais' },
    { name: 'Gingembre frais', categoryId: legumes.id, estimatedPrice: 200, unit: 'tas', description: 'Gingembre frais du marché' },
    { name: 'Gombo frais', categoryId: legumes.id, estimatedPrice: 300, unit: 'tas', description: 'Gombo frais pour sauce' },
    { name: 'Aubergine locale (gboma)', categoryId: legumes.id, estimatedPrice: 200, unit: 'tas', description: 'Aubergine africaine locale' },
    { name: 'Aubergine violette', categoryId: legumes.id, estimatedPrice: 250, unit: 'pièce', description: 'Aubergine violette' },
    { name: 'Carotte', categoryId: legumes.id, estimatedPrice: 300, unit: 'tas', description: 'Carottes fraîches' },
    { name: 'Poivron vert', categoryId: legumes.id, estimatedPrice: 200, unit: 'pièce', description: 'Poivron vert' },
    { name: 'Poivron rouge', categoryId: legumes.id, estimatedPrice: 250, unit: 'pièce', description: 'Poivron rouge' },
    { name: 'Concombre', categoryId: legumes.id, estimatedPrice: 200, unit: 'pièce', description: 'Concombre frais' },
    { name: 'Chou vert', categoryId: legumes.id, estimatedPrice: 500, unit: 'pièce', description: 'Chou pommé vert' },
    { name: 'Haricot vert', categoryId: legumes.id, estimatedPrice: 500, unit: 'tas', description: 'Haricots verts frais' },
    { name: 'Persil', categoryId: legumes.id, estimatedPrice: 100, unit: 'botte', description: 'Botte de persil frais' },
    { name: 'Ciboule (oignon vert)', categoryId: legumes.id, estimatedPrice: 100, unit: 'botte', description: 'Ciboule/oignons verts' },
    { name: 'Basilic local', categoryId: legumes.id, estimatedPrice: 100, unit: 'botte', description: 'Basilic frais local' },

    // --- Feuilles & légumes-feuilles ---
    { name: 'Adémè (corchorus)', categoryId: feuilles.id, estimatedPrice: 300, unit: 'tas', description: 'Feuilles d\'adémè pour sauce gluante traditionnelle' },
    { name: 'Gboma (morelle noire)', categoryId: feuilles.id, estimatedPrice: 300, unit: 'tas', description: 'Feuilles de gboma pour sauce gboma dessi' },
    { name: 'Épinards locaux', categoryId: feuilles.id, estimatedPrice: 200, unit: 'tas', description: 'Épinards verts frais' },
    { name: 'Feuilles de baobab', categoryId: feuilles.id, estimatedPrice: 500, unit: 'tas', description: 'Feuilles séchées de baobab' },
    { name: 'Feuilles de manioc', categoryId: feuilles.id, estimatedPrice: 200, unit: 'tas', description: 'Feuilles tendres de manioc' },
    { name: 'Djokoumé (feuilles)', categoryId: feuilles.id, estimatedPrice: 200, unit: 'tas', description: 'Feuilles pour sauce djokoumé' },
    { name: 'Feuilles d\'oseille', categoryId: feuilles.id, estimatedPrice: 200, unit: 'tas', description: 'Oseille locale pour sauce' },

    // --- Céréales & féculents ---
    { name: 'Maïs blanc (grain)', categoryId: cereales.id, estimatedPrice: 800, unit: 'kg', description: 'Maïs blanc en grains' },
    { name: 'Maïs jaune (grain)', categoryId: cereales.id, estimatedPrice: 800, unit: 'kg', description: 'Maïs jaune en grains' },
    { name: 'Farine de maïs', categoryId: cereales.id, estimatedPrice: 600, unit: 'kg', description: 'Farine de maïs pour pâte (akoumé)' },
    { name: 'Riz local', categoryId: cereales.id, estimatedPrice: 1000, unit: 'kg', description: 'Riz cultivé localement au Togo' },
    { name: 'Riz importé parfumé', categoryId: cereales.id, estimatedPrice: 1200, unit: 'kg', description: 'Riz parfumé thaï' },
    { name: 'Gari blanc', categoryId: cereales.id, estimatedPrice: 400, unit: 'kg', description: 'Semoule de manioc fermentée blanche' },
    { name: 'Gari rouge (sotchi)', categoryId: cereales.id, estimatedPrice: 500, unit: 'kg', description: 'Gari rouge à l\'huile de palme' },
    { name: 'Fonio', categoryId: cereales.id, estimatedPrice: 1500, unit: 'kg', description: 'Céréale traditionnelle fine' },
    { name: 'Semoule de maïs (akassa)', categoryId: cereales.id, estimatedPrice: 500, unit: 'kg', description: 'Semoule de maïs fermentée' },
    { name: 'Haricot rouge', categoryId: cereales.id, estimatedPrice: 1200, unit: 'kg', description: 'Haricots rouges secs' },
    { name: 'Haricot blanc', categoryId: cereales.id, estimatedPrice: 1000, unit: 'kg', description: 'Haricots blancs secs' },
    { name: 'Soja en grains', categoryId: cereales.id, estimatedPrice: 800, unit: 'kg', description: 'Graines de soja' },
    { name: 'Arachide décortiquée', categoryId: cereales.id, estimatedPrice: 1000, unit: 'kg', description: 'Arachides grillées ou crues' },

    // --- Tubercules ---
    { name: 'Igname blanche', categoryId: tubercules.id, estimatedPrice: 1500, unit: 'kg', description: 'Igname blanche pour fufu ou frites' },
    { name: 'Igname rouge (laboko)', categoryId: tubercules.id, estimatedPrice: 1200, unit: 'kg', description: 'Igname rouge locale' },
    { name: 'Manioc frais', categoryId: tubercules.id, estimatedPrice: 500, unit: 'kg', description: 'Tubercule de manioc frais' },
    { name: 'Patate douce', categoryId: tubercules.id, estimatedPrice: 600, unit: 'kg', description: 'Patate douce locale' },
    { name: 'Taro (madjon)', categoryId: tubercules.id, estimatedPrice: 800, unit: 'kg', description: 'Taro pour ragoût et sauce' },
    { name: 'Plantain mûr', categoryId: tubercules.id, estimatedPrice: 300, unit: 'pièce', description: 'Banane plantain mûre' },
    { name: 'Plantain vert', categoryId: tubercules.id, estimatedPrice: 250, unit: 'pièce', description: 'Banane plantain à frire ou piler' },

    // --- Épices & condiments ---
    { name: 'Piment sec pilé', categoryId: epices.id, estimatedPrice: 500, unit: 'sachet', description: 'Piment rouge séché et pilé' },
    { name: 'Poudre de piment (tchintchinga)', categoryId: epices.id, estimatedPrice: 300, unit: 'sachet', description: 'Poudre d\'épices pour grillades' },
    { name: 'Poivre noir', categoryId: epices.id, estimatedPrice: 500, unit: 'sachet', description: 'Poivre noir moulu' },
    { name: 'Poivre blanc', categoryId: epices.id, estimatedPrice: 600, unit: 'sachet', description: 'Poivre blanc moulu' },
    { name: 'Afitin (moutarde africaine)', categoryId: epices.id, estimatedPrice: 400, unit: 'boule', description: 'Condiment fermenté de graines de néré' },
    { name: 'Soumbala', categoryId: epices.id, estimatedPrice: 500, unit: 'boule', description: 'Condiment traditionnel de néré en boule' },
    { name: 'Dawadawa', categoryId: epices.id, estimatedPrice: 400, unit: 'boule', description: 'Assaisonnement local fermenté' },
    { name: 'Sel fin', categoryId: epices.id, estimatedPrice: 200, unit: 'sachet', description: 'Sel de table fin' },
    { name: 'Sel gemme (gros sel)', categoryId: epices.id, estimatedPrice: 300, unit: 'sachet', description: 'Gros sel naturel' },
    { name: 'Cube Maggi', categoryId: epices.id, estimatedPrice: 25, unit: 'pièce', description: 'Cube bouillon Maggi' },
    { name: 'Cube Jumbo', categoryId: epices.id, estimatedPrice: 25, unit: 'pièce', description: 'Cube bouillon Jumbo' },
    { name: 'Curry en poudre', categoryId: epices.id, estimatedPrice: 300, unit: 'sachet', description: 'Poudre de curry' },
    { name: 'Noix de muscade', categoryId: epices.id, estimatedPrice: 200, unit: 'pièce', description: 'Noix de muscade entière' },
    { name: 'Clou de girofle', categoryId: epices.id, estimatedPrice: 300, unit: 'sachet', description: 'Clous de girofle séchés' },
    { name: 'Feuille de laurier', categoryId: epices.id, estimatedPrice: 200, unit: 'sachet', description: 'Feuilles de laurier séchées' },
    { name: 'Kanwu (potasse)', categoryId: epices.id, estimatedPrice: 100, unit: 'morceau', description: 'Potasse naturelle pour cuisine' },

    // --- Huiles & matières grasses ---
    { name: 'Huile de palme rouge (zomi)', categoryId: huiles.id, estimatedPrice: 1000, unit: 'litre', description: 'Huile de palme rouge traditionnelle' },
    { name: 'Huile d\'arachide', categoryId: huiles.id, estimatedPrice: 1500, unit: 'litre', description: 'Huile d\'arachide locale' },
    { name: 'Huile de soja', categoryId: huiles.id, estimatedPrice: 1200, unit: 'litre', description: 'Huile de soja raffinée' },
    { name: 'Huile végétale', categoryId: huiles.id, estimatedPrice: 1000, unit: 'litre', description: 'Huile végétale pour friture' },
    { name: 'Beurre de karité', categoryId: huiles.id, estimatedPrice: 1500, unit: 'kg', description: 'Beurre de karité pour cuisine' },
    { name: 'Huile de coco', categoryId: huiles.id, estimatedPrice: 2000, unit: 'litre', description: 'Huile de noix de coco' },

    // --- Protéines séchées & fumées ---
    { name: 'Poisson fumé (gros)', categoryId: proteines.id, estimatedPrice: 1500, unit: 'pièce', description: 'Gros poisson fumé pour sauce' },
    { name: 'Poisson fumé (petit)', categoryId: proteines.id, estimatedPrice: 500, unit: 'tas', description: 'Petits poissons fumés' },
    { name: 'Crevettes séchées', categoryId: proteines.id, estimatedPrice: 2000, unit: 'tas', description: 'Crevettes séchées pour assaisonnement' },
    { name: 'Crabe séché', categoryId: proteines.id, estimatedPrice: 1500, unit: 'tas', description: 'Crabes séchés moulus' },
    { name: 'Crevettes en poudre', categoryId: proteines.id, estimatedPrice: 1000, unit: 'sachet', description: 'Poudre de crevettes pour sauce' },
    { name: 'Kilishi (viande séchée)', categoryId: proteines.id, estimatedPrice: 2500, unit: 'sachet', description: 'Viande de bœuf séchée épicée' },
    { name: 'Lanhouin (poisson fermenté)', categoryId: proteines.id, estimatedPrice: 800, unit: 'morceau', description: 'Poisson fermenté pour relever les sauces' },

    // --- Produits transformés ---
    { name: 'Pâte d\'arachide', categoryId: transformes.id, estimatedPrice: 800, unit: 'boîte', description: 'Pâte d\'arachide pour sauce arachide' },
    { name: 'Concentré de tomate (petit)', categoryId: transformes.id, estimatedPrice: 200, unit: 'sachet', description: 'Petit sachet de concentré de tomate' },
    { name: 'Concentré de tomate (boîte)', categoryId: transformes.id, estimatedPrice: 600, unit: 'boîte', description: 'Boîte de concentré de tomate' },
    { name: 'Poudre de baobab', categoryId: transformes.id, estimatedPrice: 500, unit: 'sachet', description: 'Poudre de fruit de baobab (pain de singe)' },
    { name: 'Tapioca (amidon de manioc)', categoryId: transformes.id, estimatedPrice: 500, unit: 'sachet', description: 'Amidon de manioc pour épaissir' },
    { name: 'Moutarde en grains (locale)', categoryId: transformes.id, estimatedPrice: 300, unit: 'sachet', description: 'Graines de moutarde locale' },
    { name: 'Vinaigre local', categoryId: transformes.id, estimatedPrice: 500, unit: 'bouteille', description: 'Vinaigre de fabrication locale' },
    { name: 'Lait concentré (Bonnet Rouge)', categoryId: transformes.id, estimatedPrice: 400, unit: 'boîte', description: 'Lait concentré sucré en boîte' },
  ];

  for (const produit of produitsData) {
    await prisma.product.upsert({
      where: { id: produit.name }, // Won't match, forces create
      update: {},
      create: produit,
    });
  }

  console.log(`✅ ${produitsData.length} produits togolais créés`);

  // ============================================================
  // UTILISATEURS DE DÉMONSTRATION
  // ============================================================
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Admin
  const adminUser = await prisma.user.upsert({
    where: { phone: '+22890000001' },
    update: {},
    create: {
      name: 'Admin MarketCourse',
      phone: '+22890000001',
      email: 'admin@marketcourse.tg',
      password: hashedPassword,
      role: 'ADMIN',
      admin: { create: {} },
    },
  });

  // Client de démo
  const clientUser = await prisma.user.upsert({
    where: { phone: '+22890000002' },
    update: {},
    create: {
      name: 'Kofi Mensah',
      phone: '+22890000002',
      email: 'kofi@example.com',
      password: hashedPassword,
      role: 'CLIENT',
      client: {
        create: {
          address: 'Boulevard du 13 Janvier',
          quartier: 'Tokoin',
          city: 'Lomé',
          landmark: 'Près du marché de Tokoin',
        },
      },
    },
  });

  // Coursier de démo
  const courierUser = await prisma.user.upsert({
    where: { phone: '+22890000003' },
    update: {},
    create: {
      name: 'Yao Agbeko',
      phone: '+22890000003',
      email: 'yao@example.com',
      password: hashedPassword,
      role: 'COURIER',
      courier: {
        create: {
          zone: 'Lomé Centre',
          available: true,
          transport: 'MOTO',
        },
      },
    },
  });

  console.log('✅ Utilisateurs de démonstration créés');
  console.log('   📧 Admin: +22890000001 / password123');
  console.log('   📧 Client: +22890000002 / password123');
  console.log('   📧 Coursier: +22890000003 / password123');

  console.log('\n🎉 Seeding terminé avec succès !');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
