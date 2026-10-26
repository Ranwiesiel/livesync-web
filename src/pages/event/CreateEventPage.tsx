
import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";

import { api } from "@/services/api";
import type { ApiResponse, Event } from "@/types/event";

import { Button } from "@/components/ui/button";
import EventFormLayout from "@/components/event/EventFormLayout";
import EventFormField from "@/components/event/EventFormField";
import EventFeedback from "@/components/event/EventFeedback";
import EventResultCard from "@/components/event/EventResultCard";

function generateRoomCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiResponse<Event>>(error)) {
    if (error.response?.status === 409) {
      return "Kode room sudah digunakan. Silakan buat kode baru.";
    }

    return (
      error.response?.data?.error?.message ??
      "Gagal terhubung ke server. Periksa koneksi API."
    );
  }

  return error instanceof Error ? error.message : "Terjadi kesalahan.";
}

export default function CreateEventPage() {
  const [title, setTitle] = useState("");
  const [code, setCode] = useState(generateRoomCode);
  const [createdEvent, setCreatedEvent] = useState<Event | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const createEventMutation = useMutation({
    mutationFn: async (): Promise<Event> => {
      const response = await api.post<ApiResponse<Event>>("/api/events", {
        title: title.trim(),
        code,
      });

      if (!response.data.success || !response.data.data) {
        throw new Error(
          response.data.error?.message ?? "Gagal membuat event."
        );
      }

      return response.data.data;
    },
    onSuccess: (event) => {
      setCreatedEvent(event);
      setErrorMessage("");
    },
    onError: (error: unknown) => {
      setCreatedEvent(null);
      setErrorMessage(getErrorMessage(error));
    },
  });

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreatedEvent(null);
    setErrorMessage("");
    setCopied(false);
    createEventMutation.mutate();
  }

  function handleGenerateCode() {
    setCode(generateRoomCode());
    setCreatedEvent(null);
    setErrorMessage("");
    setCopied(false);
    createEventMutation.reset();
  }

  async function handleCopyCode() {
    if (!createdEvent) return;

    try {
      await navigator.clipboard.writeText(createdEvent.code);
      setCopied(true);
      setErrorMessage("");
    } catch {
      setCopied(false);
      setErrorMessage(
        "Kode tidak dapat disalin. Silakan salin secara manual."
      );
    }
  }

  return (
    <EventFormLayout
      eyebrow="LIVESYNC · EVENT MANAGEMENT"
      title="Buat event baru"
      description="Buat ruang acara dan bagikan kode kepada peserta agar mereka dapat bergabung."
      icon="+"
    >
      <form className="event-form" onSubmit={handleSubmit}>
        <EventFormField
          id="title"
          label="Nama event"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Contoh: Wedding Reception"
          hint="Gunakan nama yang mudah dikenali peserta."
          maxLength={100}
          autoComplete="off"
          required
        />

        <div className="form-field">
          <label className="form-label" htmlFor="code">
            Kode room
          </label>

          <div className="code-control">
            <input
              className="form-input code-control__input"
              id="code"
              type="text"
              value={code}
              readOnly
              aria-label="Kode room yang dibuat otomatis"
            />

            <Button
              type="button"
              variant="outline"
              onClick={handleGenerateCode}
              disabled={createEventMutation.isPending}
            >
              Ganti kode
            </Button>
          </div>

          <span className="form-hint">
            Kode enam digit dibuat secara otomatis.
          </span>
        </div>

        {errorMessage && (
          <EventFeedback type="error">{errorMessage}</EventFeedback>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={!title.trim() || createEventMutation.isPending}
        >
          {createEventMutation.isPending
            ? "Sedang membuat event..."
            : "Buat event"}
        </Button>
      </form>

      {createdEvent && (
        <EventResultCard
          title="Event berhasil dibuat"
          description="Bagikan kode berikut kepada peserta untuk bergabung."
        >
          <div className="room-code">
            <span className="room-code__label">KODE ROOM</span>

            <strong className="room-code__value">
              {createdEvent.code}
            </strong>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleCopyCode}
            >
              {copied ? "Tersalin" : "Salin kode"}
            </Button>
          </div>

          <p className="event-result__event-name">
            {createdEvent.title}
          </p>

          {errorMessage && (
            <EventFeedback type="error">{errorMessage}</EventFeedback>
          )}
        </EventResultCard>
      )}
    </EventFormLayout>
  );
}
