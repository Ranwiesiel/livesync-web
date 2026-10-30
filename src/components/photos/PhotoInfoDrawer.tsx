import { X } from "lucide-react";

import type { Photo, PhotoExif } from "@/types/photo";

interface PhotoInfoDrawerProps {
  photo: Photo;
  isOpen: boolean;
  onClose: () => void;
}

interface InfoRow {
  label: string;
  value: string;
}

/** Membersihkan nilai EXIF dari tanda kutip dan karakter null bawaan library. */
function clean(value?: string | number): string {
  if (value === undefined || value === null) return "";

  return String(value)
    .split(String.fromCharCode(0))
    .join("")
    .replace(/^"|"$/g, "")
    .trim();
}

/** Menggabungkan produsen dan model kamera tanpa pengulangan. */
function cameraName(exif?: PhotoExif): string {
  const make = clean(exif?.camera_make);
  const model = clean(exif?.camera_model);

  if (!make) return model;
  if (!model) return make;

  return model.toLowerCase().includes(make.toLowerCase())
    ? model
    : `${make} ${model}`;
}

/** "2014:09:01 15:03:47" -> "1 September 2014, 15.03". */
function formatTakenAt(value?: string): string {
  const raw = clean(value);

  if (!raw) return "";

  const match = raw.match(
    /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/,
  );

  if (!match) return raw;

  const [, year, month, day, hour, minute] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );

  if (Number.isNaN(date.getTime())) return raw;

  return `${new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)}, ${hour}.${minute}`;
}

function formatAperture(value?: number): string {
  if (value === undefined || value === null || value <= 0) return "";

  return `f/${Number(value.toFixed(1))}`;
}

/** Nilai ExposureTime bisa berupa "1/250" atau "0.004" — tampilkan yang mudah dibaca. */
function formatShutterSpeed(value?: string): string {
  const raw = clean(value);

  if (!raw) return "";

  // Nilai rasional seperti "1/120" sudah dalam bentuk yang paling mudah dibaca.
  if (/^\d+(?:\.\d+)?\/\d+$/.test(raw)) return `${raw} s`;

  const seconds = Number(raw);

  if (!Number.isFinite(seconds) || seconds <= 0) return raw;

  if (seconds >= 1) return `${Number(seconds.toFixed(1))} s`;

  const denominator = Math.round(1 / seconds);

  return denominator > 1 ? `1/${denominator} s` : `${seconds} s`;
}

function formatSettings(exif?: PhotoExif): string {
  const parts = [
    exif?.iso ? `ISO ${exif.iso}` : "",
    formatAperture(exif?.aperture),
    formatShutterSpeed(exif?.shutter_speed),
  ].filter(Boolean);

  return parts.join(" · ");
}

/**
 * Drawer kecil berisi metadata EXIF yang diekstrak backend saat foto diproses.
 * Uploader tetap ditampilkan walaupun foto tidak memiliki data kamera.
 */
export default function PhotoInfoDrawer({
  photo,
  isOpen,
  onClose,
}: PhotoInfoDrawerProps) {
  if (!isOpen) return null;

  const exif = photo.exif;
  const camera = cameraName(exif);
  const takenAt = formatTakenAt(exif?.date_time_original);
  const settings = formatSettings(exif);

  const rows: InfoRow[] = [
    {
      label: "Kamera",
      value: camera || "No Camera Data",
    },
    { label: "Lensa", value: clean(exif?.lens_model) || "—" },
    { label: "Diambil", value: takenAt || "—" },
    { label: "Pengaturan", value: settings || "—" },
    { label: "Diunggah oleh", value: clean(photo.uploader) || "Anonim" },
  ];

  return (
    <div
      data-testid="photo-info-backdrop"
      className="absolute inset-0 z-30"
      onClick={(event) => {
        // Jangan teruskan klik ke lightbox — cukup tutup drawer-nya.
        event.stopPropagation();
        onClose();
      }}
    >
      <div
        id="photo-info-drawer"
        role="dialog"
        aria-label="Info foto"
        className="absolute inset-y-0 right-0 flex w-full max-w-xs flex-col border-l border-white/15 bg-neutral-950/95 text-white shadow-2xl backdrop-blur"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold tracking-wide">Info Foto</h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup info foto"
            className="flex size-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <dl className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm">
          {rows.map((row) => (
            <div key={row.label}>
              <dt className="text-xs uppercase tracking-wide text-white/50">
                {row.label}
              </dt>
              <dd
                className={
                  row.value === "No Camera Data"
                    ? "mt-1 text-white/60 italic"
                    : "mt-1 break-words text-white/90"
                }
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
