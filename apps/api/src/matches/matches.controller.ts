import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  NotFoundException,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import * as QRCode from 'qrcode';
import { MatchesService } from './matches.service';

@Controller('matches')
export class MatchesController {
  constructor(private matches: MatchesService) {}

  @Get('upcoming')
  upcoming(@Query('limit', new DefaultValuePipe(3), ParseIntPipe) limit: number) {
    return this.matches.upcoming(limit);
  }

  @Get('recent')
  recent(@Query('limit', new DefaultValuePipe(6), ParseIntPipe) limit: number) {
    return this.matches.recent(limit);
  }

  /**
   * Endpoint público que el frontend consulta para embeber la galería NM.
   * Devuelve nulls si el match aún no está sincronizado — el front muestra
   * placeholder en ese caso (en lugar de romper).
   */
  @Get(':id/photos-config')
  photosConfig(@Param('id') id: string) {
    return this.matches.getPhotosConfig(id);
  }

  /**
   * Stats públicas (box score + parciales) del partido. La página de detalle
   * lo llama después de cargar los datos básicos del partido (que vienen del
   * cache de useRounds). Si no hay stats cargadas todavía, devuelve arrays
   * vacíos — el frontend cae al render solo de marcador final.
   */
  @Get(':id/stats')
  stats(@Param('id') id: string) {
    return this.matches.getMatchStats(id);
  }

  /**
   * Stream-ea un PNG del QR del partido (apunta al evento público en NM).
   * Pensado para imprimir y pegar en cancha el día del partido.
   */
  @Get(':id/qr.png')
  async qrPng(@Param('id') id: string, @Res() res: Response) {
    const url = await this.matches.getPublicEventUrl(id);
    if (!url) {
      throw new NotFoundException(
        `match "${id}" sin galería NM (aún no sincronizado)`,
      );
    }
    const buffer = await QRCode.toBuffer(url, {
      type: 'png',
      // 512px da impresión decente sin pesar demasiado.
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'M',
    });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buffer);
  }
}
