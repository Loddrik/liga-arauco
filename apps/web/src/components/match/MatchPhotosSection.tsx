import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/http';

// Base URL del backend liga-arauco — se usa para resolver el qrUrl que viene
// como path relativo (/api/matches/:id/qr.png).
const API_BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');
// Origen de NM para validación de postMessage (crítico de seguridad).
const NM_ORIGIN = import.meta.env.VITE_NM_BASE_URL ?? 'http://localhost:3000';

interface PhotosConfig {
  slug: string | null;
  embedUrl: string | null;
  qrUrl: string | null;
}

/** Append a `tab` param to the NM embed URL preserving the existing query. */
function withTab(embedUrl: string, tab: 'gallery' | 'upload'): string {
  const sep = embedUrl.includes('?') ? '&' : '?';
  return `${embedUrl}${sep}tab=${tab}`;
}

interface Props {
  matchId: string;
}

export function MatchPhotosSection({ matchId }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['match-photos-config', matchId],
    queryFn: async () => {
      const { data } = await http.get<PhotosConfig>(
        `/matches/${matchId}/photos-config`,
      );
      return data;
    },
  });

  const [iframeHeight, setIframeHeight] = useState(600);
  const [showUploader, setShowUploader] = useState(false);
  const [thanksToast, setThanksToast] = useState(false);

  // Validamos el origen antes de aceptar cualquier mensaje del iframe.
  // VITAL: sin este check, cualquier sitio podría inyectar mensajes.
  const expectedOrigin = useMemo(() => {
    try {
      return new URL(NM_ORIGIN).origin;
    } catch {
      return NM_ORIGIN;
    }
  }, []);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== expectedOrigin) return;
      const payload = event.data as
        | { type: 'nm:resize'; height: number }
        | { type: 'nm:upload:complete' }
        | null;
      if (!payload || typeof payload !== 'object') return;

      if (payload.type === 'nm:resize' && typeof payload.height === 'number') {
        // Clamp para evitar que el iframe nos pida 50000px por accidente.
        setIframeHeight(Math.max(300, Math.min(payload.height, 4000)));
      } else if (payload.type === 'nm:upload:complete') {
        setThanksToast(true);
        setTimeout(() => setThanksToast(false), 4000);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [expectedOrigin]);

  if (isLoading) {
    return (
      <section className="mt-12">
        <div className="h-48 bg-ink-100 animate-pulse" />
      </section>
    );
  }

  if (isError || !data || !data.slug || !data.embedUrl) {
    // Degrade graciosa: no rompemos la página si la integración falla o
    // el partido aún no se sincronizó.
    return (
      <section className="mt-12 border border-ink-100 p-6 bg-paper-50">
        <h2 className="font-display text-2xl sm:text-3xl tracking-wide mb-2">
          Fotos del partido
        </h2>
        <p className="text-ink-500 text-sm">
          Las fotos se cargarán pronto. Vuelve más tarde o súbelas tú mismo el
          día del partido.
        </p>
      </section>
    );
  }

  const fullQrUrl = data.qrUrl?.startsWith('http')
    ? data.qrUrl
    : `${API_BASE}${data.qrUrl?.replace(/^\/api/, '')}`;

  return (
    <section className="mt-12 space-y-6">
      <header className="border-b border-ink-100 pb-2">
        <h2 className="font-display text-3xl sm:text-4xl tracking-wide">
          Fotos del partido
        </h2>
        <p className="text-ink-500 text-sm mt-1">
          Sube tus fotos con el QR y míralas aquí mismo. Powered by{' '}
          <a
            href={NM_ORIGIN}
            target="_blank"
            rel="noopener noreferrer"
            className="text-court hover:underline"
          >
            Nuestro Momento
          </a>
          .
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        {/* Card 1: Subir fotos */}
        <UploadCard
          qrUrl={fullQrUrl}
          onOpen={() => setShowUploader(true)}
        />

        {/* Card 2: Galería embebida — forzamos tab=gallery para evitar que
            el iframe muestre el formulario de upload duplicado cuando hay 0 fotos. */}
        <GalleryCard
          embedUrl={withTab(data.embedUrl, 'gallery')}
          height={iframeHeight}
        />
      </div>

      {showUploader && (
        <UploaderModal
          embedUrl={withTab(data.embedUrl, 'upload')}
          onClose={() => setShowUploader(false)}
        />
      )}

      {thanksToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink text-paper-50 px-4 py-2 shadow-lg z-50 eyebrow"
        >
          ¡Gracias por tus fotos!
        </div>
      )}
    </section>
  );
}

interface UploadCardProps {
  qrUrl: string;
  onOpen: () => void;
}

function UploadCard({ qrUrl, onOpen }: UploadCardProps) {
  return (
    <div className="border border-ink-100 bg-paper-50 p-5 flex flex-col items-center gap-3">
      <div className="eyebrow text-ink-500">Sube tus fotos</div>
      <img
        src={qrUrl}
        alt="QR para subir fotos del partido"
        className="w-full max-w-[240px] aspect-square"
      />
      <p className="text-xs text-ink-500 text-center">
        Escanea el QR con tu celular para subir fotos.
      </p>
      <button
        type="button"
        onClick={onOpen}
        className="w-full bg-court text-paper-50 eyebrow py-2 hover:bg-court/90 transition-colors"
      >
        Abrir uploader aquí
      </button>
      <a
        href={qrUrl}
        download
        className="text-xs text-ink-500 hover:text-court underline"
      >
        Descargar QR (PNG)
      </a>
    </div>
  );
}

interface GalleryCardProps {
  embedUrl: string;
  height: number;
}

function GalleryCard({ embedUrl, height }: GalleryCardProps) {
  return (
    <div className="border border-ink-100 bg-paper-50 overflow-hidden">
      <iframe
        src={embedUrl}
        title="Galería de fotos del partido"
        style={{ width: '100%', height: `${height}px`, border: 'none' }}
        // sandbox razonable — permite scripts y misma origen (NM).
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        // loading=lazy: la galería puede estar abajo del fold, no quemamos
        // banda hasta que sea visible.
        loading="lazy"
      />
    </div>
  );
}

interface UploaderModalProps {
  embedUrl: string;
  onClose: () => void;
}

function UploaderModal({ embedUrl, onClose }: UploaderModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    // Bloquea scroll del body mientras el modal está abierto (especialmente en
    // mobile, donde el iframe ocupa toda la pantalla y queremos que el touch
    // scroll vaya al iframe, no al fondo).
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Subir fotos"
      // Mobile: cubre toda la pantalla sin padding ni backdrop visible.
      // Desktop (sm+): vuelve al modal centrado con backdrop oscuro.
      className="fixed inset-0 z-40 bg-paper-50 sm:bg-ink/70 sm:flex sm:items-center sm:justify-center sm:p-4"
      onClick={e => {
        if (e.target === dialogRef.current) onClose();
      }}
      ref={dialogRef}
    >
      <div className="bg-paper-50 w-full h-full sm:h-auto sm:max-w-3xl sm:max-h-[90vh] flex flex-col">
        <header className="flex items-center justify-between border-b border-ink-100 px-3 py-2.5 shrink-0">
          <span className="eyebrow truncate">Subir fotos del partido</span>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-500 hover:text-ink text-2xl leading-none px-3 py-1 -mr-2"
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>
        <iframe
          src={embedUrl}
          title="Uploader de fotos"
          // flex-1 hace que el iframe absorba el espacio restante. En mobile
          // = altura completa menos header. En desktop = hasta 90vh (limitado
          // por el contenedor). Cero scroll wrapper extra.
          className="flex-1 w-full border-0 min-h-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
}
