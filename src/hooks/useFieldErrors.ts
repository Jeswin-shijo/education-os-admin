import { useState } from 'react';

export type FieldErrors<K extends string = string> = Partial<Record<K, string>>;

/**
 * Per-field form validation state. Forms build a `{ field: message }` object in
 * their validate step and pass each message to the matching input's `error`
 * prop, so messages render inline under the field instead of in a top banner.
 */
export function useFieldErrors<K extends string = string>() {
  const [errors, setErrors] = useState<FieldErrors<K>>({});
  return {
    errors,
    /** Replace the whole error set (from a validate() run). */
    setErrors,
    /** Clear one field's error — call from an input's onChange. */
    clearError: (field: K) =>
      setErrors((e) => (e[field] === undefined ? e : { ...e, [field]: undefined })),
    /** Clear everything (e.g. when opening/closing a modal). */
    resetErrors: () => setErrors({}),
  };
}
