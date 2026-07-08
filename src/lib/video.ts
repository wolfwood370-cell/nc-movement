// Video helpers — deriva poster/thumbnail dal video_url (nessuna API key/segreto).

/** Estrae l'id YouTube da watch (?v=), youtu.be/{id}, /embed/{id}. Altrimenti null. */
export function toYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1) || null;
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return v;
      const m = u.pathname.match(/\/embed\/([^/?]+)/);
      if (m) return m[1];
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Poster YouTube (nessuna API key). Per id inesistenti/eliminati YouTube può servire un
 * placeholder grigio 120x90 con HTTP 200 (onError non scatta): la card lo rileva anche
 * dalla larghezza reale dell'immagine e mostra comunque il fallback a gradiente.
 */
export function youtubeThumb(url?: string | null): string | null {
  const id = toYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}
