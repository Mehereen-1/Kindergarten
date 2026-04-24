import { z } from 'zod';
import { isHexToken } from '@/lib/admin/security';

const emailSchema = z.string().trim().email('Please provide a valid email address').transform((value) => value.toLowerCase());

const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters long')
  .max(128, 'Password is too long');

const tokenSchema = z
  .string()
  .trim()
  .refine((token) => isHexToken(token), 'Invalid token format');

export const adminInitSchema = z.object({
  email: emailSchema,
  bootstrapSecret: z.string().trim().optional(),
  initSecret: z.string().trim().optional(),
});

export const adminBootstrapSchema = adminInitSchema;

export const setupTokenQuerySchema = z.object({
  token: tokenSchema,
});

export const adminSetupSchema = z.object({
  token: tokenSchema,
  password: passwordSchema,
});

export const adminLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

export const changeEmailSchema = z.object({
  newEmail: emailSchema,
});

export const verifyEmailChangeSchema = z.object({
  token: tokenSchema,
});

export const requestResetSchema = z.object({
  email: emailSchema,
});

export const resetSchema = z.object({
  token: tokenSchema,
});

export const resetTokenQuerySchema = resetSchema;

export const resetPasswordSchema = z.object({
  token: tokenSchema,
  password: passwordSchema,
});
