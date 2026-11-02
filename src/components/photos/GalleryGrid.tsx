
import { useState } from "react";
import { Card } from "@/components/ui/card";
import OptimizedImage from "@/components/photos/OptimizedImage";
import { cn } from "@/lib/utils";
import type { Photo } from "@/types/photo";

interface GalleryGridProps {
  photos: Photo[];
  title: string;
  onPhotoClick: (index: number) => void;
  /** Foto yang baru masuk lewat WebSocket dan sedang di-highlight. */
  highlightedPhotoIds?: string[];
}

interface GalleryPhotoProps {
  photo: Photo;
  title: string;
  onClick: () => void;
  highlighted?: boolean;
}

function GalleryPhoto({
  photo,
  title,
  onClick,
  highlighted = false,
}: GalleryPhotoProps) {
  const hasDimensions =
    Boolean(photo.width && photo.height && photo.width > 0 && photo.height > 0);

  const [aspectRatio, setAspectRatio] = useState(
    hasDimensions ? photo.width! / photo.height! : 3 / 4,
  );

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Buka foto event ${title}`}
      data-highlighted={highlighted || undefined}
      className="mb-3 inline-block w-full break-inside-avoid text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card
        className={cn(
          "overflow-hidden p-0 transition-shadow duration-500",
          highlighted &&
            "ring-2 ring-amber-400 ring-offset-2 ring-offset-background shadow-lg shadow-amber-400/30",
        )}
      >
        <div
          className="relative w-full overflow-hidden bg-muted"
          style={{ aspectRatio: `${aspectRatio}` }}
        >
          <OptimizedImage
            src={photo.thumbnail_url || photo.url}
            blurHash={photo.blur_hash}
            alt={`Foto event ${title}`}
            className="absolute inset-0 transition-transform duration-200 hover:scale-105"
            onLoad={(event) => {
              const image = event.currentTarget;

              if (!hasDimensions && image.naturalWidth && image.naturalHeight) {
                setAspectRatio(image.naturalWidth / image.naturalHeight);
              }
            }}
          />
        </div>
      </Card>
    </button>
  );
}

export default function GalleryGrid({
  photos,
  title,
  onPhotoClick,
  highlightedPhotoIds = [],
}: GalleryGridProps) {
  const highlightedIds = new Set(highlightedPhotoIds);

  return (
    <div className="columns-2 gap-3 md:columns-3 lg:columns-4 2xl:columns-5">
      {photos.map((photo, index) => (
        <GalleryPhoto
          key={photo.id}
          photo={photo}
          title={title}
          highlighted={highlightedIds.has(photo.id)}
          onClick={() => onPhotoClick(index)}
        />
      ))}
    </div>
  );
}
