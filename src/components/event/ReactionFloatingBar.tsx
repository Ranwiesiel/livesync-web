
import { useCallback } from "react";
import { useEventWebSocketContext } from "@/contexts/EventWebsocketContext";

const REACTIONS = [
  { emoji: "❤️", label: "Love" },
  { emoji: "🔥", label: "Fire" },
  { emoji: "🎉", label: "Party" },
  { emoji: "👏", label: "Clap" },
] as const;

export default function ReactionFloatingBar() {
  const context = useEventWebSocketContext();

  const { sendMessage, status } = context;

  const handleReaction = useCallback(
    (emoji: string) => {
      console.log("[Reaction] Tombol diklik:", emoji);

      console.log("[Reaction] Status WebSocket:", status);

      console.log(
        "[Reaction] Tipe sendMessage:",
        typeof sendMessage
      );

      if (typeof sendMessage !== "function") {
        console.error(
          "[Reaction] sendMessage tidak tersedia dari context."
        );
        return;
      }

      const success = sendMessage({
        type: "SEND_REACTION",
        emoji,
      });

      console.log("[Reaction] Hasil pengiriman:", success);

      if (!success) {
        console.warn("[Reaction] Gagal mengirim:", emoji);
        return;
      }

      console.log("[Reaction] Berhasil dikirim:", emoji);

      if (typeof navigator.vibrate === "function") {
        navigator.vibrate(50);
      }
    },
    [sendMessage, status]
  );

  if (status !== "connected") return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] md:hidden">
      <div className="mx-auto flex max-w-sm items-center justify-around gap-3 rounded-full border border-white/20 bg-white/90 p-3 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/90">
        {REACTIONS.map(({ emoji, label }) => (
          <button
            key={label}
            type="button"
            aria-label={`Kirim reaksi ${label}`}
            title={label}
            onClick={() => handleReaction(emoji)}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-2xl transition-transform duration-150 hover:scale-110 active:scale-90 dark:bg-zinc-800"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
