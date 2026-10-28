
import { useEventPhotos } from "@/hooks/use-event-photos";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PhotoGalleryProps {
  eventId: string;
  title?: string;
  emptyMessage?: string;
  columns?: 2 | 3 | 4 | 5;
}

const columnClasses = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
};

export default function PhotoGallery({
  eventId,
  title = "Foto Event",
  emptyMessage = "Belum ada foto untuk event ini.",
  columns = 4,
}: PhotoGalleryProps) {
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

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>

      {isPending ? (
        <div className={`grid ${columnClasses[columns]} gap-3`}>
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="aspect-square animate-pulse rounded-xl bg-muted"
            />
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
          <p className="text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        </div>
      ) : (
        <>
          <div className={`grid ${columnClasses[columns]} gap-3`}>
            {photos.map((photo) => (
              <Card key={photo.id} className="overflow-hidden p-0">
                <img
                  src={photo.thumbnail_url || photo.url}
                  alt={`Foto event ${title}`}
                  loading="lazy"
                  className="aspect-square w-full object-cover transition-transform duration-200 hover:scale-105"
                />
              </Card>
            ))}
          </div>

          {hasNextPage && (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage
                  ? "Memuat foto..."
                  : "Muat lebih banyak"}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
