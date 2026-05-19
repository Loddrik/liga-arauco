import {
  Injectable,
  Logger,
  OnModuleInit,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type {
  NmBulkCreateInput,
  NmBulkCreateResult,
  NmCreateEventInput,
  NmEvent,
  NmPhotosListResult,
} from './nm.types';

// Mínimo subset de fetch que necesitamos. Lo extraemos para poder mockear
// en tests sin tocar globals.
export type FetchLike = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}>;

interface RequestOptions {
  method: 'GET' | 'POST';
  path: string;
  body?: unknown;
  /** Si es false, no se reintenta en 5xx (útil para listados). Default true. */
  retry?: boolean;
}

const MAX_RETRIES = 2;
const RETRY_DELAYS_MS = [200, 800];

@Injectable()
export class NmService implements OnModuleInit {
  private readonly logger = new Logger(NmService.name);
  private baseUrl = '';
  private apiKey = '';
  private fetchImpl: FetchLike;

  constructor(private readonly config: ConfigService) {
    // Node 22 trae fetch global; lo guardamos en una propiedad para que los
    // tests puedan inyectar un mock vía `setFetch()`.
    this.fetchImpl = globalThis.fetch as unknown as FetchLike;
  }

  onModuleInit() {
    this.baseUrl =
      this.config.get<string>('NM_API_BASE_URL')?.replace(/\/$/, '') ??
      'http://localhost:3000';
    this.apiKey = this.config.get<string>('NM_API_KEY') ?? '';
    if (!this.apiKey) {
      // No tiramos: en dev sin la integración encendida queremos que la app
      // siga arrancando. Los métodos públicos sí van a tirar al ser llamados.
      this.logger.warn(
        'NM_API_KEY no está seteada — la integración con Nuestro Momento estará deshabilitada.',
      );
    }
  }

  /** Test seam — permite inyectar un fetch mock. */
  setFetch(fn: FetchLike) {
    this.fetchImpl = fn;
  }

  /** Test seam — setea credenciales desde el test sin depender de ConfigService. */
  configureForTest(opts: { baseUrl: string; apiKey: string }) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    this.apiKey = opts.apiKey;
  }

  isEnabled(): boolean {
    return !!this.apiKey;
  }

  /** Builds the embed URL para el modo iframe (spec 003 de NM). */
  buildEmbedUrl(slug: string, primaryColor?: string | null): string {
    const params = new URLSearchParams({ embed: '1' });
    if (primaryColor) params.set('primary', primaryColor);
    return `${this.baseUrl}/e/${slug}?${params.toString()}`;
  }

  /** Builds the público (non-embed) URL, usado para QR. */
  buildPublicUrl(slug: string): string {
    return `${this.baseUrl}/e/${slug}`;
  }

  async createEvent(input: NmCreateEventInput): Promise<NmEvent> {
    return this.request<NmEvent>({
      method: 'POST',
      path: '/api/org/v1/events',
      body: input,
    });
  }

  async bulkCreateEvents(
    input: NmBulkCreateInput,
  ): Promise<NmBulkCreateResult> {
    return this.request<NmBulkCreateResult>({
      method: 'POST',
      path: '/api/org/v1/events/bulk',
      body: input,
    });
  }

  async getEvent(id: string): Promise<NmEvent> {
    return this.request<NmEvent>({
      method: 'GET',
      path: `/api/org/v1/events/${encodeURIComponent(id)}`,
    });
  }

  async listEventPhotos(id: string): Promise<NmPhotosListResult> {
    return this.request<NmPhotosListResult>({
      method: 'GET',
      path: `/api/org/v1/events/${encodeURIComponent(id)}/photos`,
    });
  }

  private async request<T>(opts: RequestOptions): Promise<T> {
    if (!this.apiKey) {
      throw new HttpException(
        'NM_API_KEY no configurada — integración deshabilitada',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const reqId = randomUUID().slice(0, 8);
    const url = `${this.baseUrl}${opts.path}`;
    const retry = opts.retry !== false;
    const maxAttempts = retry ? MAX_RETRIES + 1 : 1;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const start = Date.now();
      try {
        const res = await this.fetchImpl(url, {
          method: opts.method,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        });

        const elapsed = Date.now() - start;

        if (res.ok) {
          this.logger.log(
            `[${reqId}] ${opts.method} ${opts.path} → ${res.status} (${elapsed}ms, intento ${attempt}/${maxAttempts})`,
          );
          return (await res.json()) as T;
        }

        // 4xx → no reintentamos
        if (res.status < 500) {
          const errBody = await safeReadText(res);
          this.logger.error(
            `[${reqId}] ${opts.method} ${opts.path} → ${res.status} (${elapsed}ms) — ${errBody}`,
          );
          throw new HttpException(
            {
              message: `NM API error ${res.status}`,
              upstream: errBody,
            },
            res.status,
          );
        }

        // 5xx → reintentar si quedan intentos
        const errBody = await safeReadText(res);
        this.logger.warn(
          `[${reqId}] ${opts.method} ${opts.path} → ${res.status} (${elapsed}ms, intento ${attempt}/${maxAttempts}) — ${errBody}`,
        );
        lastError = new HttpException(
          `NM API ${res.status}: ${errBody}`,
          res.status,
        );
        if (attempt < maxAttempts) {
          await sleep(RETRY_DELAYS_MS[attempt - 1] ?? 800);
          continue;
        }
        throw lastError;
      } catch (err) {
        // HttpException 4xx ya tirada arriba: re-throw inmediato.
        if (err instanceof HttpException && err.getStatus() < 500) {
          throw err;
        }
        // Network error u otro fallo: reintentar si quedan attempts.
        lastError = err as Error;
        this.logger.warn(
          `[${reqId}] ${opts.method} ${opts.path} → error de red (intento ${attempt}/${maxAttempts}): ${lastError.message}`,
        );
        if (attempt < maxAttempts) {
          await sleep(RETRY_DELAYS_MS[attempt - 1] ?? 800);
          continue;
        }
        throw lastError;
      }
    }
    // Inalcanzable, pero TS lo necesita.
    throw lastError ?? new Error('NM request failed');
  }
}

async function safeReadText(res: {
  text: () => Promise<string>;
}): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '<unreadable body>';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
