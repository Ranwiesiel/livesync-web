
import type { ReactNode } from "react";

type EventResultCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export default function EventResultCard({
  title,
  description,
  children,
}: EventResultCardProps) {
  return (
    <section
      className="event-result"
      aria-live="polite"
      aria-labelledby="event-result-title"
    >
      <div className="event-result__icon" aria-hidden="true">
        ✓
      </div>

      <h2 id="event-result-title" className="event-result__title">
        {title}
      </h2>

      {description && (
        <p className="event-result__description">{description}</p>
      )}

      <div className="event-result__content">{children}</div>
    </section>
  );
}
