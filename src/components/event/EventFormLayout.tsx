
import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type EventFormLayoutProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
};

export default function EventFormLayout({
  eyebrow,
  title,
  description,
  icon,
  children,
}: EventFormLayoutProps) {
  return (
    <main className="event-page">
      <Card className="event-card">
        <CardHeader className="event-card__header">
          <div className="event-card__icon" aria-hidden="true">
            {icon}
          </div>

          <p className="event-eyebrow">{eyebrow}</p>
          <CardTitle className="event-title">{title}</CardTitle>
          <CardDescription className="event-description">
            {description}
          </CardDescription>
        </CardHeader>

        <CardContent className="event-card__body">
          {children}
        </CardContent>
      </Card>

      <p className="event-page__footer">
        LiveSync · Satu ruang untuk berbagi momen.
      </p>
    </main>
  );
}
