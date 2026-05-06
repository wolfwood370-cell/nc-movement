import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onClose: () => void;
  url: string | null;
  title: string;
}

/** Convert YouTube/Vimeo watch URLs to their embed equivalents. */
function toEmbed(url: string): { src: string; isIframe: boolean } {
  try {
    const u = new URL(url);
    // YouTube
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v');
      if (id) return { src: `https://www.youtube.com/embed/${id}`, isIframe: true };
    }
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace('/', '');
      if (id) return { src: `https://www.youtube.com/embed/${id}`, isIframe: true };
    }
    // Vimeo
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.replace('/', '');
      if (id) return { src: `https://player.vimeo.com/video/${id}`, isIframe: true };
    }
    // Direct media
    if (/\.(mp4|webm|ogg|mov)$/i.test(u.pathname)) {
      return { src: url, isIframe: false };
    }
    if (/\.gif$/i.test(u.pathname)) {
      return { src: url, isIframe: false };
    }
  } catch {
    // fall through
  }
  return { src: url, isIframe: true };
}

export default function ExerciseVideoDialog({ open, onClose, url, title }: Props) {
  const embed = url ? toEmbed(url) : null;
  const isImage = url ? /\.gif$/i.test(url) : false;
  const isVideoFile = url ? /\.(mp4|webm|ogg|mov)$/i.test(url) : false;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">{title}</DialogTitle>
        </DialogHeader>
        {!embed ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nessun video disponibile per questo esercizio.
          </p>
        ) : (
          <div className="aspect-video w-full bg-black rounded-md overflow-hidden">
            {isImage ? (
              <img src={embed.src} alt={title} className="w-full h-full object-contain" />
            ) : isVideoFile ? (
              <video
                key={embed.src}
                src={embed.src}
                controls
                autoPlay
                className="w-full h-full"
              />
            ) : (
              <iframe
                key={embed.src}
                src={embed.src}
                title={title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
