import { useState } from 'react';
import { PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { youtubeThumb } from '@/lib/video';
import type { ExerciseRow } from '@/hooks/useCorrectiveExercises';

interface Props {
  ex: ExerciseRow;
  onPlay: (ex: ExerciseRow) => void;
}

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Card esercizio libreria (linguaggio visivo slice 2). Thumbnail derivata dal
 * video_url (YouTube poster) con fallback tile a gradiente; dose in pill; slot
 * durata CONDIZIONALE (nascosto finché il record non porta un valore).
 */
export default function ExerciseCard({ ex, onPlay }: Props) {
  const [imgError, setImgError] = useState(false);
  const thumb = youtubeThumb(ex.video_url);
  const playable = !!ex.video_url;
  const showThumb = !!thumb && !imgError;
  // Slot durata: il DB non ha (ancora) la colonna → lettura difensiva, oggi sempre null.
  const durationSeconds = (ex as { duration_seconds?: number | null }).duration_seconds ?? null;

  return (
    <div
      role={playable ? 'button' : undefined}
      tabIndex={playable ? 0 : undefined}
      onClick={playable ? () => onPlay(ex) : undefined}
      onKeyDown={
        playable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onPlay(ex);
              }
            }
          : undefined
      }
      className={cn('surface-card overflow-hidden', playable && 'card-interactive tap-target cursor-pointer')}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted overflow-hidden">
        {showThumb ? (
          <>
            <img
              src={thumb}
              alt=""
              loading="lazy"
              onError={() => setImgError(true)}
              onLoad={(e) => {
                // YouTube serve un placeholder grigio 120x90 (HTTP 200) per id
                // inesistenti/eliminati/privati: onError non scatta, quindi lo
                // rileviamo dalla larghezza reale e cadiamo sul fallback gradiente.
                if (e.currentTarget.naturalWidth <= 120) setImgError(true);
              }}
              className="w-full h-full object-cover"
            />
            {playable && (
              <div className="absolute inset-0 grid place-items-center bg-foreground/10">
                <PlayCircle className="w-9 h-9 text-primary-foreground drop-shadow" />
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full grid place-items-center bg-gradient-to-br from-primary/15 to-muted">
            <PlayCircle className="w-8 h-8 text-muted-foreground opacity-70" />
            <span className="absolute bottom-1.5 left-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              L{ex.posture_level}
            </span>
          </div>
        )}
        {durationSeconds != null && (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-foreground/70 text-background text-[10px] font-medium px-1.5 py-0.5">
            {formatDuration(durationSeconds)}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        <div className="text-sm font-medium leading-snug">{ex.name}</div>
        {ex.goal && <div className="text-xs text-muted-foreground line-clamp-2">{ex.goal}</div>}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px]">
            L{ex.posture_level} · {ex.posture_name}
          </Badge>
          {ex.dose && (
            <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground text-[10px] font-medium px-2 py-0.5">
              {ex.dose}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
