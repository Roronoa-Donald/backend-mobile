import { z } from 'zod';

// Schémas de validation pour l'authentification

export const registerSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  phone: z.string().min(8, 'Numéro de téléphone invalide').regex(/^\+?[0-9]+$/, 'Format de téléphone invalide'),
  email: z.string().email('Email invalide').optional().nullable(),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  role: z.enum(['CLIENT', 'COURIER']).default('CLIENT'),
  // Champs client optionnels
  address: z.string().optional(),
  quartier: z.string().optional(),
  city: z.string().default('Lomé'),
  landmark: z.string().optional(),
  // Champs coursier optionnels
  zone: z.string().optional(),
  transport: z.enum(['MOTO', 'VELO', 'VOITURE', 'A_PIED']).optional(),
});

export const loginSchema = z.object({
  phone: z.string().min(8, 'Numéro de téléphone requis'),
  password: z.string().min(1, 'Mot de passe requis'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
