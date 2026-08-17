import { Pipe, PipeTransform } from '@angular/core';
import { ValidationErrors } from '@angular/forms';

/**
 * Translates a control's raw `ValidationErrors` object into a single
 * human-readable message, so templates stay declarative:
 *   {{ form.get('Email')?.errors | fieldError }}
 */
@Pipe({ name: 'fieldError', standalone: true, pure: true })
export class FieldErrorPipe implements PipeTransform {
  private static readonly MESSAGES: Record<string, string> = {
    required: 'This field is required.',
    email: 'Enter a valid email address.',
    mobilePattern: 'Enter a valid mobile number.',
    futureDate: 'Date cannot be in the future.',
    minlength: 'Value is too short.',
    maxlength: 'Value is too long.',
  };

  transform(errors: ValidationErrors | null | undefined): string {
    if (!errors) return '';
    const key = Object.keys(errors)[0];
    if (key === 'alphaNumeric') {
      const minLength = errors[key]?.minLength ?? 3;
      return `Use letters, numbers or dashes (min ${minLength} characters).`;
    }
    if (key === 'atLeastOneRequired') {
      return 'Provide at least one contact detail.';
    }
    if (key === 'minlength') {
      const req = errors[key]?.requiredLength;
      return `Must be at least ${req} characters.`;
    }
    return FieldErrorPipe.MESSAGES[key] ?? 'Invalid value.';
  }
}
