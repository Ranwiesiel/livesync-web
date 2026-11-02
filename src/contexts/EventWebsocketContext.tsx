
import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

import {
  useEventWebSocket,
  type WebSocketStatus,
} from "@/hooks/useEventWebsocket";

interface EventWebSocketContextValue {
  status: WebSocketStatus;
  lastMessage: unknown;
  lastError: string | null;
  sendMessage: (message: unknown) => boolean;
  reconnect: () => void;
}

const EventWebSocketContext =
  createContext<EventWebSocketContextValue | null>(null);

interface EventWebSocketProviderProps {
  eventCode: string;
  children: ReactNode;
}

export function EventWebSocketProvider({
  eventCode,
  children,
}: EventWebSocketProviderProps) {
  const websocket = useEventWebSocket(eventCode);

  return (
    <EventWebSocketContext.Provider value={websocket}>
      {children}
    </EventWebSocketContext.Provider>
  );
}

export function useEventWebSocketContext() {
  const context = useContext(EventWebSocketContext);

  if (!context) {
    throw new Error(
      "useEventWebSocketContext harus digunakan di dalam EventWebSocketProvider"
    );
  }

  return context;
}
