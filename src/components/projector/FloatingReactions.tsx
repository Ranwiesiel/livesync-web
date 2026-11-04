import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import confetti from "canvas-confetti";

import { useEventWebSocketContext } from "@/contexts/EventWebsocketContext";
import "./FloatingReactions.css";

interface ReactionMessage {
  type: string;
  event_id?: string;
  payload?: {
    emoji?: string;
  };
}

interface FloatingEmoji {
  id: number;
  emoji: string;
  left: number;
  duration: number;
  size: number;
  drift: number;
  swayDuration: number;
}

interface FloatingReactionsProps {
  eventId: string;
}

const BURST_THRESHOLD = 5;
const BURST_WINDOW = 1800;

export default function FloatingReactions({
  eventId,
}: FloatingReactionsProps) {
  const { lastMessage } = useEventWebSocketContext();

  const [emojis, setEmojis] = useState<FloatingEmoji[]>([]);

  const nextIdRef = useRef(0);
  const recentReactionsRef = useRef<number[]>([]);

  useEffect(() => {
    if (!lastMessage) return;

    const message = lastMessage as ReactionMessage;

    if (message.type !== "LIVE_REACTION") return;

    if (message.event_id && message.event_id !== eventId) return;

    const emoji = message.payload?.emoji;

    if (!emoji) return;

    const id = ++nextIdRef.current;

    // Buat emoji dengan variasi posisi dan gerakan.
    const newEmoji: FloatingEmoji = {
      id,
      emoji,
      left: 5 + Math.random() * 90,
      duration: 4 + Math.random() * 2.5,
      size: 32 + Math.random() * 28,
      drift: -40 + Math.random() * 80,
      swayDuration: 1.5 + Math.random() * 2,
    };

    setEmojis((previous) => [...previous, newEmoji]);

    // Deteksi spam reaksi.
    const now = Date.now();

    recentReactionsRef.current = [
      ...recentReactionsRef.current.filter(
        (timestamp) => now - timestamp < BURST_WINDOW,
      ),
      now,
    ];

    if (recentReactionsRef.current.length >= BURST_THRESHOLD) {
      recentReactionsRef.current = [];

      // Ledakan confetti pertama.
      void confetti({
        particleCount: 70,
        spread: 80,
        startVelocity: 45,
        gravity: 0.9,
        decay: 0.92,
        ticks: 180,
        origin: {
          x: 0.5,
          y: 0.65,
        },
        scalar: 1.1,
        zIndex: 40,
        disableForReducedMotion: true,
      });

      // Ledakan kedua dengan arah lebih lebar.
      window.setTimeout(() => {
        void confetti({
          particleCount: 45,
          spread: 120,
          startVelocity: 30,
          gravity: 1,
          decay: 0.94,
          ticks: 150,
          origin: {
            x: 0.5,
            y: 0.65,
          },
          scalar: 0.85,
          zIndex: 40,
          disableForReducedMotion: true,
        });
      }, 180);
    }
  }, [lastMessage, eventId]);

  return (
    <div className="floating-reactions-layer" aria-hidden="true">
      {emojis.map((item) => (
        <span
          key={item.id}
          className="floating-reaction-emoji"
          style={
            {
              left: `${item.left}%`,
              "--reaction-duration": `${item.duration}s`,
            } as CSSProperties
          }
          onAnimationEnd={() => {
            setEmojis((previous) =>
              previous.filter((emoji) => emoji.id !== item.id),
            );
          }}
        >
          <span
            className="floating-reaction-inner"
            style={
              {
                fontSize: `${item.size}px`,
                "--reaction-drift": `${item.drift}px`,
                "--sway-duration": `${item.swayDuration}s`,
              } as CSSProperties
            }
          >
            {item.emoji}
          </span>
        </span>
      ))}
    </div>
  );
}
