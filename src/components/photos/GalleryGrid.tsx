
import { useState } from "react";
import { Card } from "@/components/ui/card";
import type { Photo } from "@/types/photo";

interface GalleryGridProps {
  photos: Photo[];
  title: string;
  onPhotoClick: (index: number) => void;
}

interface GalleryPhotoProps {
  photo: Photo;
  title: string;
  onClick: () => void;
}

function GalleryPhoto({ photo, title, onClick }: GalleryPhotoProps) {
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
      className="mb-3 inline-block w-full break-inside-avoid text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="overflow-hidden p-0">
        <div
          className="relative w-full overflow-hidden bg-muted"
          style={{ aspectRatio: `${aspectRatio}` }}
        >
          <img
            src={photo.thumbnail_url || photo.url}
            alt={`Foto event ${title}`}
            loading="lazy"
            decoding="async"
            width={photo.width || undefined}
            height={photo.height || undefined}
            onLoad={(event) => {
              const image = event.currentTarget;

              if (!hasDimensions && image.naturalWidth && image.naturalHeight) {
                setAspectRatio(image.naturalWidth / image.naturalHeight);
              }
            }}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-200 hover:scale-105"
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
}: GalleryGridProps) {
  return (
    <div className="columns-2 gap-3 md:columns-3 lg:columns-4 2xl:columns-5">
      {photos.map((photo, index) => (
        <GalleryPhoto
          key={photo.id}
          photo={photo}
          title={title}
          onClick={() => onPhotoClick(index)}
        />
      ))}
    </div>
  );
}
