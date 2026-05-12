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
