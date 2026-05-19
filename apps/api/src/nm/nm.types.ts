// Tipos espejados de la NM Org API (`/api/org/v1/*`).
// Sólo modelamos los campos que consumimos. El resto se ignora.
// Ver: nuestros-momentos/docs/org-api.md

export type NmEventType = 'corporate' | 'birthday' | 'wedding' | 'other';

export interface NmCreateEventInput {
  name: string;
  event_type: NmEventType;
  event_date?: string; // ISO YYYY-MM-DD
  slug?: string;
  primary_color?: string;
  cover_image_url?: string;
  external_id?: string;
}

export interface NmEvent {
  id: string;
  slug: string;
  organization_id: string;
  user_id: string;
  plan: string;
  is_public: boolean;
  is_active: boolean;
  allow_uploads: boolean;
  expires_at: string | null;
  external_id: string | null;
  // photo_count viene en GET /:id pero no en POST. Opcional.
  photo_count?: number;
}

export interface NmBulkCreateInput {
  events: NmCreateEventInput[];
}

export interface NmBulkCreateResult {
  created: NmEvent[];
  existing: NmEvent[];
  errors?: Array<{ index: number; error: string; code?: string }>;
}

export interface NmPhoto {
  id: string;
  event_id: string;
  url: string;
  thumbnail_url?: string | null;
  width?: number | null;
  height?: number | null;
  created_at: string;
}

export interface NmPhotosListResult {
  data: NmPhoto[];
  next_cursor: string | null;
}

export interface NmErrorShape {
  error: string;
  code?: string;
  details?: unknown;
}
