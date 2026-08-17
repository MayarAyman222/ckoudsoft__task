import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { finalize } from 'rxjs';

import { CustomerService } from '../../../core/services/customer.service';
import { Customer } from '../../../core/models/customer.model';
import { FieldErrorPipe } from '../../../shared/pipes/field-error.pipe';
import {
  CustomerForm,
  buildCustomerForm,
  toApiPayload,
  toFormValue,
} from './customer-form.factory';

/**
 * Embeddable Create/Edit/View form for a Customer.
 * Deliberately has no knowledge of routing or dialogs — the host (a p-dialog
 * in CustomerListComponent, in this app) decides how it's presented. This
 * keeps the form reusable as a full page, a modal, or a drawer without any
 * change to this component.
 */
@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    CalendarModule,
    DropdownModule,
    FieldErrorPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customer-form.component.html',
  styleUrl: './customer-form.component.scss',
})
export class CustomerFormComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly customerService = inject(CustomerService);
  private readonly messageService = inject(MessageService);

  /** Null/undefined = create mode. */
  @Input() customerId: number | null = null;
  @Input() customer: Customer | null = null;
  @Input() viewMode = false;

  @Output() saved = new EventEmitter<Customer>();
  @Output() cancelled = new EventEmitter<void>();

  protected readonly form: CustomerForm = buildCustomerForm(this.fb);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);

  protected readonly countryOptions = [
    { label: 'Egypt', value: 1 },
    { label: 'Saudi Arabia', value: 2 },
    { label: 'United Arab Emirates', value: 3 },
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['customerId'] || changes['customer']) {
      this.form.reset();
      if (this.customer) {
        this.form.patchValue(toFormValue(this.customer));
        this.loading.set(false);
      } else if (this.customerId) {
        this.loadCustomer(this.customerId);
      }
    }
    if (changes['viewMode'] || changes['customerId'] || changes['customer']) {
      this.viewMode ? this.form.disable({ emitEvent: false }) : this.form.enable({ emitEvent: false });
    }
  }

  private loadCustomer(id: number): void {
    this.loading.set(true);
    // The staging API only exposes ReadAllCRMClients (no read-by-id), so we
    // fetch a single-row page filtered by Id and hydrate the form from it.
    this.customerService
      .getCustomers({
        text: '',
        searchFields: ['Id'],
        direction: 'ltr',
        pageIndex: 0,
        pageSize: 1,
        sortField: null,
        sortOrder: null,
        columnFilters: { Id: String(id) },
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result) => {
          const customer = result.items[0];
          if (customer) {
            this.form.patchValue(toFormValue(customer));
          }
          if (this.viewMode) {
            this.form.disable({ emitEvent: false });
          }
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Load failed',
            detail: 'Could not load this customer.',
          });
        },
      });
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Check the form',
        detail: 'Some fields need your attention before saving.',
      });
      return;
    }

    this.saving.set(true);
    const payload = toApiPayload(this.form.getRawValue());

    this.customerService
      .saveCustomer(payload)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (savedCustomer) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Saved',
            detail: 'Customer details were saved successfully.',
          });
          this.saved.emit(savedCustomer);
        },
        error: () => {
          // The error interceptor already surfaces a toast; nothing else to do here.
        },
      });
  }

  protected cancel(): void {
    this.cancelled.emit();
  }
}
