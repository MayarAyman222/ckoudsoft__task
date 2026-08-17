import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';

import { COUNTRY_OPTIONS } from '../../../../core/constants/lookups.constant';
import { FieldErrorPipe } from '../../../../shared/pipes/field-error.pipe';
import { CustomerForm } from '../customer-form.factory';


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
