import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreatePlayerInput,
  PlayerAdminDto,
  PlayerPublicDto,
  UpdatePlayerInput,
} from '@liga/shared';
import { PrismaService } from '../prisma/prisma.service';
import { mapPlayerAdmin, mapPlayerPublic } from '../common/mappers';

@Injectable()
export class PlayersService {
  constructor(private prisma: PrismaService) {}

  /** Lista pública: sin RUT, ordenada por jersey luego nombre. */
  async listPublicByTeamSlug(slug: string): Promise<PlayerPublicDto[]> {
    const team = await this.prisma.team.findUnique({ where: { slug } });
    if (!team) throw new NotFoundException(`team "${slug}" not found`);
    const players = await this.prisma.player.findMany({
      where: { teamId: team.id },
      orderBy: [{ jersey: 'asc' }, { name: 'asc' }],
    });
    return players.map(mapPlayerPublic);
  }

  /** Lista admin: incluye RUT, ordenada por jersey luego nombre. */
  async listAdminByTeamId(teamId: string): Promise<PlayerAdminDto[]> {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException(`team ${teamId} not found`);
    const players = await this.prisma.player.findMany({
      where: { teamId },
      orderBy: [{ jersey: 'asc' }, { name: 'asc' }],
    });
    return players.map(mapPlayerAdmin);
  }

  async create(teamId: string, input: CreatePlayerInput): Promise<PlayerAdminDto> {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException(`team ${teamId} not found`);
    try {
      const player = await this.prisma.player.create({
        data: {
          teamId,
          name: input.name,
          rut: input.rut,
          jersey: input.jersey ?? null,
          position: input.position ?? null,
        },
      });
      return mapPlayerAdmin(player);
    } catch (err: unknown) {
      this.rethrowUniqueConflict(err);
      throw err;
    }
  }

  async update(id: string, input: UpdatePlayerInput): Promise<PlayerAdminDto> {
    const existing = await this.prisma.player.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`player ${id} not found`);
    try {
      const player = await this.prisma.player.update({
        where: { id },
        data: {
          name: input.name ?? undefined,
          rut: input.rut ?? undefined,
          jersey: input.jersey === undefined ? undefined : input.jersey,
          position: input.position === undefined ? undefined : input.position,
        },
      });
      return mapPlayerAdmin(player);
    } catch (err: unknown) {
      this.rethrowUniqueConflict(err);
      throw err;
    }
  }

  async remove(id: string): Promise<{ ok: true }> {
    const existing = await this.prisma.player.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`player ${id} not found`);
    await this.prisma.player.delete({ where: { id } });
    return { ok: true };
  }

  private rethrowUniqueConflict(err: unknown): void {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      const target = (err as { meta?: { target?: string[] } }).meta?.target ?? [];
      if (target.includes('rut')) {
        throw new ConflictException('Ya existe un jugador con ese RUT.');
      }
      if (target.includes('teamId') && target.includes('jersey')) {
        throw new ConflictException('Ya hay otro jugador con ese número en este equipo.');
      }
      throw new BadRequestException('Conflicto de unicidad.');
    }
  }
}
