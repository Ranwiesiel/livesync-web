
import type { ReactNode } from "react";

type EventFeedbackProps = {
  type: "success" | "error" | "info";
  children: ReactNode;
};

export default function EventFeedback({
  type,
  children,
}: EventFeedbackProps) {
  return (
    <div
      className={`event-message event-message--${type}`}
      role={type === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
