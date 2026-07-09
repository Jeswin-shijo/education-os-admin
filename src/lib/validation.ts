type Validator = (value: string) => string | undefined;

export function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export function isPhone(s: string): boolean {
  return /^[+]?[\d\s-]{7,15}$/.test(s);
}

export function required(message = 'This field is required'): Validator {
  return (value) => (value.trim().length === 0 ? message : undefined);
}

export function minLen(n: number, message?: string): Validator {
  return (value) => (value.trim().length < n ? (message ?? `Must be at least ${n} characters`) : undefined);
}

export function email(message = 'Enter a valid email'): Validator {
  return (value) => (value && !isEmail(value) ? message : undefined);
}

export function phone(message = 'Enter a valid phone number'): Validator {
  return (value) => (value && !isPhone(value) ? message : undefined);
}

export function composeValidators(...validators: Validator[]): Validator {
  return (value) => {
    for (const v of validators) {
      const err = v(value);
      if (err) return err;
    }
    return undefined;
  };
}
