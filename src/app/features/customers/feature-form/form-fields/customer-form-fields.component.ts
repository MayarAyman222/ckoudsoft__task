import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';

import { COUNTRY_OPTIONS } from '../../../../core/constants/lookups.constant';
import { FieldErrorPipe } from '../../../../shared/pipes/field-error.pipe';
import { CustomerForm } from '../customer-form.factory';

/**
 * Pure presentation component: renders the Customer field grid against a
 * FormGroup it is handed. Has zero knowledge of routing, HTTP, or dialogs -
 * it is reused as-is by the full-page CustomerFormComponent (deep-linkable
 * /customers/:id/edit) and by CustomerEditDialogComponent (the modal flow
 * that matches the assessment's screenshots), so the field markup and
 * validation messages only exist in one place.
 */
@Component({
  selector: 'app-customer-form-fields',
  standalone: true,
  imports: [ReactiveFormsModule, InputTextModule, CalendarModule, DropdownModule, FieldErrorPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customer-form-fields.component.html',
  styleUrl: './customer-form-fields.component.scss',
})
export class CustomerFormFieldsComponent {
  readonly form = input.required<CustomerForm>();
  readonly viewMode = input(false);

  protected readonly countryOptions = COUNTRY_OPTIONS;
}
