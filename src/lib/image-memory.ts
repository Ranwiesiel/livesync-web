/**
 * Piksel transparan 1x1. Dipakai untuk memutus referensi gambar besar
 * sebelum elemen <img> dilepas dari DOM, supaya bitmap hasil decode
 * bisa segera dibebaskan browser.
 */
export const TRANSPARENT_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

/** Melepas resource gambar yang sudah tidak ditampilkan dari memori. */
export function releaseImage(image: HTMLImageElement | null): void {
  if (!image) return;

  image.removeAttribute("srcset");
  image.removeAttribute("sizes");

  if (image.getAttribute("src") !== TRANSPARENT_PIXEL) {
    image.src = TRANSPARENT_PIXEL;
  }
}
