"use client";

import { useState } from "react";

interface NumericInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  // Value committed if the field is left empty/invalid on blur.
  fallback?: number;
}

// A plain `<input type="number">` bound straight to a numeric useState
// (`onChange={(e) => setX(Number(e.target.value) || fallback)}`) forces a
// value on every keystroke, so clearing "1" to type "6" round-trips through
// the fallback and the field can never sit empty long enough to retype --
// you end up typing "6" before the "1" and deleting the "1" after.
// This keeps its own string buffer so the field can go empty mid-edit, and
// only clamps/commits a final numeric value on blur.
export function NumericInput({
  value,
  onChange,
  min,
  max,
  fallback = 0,
  onBlur,
  ...rest
}: NumericInputProps) {
  const [text, setText] = useState(String(value));
  // Re-sync the text buffer only when the *numeric* value changes from
  // outside (e.g. a sibling field recalculating this one) -- comparing
  // numbers, not strings, so committing "6" doesn't clobber "6.0" mid-typing
  // just because they're numerically equal.
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    setText(String(value));
  }

  return (
    <input
      {...rest}
      type="number"
      min={min}
      max={max}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const parsed = Number(e.target.value);
        if (e.target.value.trim() !== "" && Number.isFinite(parsed)) {
          onChange(parsed);
        }
      }}
      onBlur={(e) => {
        let parsed = Number(e.target.value);
        if (e.target.value.trim() === "" || !Number.isFinite(parsed)) {
          parsed = fallback;
        }
        if (min !== undefined) parsed = Math.max(min, parsed);
        if (max !== undefined) parsed = Math.min(max, parsed);
        setText(String(parsed));
        setSynced(parsed);
        onChange(parsed);
        onBlur?.(e);
      }}
    />
  );
}
