
import { useCallback, useEffect, useRef, useState } from "react";

export type WebSocketStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

interface UseEventWebSocketReturn {
  status: WebSocketStatus;
  lastMessage: unknown;
  lastError: string | null;
  sendMessage: (message: unknown) => boolean;
  reconnect: () => void;
}

const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

export function useEventWebSocket(
  eventCode: string
): UseEventWebSocketReturn {
  const socketRef = useRef<WebSocket | null>(null);

  const reconnectTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(false);

  // Menandai bahwa reconnect diminta secara manual.
  const reconnectImmediatelyRef = useRef(false);

  const [status, setStatus] =
    useState<WebSocketStatus>("connecting");

  const [lastMessage, setLastMessage] = useState<unknown>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  // ==========================================
  // Membersihkan timer reconnect
  // ==========================================

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  // ==========================================
  // Membuat koneksi WebSocket
  // ==========================================

  const connect = useCallback(() => {
    if (!eventCode || !shouldReconnectRef.current) {
      return;
    }

    const currentSocket = socketRef.current;

    // Jangan membuat koneksi baru jika socket lama
    // masih CONNECTING, OPEN, atau CLOSING.
    if (currentSocket) {
      if (currentSocket.readyState !== WebSocket.CLOSED) {
        return;
      }

      socketRef.current = null;
    }

    clearReconnectTimer();

    const wsBaseUrl = import.meta.env.VITE_WS_URL;

    if (!wsBaseUrl) {
      setLastError("VITE_WS_URL belum dikonfigurasi.");
      setStatus("disconnected");
      return;
    }

    const wsUrl =
      `${wsBaseUrl.replace(/\/+$/, "")}/ws/events/` +
      encodeURIComponent(eventCode);

    setStatus(
      reconnectAttemptsRef.current === 0
        ? "connecting"
        : "reconnecting"
    );

    try {
      const socket = new WebSocket(wsUrl);

      // Simpan socket yang baru dibuat.
      socketRef.current = socket;

      // --------------------------------------
      // WebSocket berhasil terhubung
      // --------------------------------------

      socket.onopen = () => {
        // Abaikan callback dari socket lama.
        if (socketRef.current !== socket) return;

        if (!shouldReconnectRef.current) {
          socket.close();
          return;
        }

        reconnectAttemptsRef.current = 0;
        reconnectImmediatelyRef.current = false;

        setStatus("connected");
        setLastError(null);
      };

      // --------------------------------------
      // Menerima pesan dari server
      // --------------------------------------

      socket.onmessage = (event: MessageEvent) => {
        if (socketRef.current !== socket) return;

        try {
          setLastMessage(JSON.parse(event.data));
        } catch {
          setLastMessage(event.data);
        }
      };

      // --------------------------------------
      // Terjadi kesalahan koneksi
      // --------------------------------------

      socket.onerror = () => {
        if (socketRef.current !== socket) return;

        setLastError(
          "Terjadi kesalahan pada koneksi WebSocket."
        );

        // Biarkan onclose menangani reconnect.
      };

      // --------------------------------------
      // Koneksi terputus
      // --------------------------------------

      socket.onclose = () => {
        // Abaikan callback dari socket lama.
        if (socketRef.current !== socket) return;

        socketRef.current = null;

        if (!shouldReconnectRef.current) {
          setStatus("disconnected");
          return;
        }

        // Jika pengguna meminta reconnect manual,
        // langsung buat koneksi baru setelah socket lama
        // benar-benar ditutup.
        if (reconnectImmediatelyRef.current) {
          reconnectImmediatelyRef.current = false;
          reconnectAttemptsRef.current = 0;

          connect();
          return;
        }

        // Reconnect otomatis menggunakan exponential backoff.
        scheduleReconnect();
      };
    } catch {
      setLastError("Gagal membuat koneksi WebSocket.");

      scheduleReconnect();
    }
  }, [eventCode, clearReconnectTimer]);

  // ==========================================
  // Menjadwalkan reconnect otomatis
  // ==========================================

  const scheduleReconnect = useCallback(() => {
    if (!shouldReconnectRef.current) return;

    // Pastikan hanya ada satu timer reconnect.
    clearReconnectTimer();

    const delay = Math.min(
      INITIAL_RECONNECT_DELAY *
        2 ** reconnectAttemptsRef.current,
      MAX_RECONNECT_DELAY
    );

    reconnectAttemptsRef.current += 1;

    setStatus("reconnecting");

    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;

      if (!shouldReconnectRef.current) return;

      connect();
    }, delay);
  }, [clearReconnectTimer, connect]);

  // ==========================================
  // Reconnect manual
  // ==========================================

  const reconnect = useCallback(() => {
    if (!shouldReconnectRef.current) return;

    clearReconnectTimer();

    // Reset perhitungan exponential backoff.
    reconnectAttemptsRef.current = 0;

    const currentSocket = socketRef.current;

    if (currentSocket) {
      if (currentSocket.readyState !== WebSocket.CLOSED) {
        // Tunggu onclose sebelum membuat socket baru.
        reconnectImmediatelyRef.current = true;

        setStatus("reconnecting");

        currentSocket.close(1000, "Reconnect requested");
        return;
      }

      socketRef.current = null;
    }

    // Tidak ada socket aktif, langsung hubungkan.
    reconnectImmediatelyRef.current = false;
    connect();
  }, [clearReconnectTimer, connect]);

  // ==========================================
  // Mengirim pesan ke server
  // ==========================================

  const sendMessage = useCallback(
    (message: unknown): boolean => {
      const socket = socketRef.current;

      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return false;
      }

      try {
        socket.send(JSON.stringify(message));
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  // ==========================================
  // Lifecycle koneksi
  // ==========================================

  useEffect(() => {
    shouldReconnectRef.current = true;
    reconnectImmediatelyRef.current = false;
    reconnectAttemptsRef.current = 0;

    connect();

    // Jika koneksi internet kembali tersedia,
    // coba hubungkan kembali tanpa menunggu timer.
    const handleOnline = () => {
      const socket = socketRef.current;

      if (
        !socket ||
        socket.readyState === WebSocket.CLOSED
      ) {
        reconnect();
      }
    };

    window.addEventListener("online", handleOnline);

    return () => {
      shouldReconnectRef.current = false;
      reconnectImmediatelyRef.current = false;

      window.removeEventListener("online", handleOnline);

      clearReconnectTimer();

      const socket = socketRef.current;

      // Lepaskan referensi terlebih dahulu agar callback
      // dari socket lama tidak mengubah state.
      socketRef.current = null;

      if (socket && socket.readyState !== WebSocket.CLOSED) {
        socket.close(1000, "Component unmounted");
      }
    };
  }, [connect, reconnect, clearReconnectTimer]);

  return {
    status,
    lastMessage,
    lastError,
    sendMessage,
    reconnect,
  };
}