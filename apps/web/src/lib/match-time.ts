/**
 * Helpers para mostrar hora de partidos.
 *
 * Convención: cuando `scheduledAt` cae a las 00:00 hora Chile, se interpreta
 * como "Por definir" (TBD). Se usa en playoffs (F11/F12) antes de que la
 * organización confirme el horario.
 */

const TIME_ZONE = 'America/Santiago';

const timeFormatter = new Intl.DateTimeFormat('es-CL', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: TIME_ZONE,
});

export function formatMatchTime(iso: string | Date): string {
  return timeFormatter.format(typeof iso === 'string' ? new Date(iso) : iso);
}

export function isTimeTbd(iso: string | Date): boolean {
  return formatMatchTime(iso) === '00:00';
}

/** Devuelve la hora o el texto "Por definir" si el partido está TBD. */
export function matchTimeOrTbd(iso: string | Date, tbdLabel = 'Por definir'): string {
  return isTimeTbd(iso) ? tbdLabel : formatMatchTime(iso);
}
