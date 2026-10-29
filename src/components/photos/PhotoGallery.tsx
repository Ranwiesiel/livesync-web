
import { useState } from "react";
import { useEventPhotos } from "@/hooks/use-event-photos";
import { Button } from "@/components/ui/button";
import GalleryGrid from "@/components/photos/GalleryGrid";
import LightboxModal from "@/components/photos/LightboxModal";

interface PhotoGalleryProps {
  eventId: string;
  title?: string;
  emptyMessage?: string;
}

export default function PhotoGallery({
  eventId,
  title = "Foto Event",
  emptyMessage = "Belum ada foto untuk event ini.",
}: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const {
    data,
    isPending,
    isError,
    refetch,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useEventPhotos({ eventId });

  const photos = data?.pages.flatMap((page) => page.items) ?? [];
  const isLightboxOpen = selectedIndex !== null;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>

      {isPending ? (
        <div className="columns-2 gap-3 md:columns-3 lg:columns-4 2xl:columns-5">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="mb-3 break-inside-avoid">
              <div
                className="w-full animate-pulse rounded-xl bg-muted"
                style={{
                  aspectRatio: index % 3 === 0 ? "3 / 4" : "4 / 3",
                }}
              />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="space-y-3 rounded-xl border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Gagal memuat foto. Periksa koneksi dan coba kembali.
          </p>

          <Button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            variant="outline"
          >
            {isFetching ? "Memuat..." : "Coba lagi"}
          </Button>
        </div>
      ) : photos.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <>
          <GalleryGrid
            photos={photos}
            title={title}
            onPhotoClick={setSelectedIndex}
          />

          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage || isFetching}
              >
                {isFetchingNextPage ? "Memuat foto..." : "Muat lebih banyak"}
              </Button>
            </div>
          )}

          <LightboxModal
            photos={photos}
            initialIndex={selectedIndex ?? 0}
            isOpen={isLightboxOpen}
            onClose={() => setSelectedIndex(null)}
          />
        </>
      )}
    </section>
  );
}
