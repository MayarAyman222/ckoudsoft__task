import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { finalize } from 'rxjs';

import { Customer } from '../../../../../core/models/customer.model';
import { CustomerService } from '../../../../../core/services/customer.service';
import { CustomerFormFieldsComponent } from '../../../feature-form/form-fields/customer-form-fields.component';
import {
  CustomerForm,
  buildCustomerForm,
  toApiPayload,
  toFormValue,
} from '../../../feature-form/customer-form.factory';

export type CustomerDialogMode = 'add' | 'edit' | 'view';

/**
 * The primary interaction the assessment's screenshots show: clicking
 * "+ Add Customer" or a row's "Edit"/"View" action opens this as an overlay
 * on top of the (dimmed) customer list, rather than navigating to a new
 * page. Saving/closing re-emits control to the list, which reloads the
 * current page via the store.
 *
 * Deep-linkable routes (`/customers/new`, `/customers/:id/edit`) still exist
 * separately in `feature-form/` for direct links / bookmarking / sharing a
 * URL to a specific record — both share the same `CustomerFormFieldsComponent`
 * and `customer-form.factory.ts` so validation/mapping logic lives in one place.
 */
@Component({
  selector: 'app-customer-edit-dialog',
  standalone: true,
  imports: [DialogModule, ButtonModule, CustomerFormFieldsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [visible]="visible()"
      (visibleChange)="onVisibleChange($event)"
      [modal]="true"
      [style]="{ width: '860px' }"
      [breakpoints]="{ '960px': '92vw' }"
      [header]="title()"
      [closable]="true"
      [dismissableMask]="false"
    >
      @if (loading()) {
        <div class="dialog-loading">
          <i class="pi pi-spin pi-spinner"></i>
          <span>Loading customer...</span>
        </div>
      } @else {
        <app-customer-form-fields [form]="form" [viewMode]="mode() === 'view'" />
      }

      <ng-template pTemplate="footer">
        @if (mode() === 'view') {
          <button pButton type="button" label="Close" class="p-button-outlined" (click)="close()"></button>
        } @else {
          <button pButton type="button" label="Cancel" class="p-button-outlined" (click)="close()"></button>
          <button
            pButton
            type="button"
            [label]="saving() ? 'Saving...' : 'Save'"
            [icon]="saving() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"
            [disabled]="saving() || loading()"
            (click)="save()"
          ></button>
        }
      </ng-template>
    </p-dialog>
  `,
  styles: [
    `
      .dialog-loading {
        display: flex;
        align-items: center;
        gap: 8px;
        justify-content: center;
        padding: 60px 0;
        color: #64748b;
      }
    `,
  ],
})
export class CustomerEditDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly customerService = inject(CustomerService);
  private readonly messageService = inject(MessageService);

  readonly visible = input(false);
  readonly mode = input<CustomerDialogMode>('add');
  readonly customerId = input<number | null>(null);

  readonly visibleChange = output<boolean>();
  readonly saved = output<void>();

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly form: CustomerForm = buildCustomerForm(this.fb);

  protected readonly title = computed(() => {
    switch (this.mode()) {
      case 'edit':
        return 'Edit Customer';
      case 'view':
        return 'View Customer';
      default:
        return 'Add Customer';
    }
  });

  /** Called (via ngOnChanges-free `input()` + effect pattern) whenever the dialog is asked to open for a given id. */
  open(mode: CustomerDialogMode, id: number | null): void {
    this.form.reset(this.form.getRawValue());
    this.form.enable({ emitEvent: false });

    if (mode === 'view') {
      this.form.disable({ emitEvent: false });
    }

    if (id != null) {
      this.loadCustomer(id);
    }
  }

  private loadCustomer(id: number): void {
    this.loading.set(true);
    this.customerService
      .getCustomers({
        text: '',
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
          const customer: Customer | undefined = result.items[0];
          if (customer) {
            this.form.patchValue(toFormValue(customer));
            if (this.mode() === 'view') {
              this.form.disable({ emitEvent: false });
            }
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
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Saved',
            detail: 'Customer details were saved successfully.',
          });
          this.saved.emit();
          this.close();
        },
        error: () => {
          // The global error interceptor already surfaces a toast.
        },
      });
  }

  protected close(): void {
    this.visibleChange.emit(false);
  }

  protected onVisibleChange(value: boolean): void {
    this.visibleChange.emit(value);
  }

  resetForm(): void {
    this.form.reset({
      Id: 0,
      Code: '',
      Company: '',
      CommercialName: '',
      LegalArabicName: '',
      LegalEnglishName: '',
      LegalFrenchName: '',
      JobTitle: '',
      BirthDate: null,
      Email: '',
      Fax: '',
      NationalID: '',
      Website: '',
      PassportNo: '',
      Address: '',
      DistrictAR: '',
      DistrictEN: '',
      StreetAR: '',
      StreetEN: '',
      RegionId: null,
      CountryId: null,
      CityId: null,
      MainClientId: null,
      Mobile: '',
      Phone: '',
      BuildingNumber: '',
      PostalCode: '',
      VATRegistrationNumber: '',
      GroupVATRegistrationNumber: '',
      AccountNo: '',
      SwiftCode: '',
      PayeeBank: '',
      CommercialRegistrationNumber: '',
    });
    this.form.enable({ emitEvent: false });
  }
}
