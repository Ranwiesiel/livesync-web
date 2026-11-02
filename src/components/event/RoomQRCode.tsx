import { QRCodeSVG } from "qrcode.react";

import { cn } from "@/lib/utils";

interface RoomQRCodeProps {
  /** URL join event yang dienkode ke dalam QR, mis. https://domain.com/events/join?code=123456 */
  url: string;
  /** Kode room yang ditampilkan di bawah QR. */
  code?: string;
  /** Keterangan singkat; diubah ke huruf kapital oleh CSS. */
  caption?: string;
  /** Ukuran QR dalam piksel. */
  size?: number;
  className?: string;
}

/**
 * Kartu QR untuk bergabung ke room event.
 * Latar selalu putih agar QR tetap kontras di layar proyektor maupun pop-up.
 */
export default function RoomQRCode({
  url,
  code,
  caption = "Scan untuk bergabung",
  size = 144,
  className,
}: RoomQRCodeProps) {
  if (!url) return null;

  const title = code
    ? `QR bergabung ke room ${code}`
    : "QR bergabung ke room event";

  return (
    <div
      className={cn(
        "inline-flex flex-col items-center gap-2 rounded-2xl bg-white p-3 text-center shadow-sm",
        className,
      )}
    >
      <QRCodeSVG
        value={url}
        size={size}
        level="M"
        marginSize={2}
        bgColor="#ffffff"
        fgColor="#111111"
        title={title}
        aria-label={title}
        className="h-auto max-w-full"
      />

      {code && (
        <p className="font-mono text-lg font-bold tracking-[0.2em] text-neutral-900">
          {code}
        </p>
      )}

      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500">
        {caption}
      </p>
    </div>
  );
}
