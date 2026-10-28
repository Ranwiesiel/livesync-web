
import { useEffect, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import { api } from "@/services/api";
import type { ApiResponse, Event } from "@/types/event";

import { Button } from "@/components/ui/button";
import EventFormLayout from "@/components/event/EventFormLayout";
import EventFormField from "@/components/event/EventFormField";
import EventFeedback from "@/components/event/EventFeedback";

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiResponse<never>>(error)) {
    if (error.response?.status === 404) {
      return "Event tidak ditemukan. Periksa kembali PIN yang dimasukkan.";
    }

    return (
      error.response?.data?.error?.message ??
      "Gagal terhubung ke server. Periksa koneksi API."
    );
  }

  return error instanceof Error
    ? error.message
    : "Terjadi kesalahan.";
}

export default function JoinEventPage() {
  const [code, setCode] = useState("");
  const [submittedCode, setSubmittedCode] = useState("");
  const navigate = useNavigate();

  const eventQuery = useQuery({
    queryKey: ["event", submittedCode],
    queryFn: async (): Promise<Event> => {
      const response = await api.get<ApiResponse<Event>>(
        `/api/events/${encodeURIComponent(submittedCode)}`
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(
          response.data.error?.message ?? "Event tidak ditemukan."
        );
      }

      return response.data.data;
    },
    enabled: /^\d{6}$/.test(submittedCode),
    retry: false,
  });

  const foundEvent =
    eventQuery.data && submittedCode === code
      ? eventQuery.data
      : null;

  useEffect(() => {
    if (foundEvent?.is_active) {
      navigate(`/events/detail/${encodeURIComponent(foundEvent.code)}`, {
        replace: true,
      });
    }
  }, [foundEvent, navigate]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const normalizedCode = code.trim();

    if (!/^\d{6}$/.test(normalizedCode) || eventQuery.isFetching) {
      return;
    }

    if (normalizedCode === submittedCode) {
      void eventQuery.refetch();
      return;
    }

    setSubmittedCode(normalizedCode);
  }

  function handleCodeChange(value: string) {
    const normalizedCode = value.replace(/\D/g, "").slice(0, 6);

    setCode(normalizedCode);

    if (normalizedCode !== submittedCode) {
      setSubmittedCode("");
    }
  }

  return (
    <EventFormLayout
      eyebrow="LIVESYNC · JOIN EVENT"
      title="Gabung ke event"
      description="Masukkan PIN enam digit dari penyelenggara untuk menemukan event."
      icon="↗"
    >
      <form className="event-form" onSubmit={handleSubmit}>
        <EventFormField
          id="code"
          label="PIN event"
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          minLength={6}
          maxLength={6}
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          placeholder="123456"
          hint="Masukkan enam angka sesuai kode dari penyelenggara."
          autoComplete="one-time-code"
          className="room-code-input"
          required
        />

        {eventQuery.isError && submittedCode === code && (
          <EventFeedback type="error">
            {getErrorMessage(eventQuery.error)}
          </EventFeedback>
        )}

        {foundEvent && !foundEvent.is_active && (
          <EventFeedback type="info">
            Event ini sedang tidak aktif dan belum dapat diikuti.
          </EventFeedback>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={code.length !== 6 || eventQuery.isFetching}
        >
          {eventQuery.isFetching ? "Mencari event..." : "Gabung event"}
        </Button>
      </form>
    </EventFormLayout>
  );
}
