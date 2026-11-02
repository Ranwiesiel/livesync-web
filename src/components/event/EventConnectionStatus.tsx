
import { useEventWebSocketContext } from "@/contexts/EventWebsocketContext";

export default function EventConnectionStatus() {
  const { status, lastError, reconnect } =
    useEventWebSocketContext();

  const statusConfig = {
    connecting: {
      label: "Menghubungkan ke server...",
      color: "bg-yellow-500",
    },
    connected: {
      label: "Terhubung secara realtime",
      color: "bg-green-500",
    },
    reconnecting: {
      label: "Koneksi terputus, mencoba menghubungkan ulang...",
      color: "bg-yellow-500",
    },
    disconnected: {
      label: "Tidak terhubung",
      color: "bg-red-500",
    },
  };

  const currentStatus = statusConfig[status];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${currentStatus.color}`}
        />

        <span className="text-sm text-muted-foreground">
          {currentStatus.label}
        </span>
      </div>

      {status === "disconnected" && (
        <button
          type="button"
          onClick={reconnect}
          className="text-sm font-medium underline underline-offset-4"
        >
          Coba lagi
        </button>
      )}

      {lastError && (
        <p className="w-full text-xs text-destructive">
          {lastError}
        </p>
      )}
    </div>
  );
}