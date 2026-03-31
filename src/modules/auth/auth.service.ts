import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { RegisterInput, LoginInput } from './auth.schema';

export class AuthService {
  constructor(private fastify: FastifyInstance) {}

  async register(data: RegisterInput) {
    // Vérifier si le téléphone existe déjà
    const existing = await this.fastify.prisma.user.findUnique({
      where: { phone: data.phone },
    });

    if (existing) {
      throw { statusCode: 409, message: 'Ce numéro de téléphone est déjà utilisé.' };
    }

    // Vérifier si l'email existe déjà
    if (data.email) {
      const emailExists = await this.fastify.prisma.user.findUnique({
        where: { email: data.email },
      });
      if (emailExists) {
        throw { statusCode: 409, message: 'Cet email est déjà utilisé.' };
      }
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Créer l'utilisateur avec son profil
    const user = await this.fastify.prisma.user.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        password: hashedPassword,
        role: data.role,
        ...(data.role === 'CLIENT' && {
          client: {
            create: {
              address: data.address,
              quartier: data.quartier,
              city: data.city || 'Lomé',
              landmark: data.landmark,
            },
          },
        }),
        ...(data.role === 'COURIER' && {
          courier: {
            create: {
              zone: data.zone,
              transport: data.transport || 'MOTO',
            },
          },
        }),
      },
      include: {
        client: true,
        courier: true,
      },
    });

    // Générer le token JWT
    const token = this.fastify.jwt.sign({ id: user.id, role: user.role });

    // Retourner sans le mot de passe
    const { password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  async login(data: LoginInput) {
    const user = await this.fastify.prisma.user.findUnique({
      where: { phone: data.phone },
      include: {
        client: true,
        courier: true,
        admin: true,
      },
    });

    if (!user) {
      throw { statusCode: 401, message: 'Numéro de téléphone ou mot de passe incorrect.' };
    }

    if (user.status !== 'ACTIVE') {
      throw { statusCode: 403, message: 'Votre compte est désactivé. Contactez l\'administrateur.' };
    }

    const validPassword = await bcrypt.compare(data.password, user.password);
    if (!validPassword) {
      throw { statusCode: 401, message: 'Numéro de téléphone ou mot de passe incorrect.' };
    }

    const token = this.fastify.jwt.sign({ id: user.id, role: user.role });

    const { password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  async getProfile(userId: string) {
    const user = await this.fastify.prisma.user.findUnique({
      where: { id: userId },
      include: {
        client: true,
        courier: true,
        admin: true,
      },
    });

    if (!user) {
      throw { statusCode: 404, message: 'Utilisateur non trouvé.' };
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
