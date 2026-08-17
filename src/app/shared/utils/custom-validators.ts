import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Egyptian-style mobile numbers (also accepts a leading +country code),
 * e.g. +201056988475 or 01056988475.
 */
export function mobilePatternValidator(): ValidatorFn {
  const pattern = /^(\+?\d{1,3})?0?\d{10}$/;
  return (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value ?? '').toString().trim();
    if (!value) return null;
    return pattern.test(value) ? null : { mobilePattern: true };
  };
}

/** Rejects a birth date that is in the future. */
export function notInFutureValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const date = new Date(control.value);
    return date.getTime() > Date.now() ? { futureDate: true } : null;
  };
}

/** Alphanumeric registration-style codes (VAT / commercial registration / SWIFT). */
export function alphaNumericValidator(minLength = 3): ValidatorFn {
  const pattern = new RegExp(`^[A-Za-z0-9-]{${minLength},}$`);
  return (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value ?? '').toString().trim();
    if (!value) return null;
    return pattern.test(value) ? null : { alphaNumeric: { minLength } };
  };
}

/** Cross-field validator: at least one of the given control names must be filled in. */
export function atLeastOneOf(controlNames: string[]): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const hasValue = controlNames.some((name) => {
      const value = group.get(name)?.value;
      return value !== null && value !== undefined && String(value).trim() !== '';
    });
    return hasValue ? null : { atLeastOneRequired: { fields: controlNames } };
  };
}
