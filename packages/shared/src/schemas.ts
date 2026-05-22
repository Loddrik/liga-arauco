import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const updateMatchSchema = z.object({
  homeScore: z.number().int().min(0).nullable().optional(),
  awayScore: z.number().int().min(0).nullable().optional(),
  status: z.enum(['SCHEDULED', 'PLAYED', 'POSTPONED']).optional(),
  notes: z.string().max(500).nullable().optional(),
});
export type UpdateMatchInput = z.infer<typeof updateMatchSchema>;

export const updateTeamSchema = z.object({
  name: z.string().min(1).optional(),
  shortName: z.string().min(1).max(20).optional(),
  instagramHandle: z.string().nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  logoSvgUrl: z.string().url().nullable().optional(),
  coverPhotoUrl: z.string().url().nullable().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
});
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;

export const assignPlayoffSchema = z.object({
  matchNumber: z.number().int(),
  homeTeamId: z.string().nullable(),
  awayTeamId: z.string().nullable(),
});
export type AssignPlayoffInput = z.infer<typeof assignPlayoffSchema>;

// RUT chileno: 1+ dígitos, opcionalmente con puntos separadores, guión, y dígito
// verificador (0-9 o K/k). Aceptamos el formato visible en el docx oficial.
const RUT_PATTERN = /^[\d.]+-[\dkK]$/;

export const createPlayerSchema = z.object({
  name: z.string().min(1).max(120).trim(),
  rut: z.string().regex(RUT_PATTERN, 'Formato esperado: 12.345.678-9'),
  jersey: z.number().int().min(0).max(99).nullable().optional(),
  position: z.string().max(40).nullable().optional(),
});
export type CreatePlayerInput = z.infer<typeof createPlayerSchema>;

export const updatePlayerSchema = createPlayerSchema.partial();
export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>;
