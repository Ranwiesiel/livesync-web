
import type { InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";

type EventFormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export default function EventFormField({
  id,
  label,
  hint,
  error,
  className = "",
  ...props
}: EventFormFieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div className="form-field">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>

      <Input
        {...props}
        id={id}
        className={`form-input ${className}`.trim()}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error ? errorId : hint ? hintId : undefined
        }
      />

      {error ? (
        <span id={errorId} className="form-error">
          {error}
        </span>
      ) : hint ? (
        <span id={hintId} className="form-hint">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
