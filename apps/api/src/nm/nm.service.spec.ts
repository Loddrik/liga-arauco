/**
 * Tests para NmService.
 *
 * Cubren:
 * - happy path (200 retorna body parseado)
 * - auth header se manda con Bearer + api key
 * - retry en 5xx hasta MAX_RETRIES y luego falla
 * - 4xx NO se reintenta (1 sola llamada)
 *
 * Stubbeamos `fetch` vía `setFetch()` en lugar de mockear el global —
 * más limpio y predecible.
 */
import { ConfigService } from '@nestjs/config';
import { HttpException } from '@nestjs/common';
import { NmService, type FetchLike } from './nm.service';

function makeService(apiKey = 'nm_org_test_key'): NmService {
  // ConfigService falso: get devuelve undefined, no lo usamos.
  const config = {
    get: () => undefined,
  } as unknown as ConfigService;
  const svc = new NmService(config);
  svc.configureForTest({
    baseUrl: 'https://nm.test',
    apiKey,
  });
  return svc;
}

function makeFetchMock(
  responses: Array<{
    status: number;
    body?: unknown;
    text?: string;
  }>,
): { fn: FetchLike; calls: Array<{ url: string; init: any }> } {
  const calls: Array<{ url: string; init: any }> = [];
  let i = 0;
  const fn: FetchLike = async (url, init) => {
    calls.push({ url, init });
    const res = responses[i] ?? responses[responses.length - 1];
    i++;
    return {
      ok: res.status >= 200 && res.status < 300,
      status: res.status,
      json: async () => res.body,
      text: async () => res.text ?? JSON.stringify(res.body ?? {}),
    };
  };
  return { fn, calls };
}

describe('NmService', () => {
  it('happy path: POST /events retorna body parseado', async () => {
    const svc = makeService();
    const { fn, calls } = makeFetchMock([
      {
        status: 201,
        body: {
          id: 'evt-1',
          slug: 'foo-vs-bar',
          organization_id: 'org-1',
          user_id: 'u-1',
          plan: 'premium',
          is_public: true,
          is_active: true,
          allow_uploads: true,
          expires_at: null,
          external_id: 'match-1',
        },
      },
    ]);
    svc.setFetch(fn);

    const result = await svc.createEvent({
      name: 'Equipo A vs Equipo B',
      event_type: 'corporate',
      external_id: 'match-1',
    });

    expect(result.id).toBe('evt-1');
    expect(result.slug).toBe('foo-vs-bar');
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://nm.test/api/org/v1/events');
    expect(calls[0].init.method).toBe('POST');
  });

  it('manda header Authorization: Bearer <api_key>', async () => {
    const svc = makeService('nm_org_abc123');
    const { fn, calls } = makeFetchMock([{ status: 201, body: { id: 'e' } }]);
    svc.setFetch(fn);

    await svc.createEvent({
      name: 'X',
      event_type: 'corporate',
    });

    expect(calls[0].init.headers.Authorization).toBe('Bearer nm_org_abc123');
    expect(calls[0].init.headers['Content-Type']).toBe('application/json');
  });

  it('reintenta en 5xx y eventualmente succede', async () => {
    const svc = makeService();
    const { fn, calls } = makeFetchMock([
      { status: 503, text: 'service unavailable' },
      { status: 201, body: { id: 'e-retry' } },
    ]);
    svc.setFetch(fn);

    const result = await svc.createEvent({
      name: 'X',
      event_type: 'corporate',
    });

    expect(result).toMatchObject({ id: 'e-retry' });
    expect(calls).toHaveLength(2);
  });

  it('falla tras agotar reintentos en 5xx persistente', async () => {
    const svc = makeService();
    const { fn, calls } = makeFetchMock([
      { status: 500, text: 'boom' },
      { status: 500, text: 'boom' },
      { status: 500, text: 'boom' },
    ]);
    svc.setFetch(fn);

    await expect(
      svc.createEvent({ name: 'X', event_type: 'corporate' }),
    ).rejects.toBeDefined();

    // 1 intento + 2 reintentos = 3
    expect(calls).toHaveLength(3);
  });

  it('NO reintenta en 401 (auth fail)', async () => {
    const svc = makeService();
    const { fn, calls } = makeFetchMock([
      {
        status: 401,
        text: JSON.stringify({ error: 'unauthorized', code: 'UNAUTHORIZED' }),
      },
    ]);
    svc.setFetch(fn);

    await expect(
      svc.createEvent({ name: 'X', event_type: 'corporate' }),
    ).rejects.toBeInstanceOf(HttpException);
    expect(calls).toHaveLength(1);
  });

  it('NO reintenta en 409 (duplicate external_id)', async () => {
    const svc = makeService();
    const { fn, calls } = makeFetchMock([
      {
        status: 409,
        text: JSON.stringify({ error: 'duplicate', code: 'duplicate_external_id' }),
      },
    ]);
    svc.setFetch(fn);

    await expect(
      svc.createEvent({ name: 'X', event_type: 'corporate', external_id: 'dupe' }),
    ).rejects.toBeInstanceOf(HttpException);
    expect(calls).toHaveLength(1);
  });

  it('buildEmbedUrl arma URL con embed=1 y primary color', () => {
    const svc = makeService();
    const url = svc.buildEmbedUrl('liga-arauco-2026-05-19-a-vs-b', '#0F2A4A');
    expect(url).toContain('https://nm.test/e/liga-arauco-2026-05-19-a-vs-b?');
    expect(url).toContain('embed=1');
    expect(url).toContain('primary=%230F2A4A');
  });

  it('isEnabled retorna false sin api key', () => {
    const config = {
      get: () => undefined,
    } as unknown as ConfigService;
    const svc = new NmService(config);
    svc.configureForTest({ baseUrl: 'https://nm.test', apiKey: '' });
    expect(svc.isEnabled()).toBe(false);
  });
});
