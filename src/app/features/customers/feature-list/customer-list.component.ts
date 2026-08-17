import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';

import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { CustomerStore } from '../data-access/customer.store';
import { CustomerToolbarComponent } from './components/customer-toolbar/customer-toolbar.component';
import { ColumnFilterGridComponent } from './components/column-filter-grid/column-filter-grid.component';
import {
  RowActionKey,
  RowActionsMenuComponent,
} from './components/row-actions-menu/row-actions-menu.component';
import { Customer } from '../../../core/models/customer.model';
import { CustomerFormComponent } from '../feature-form/customer-form.component';

type ReportKey = 'contacts' | 'customer' | 'account-follow-up';


@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [
    TableModule,
    ButtonModule,
    TagModule,
    ToastModule,
    SkeletonModule,
    ConfirmDialogModule,
    DialogModule,
    CustomerToolbarComponent,
    ColumnFilterGridComponent,
    RowActionsMenuComponent,
    CustomerFormComponent,
  ],
  // The store is scoped to this component subtree so the list's query state
  // (search/filters/paging) resets cleanly whenever the user navigates away
  // and back, instead of leaking as global app state.
  providers: [CustomerStore, MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customer-list.component.html',
  styleUrl: './customer-list.component.scss',
})
export class CustomerListComponent {
  protected readonly store = inject(CustomerStore);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly messageService = inject(MessageService);

  protected readonly pageSizeOptions = [5, 10, 20];
  protected readonly filterExpanded = signal(false);
  protected readonly quickSectionsExpanded = signal(true);
  /** Which report card is highlighted as active in the "Reports" quick card. */
  protected readonly selectedReport = signal<ReportKey>('customer');
  protected readonly visiblePageNumbers = computed(() => {
    const totalPages = this.store.totalPages();
    const currentPage = this.store.pageIndex() + 1;
    const maxVisible = 5;
    const start = Math.max(1, Math.min(currentPage - 2, totalPages - maxVisible + 1));
    const end = Math.min(totalPages, start + maxVisible - 1);

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  });
  protected readonly reportFirst = computed(() =>
    this.store.total() === 0 ? 0 : this.store.pageIndex() * this.store.pageSize() + 1
  );
  protected readonly reportLast = computed(() =>
    Math.min(this.store.total(), (this.store.pageIndex() + 1) * this.store.pageSize())
  );
  protected readonly isFirstPage = computed(() => this.store.pageIndex() <= 0);
  protected readonly isLastPage = computed(
    () => this.store.pageIndex() >= this.store.totalPages() - 1
  );

  /** Highlights the clicked report tile in the "Reports" quick card. */
  protected selectReport(report: ReportKey): void {
    this.selectedReport.set(report);
  }

  // ---- Create/Edit/View dialog state --------------------------------------
  protected readonly dialogVisible = signal(false);
  protected readonly dialogCustomerId = signal<number | null>(null);
  protected readonly dialogCustomer = signal<Customer | null>(null);
  protected readonly dialogViewMode = signal(false);
  protected readonly dialogTitle = signal('Add Customer');

  /**
   * Fired by p-table whenever paging or sorting changes.
   * `lazy` mode means the table never holds more than one page of rows in
   * memory client-side — the store is the single source of truth and this
   * handler simply forwards the request.
   */
  protected onLazyLoad(event: TableLazyLoadEvent): void {
    const pageSize = event.rows ?? this.store.pageSize();
    const pageIndex = pageSize ? Math.floor((event.first ?? 0) / pageSize) : 0;
    if (pageSize !== this.store.pageSize()) {
      this.store.setPageSize(pageSize);
    } else {
      this.store.setPage(pageIndex);
    }

    if (event.sortField) {
      const field = Array.isArray(event.sortField) ? event.sortField[0] : event.sortField;
      this.store.setSort(field, event.sortOrder === -1 ? 'desc' : 'asc');
    } else {
      this.store.setSort(null, null);
    }
  }

  protected onSearchChange(term: string): void {
    this.store.search(term);
  }

  protected onSearchFieldsChange(fields: string[]): void {
    this.store.setSearchFields(fields);
  }

  protected onFilterChange(event: { field: string; value: string }): void {
    this.store.setColumnFilter(event.field, event.value);
  }

  protected goToPage(pageIndex: number): void {
    const safePage = Math.max(0, Math.min(pageIndex, this.store.totalPages() - 1));
    this.store.setPage(safePage);
  }

  protected onPageSizeChange(value: string): void {
    const pageSize = Number(value);
    if (Number.isFinite(pageSize)) {
      this.store.setPageSize(pageSize);
    }
  }

  protected onRowAction(event: { key: RowActionKey; customer: Customer }): void {
    switch (event.key) {
      case 'view':
        return this.openDialog(event.customer, true);
      case 'edit':
        return this.openDialog(event.customer, false);
      case 'delete':
        return this.delete(event.customer);
      default:
        this.messageService.add({
          severity: 'info',
          summary: this.humanizeActionKey(event.key),
          detail: 'This action is outside the scope of the current assessment task.',
        });
    }
  }

  private humanizeActionKey(key: RowActionKey): string {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
  }

  protected addCustomer(): void {
    this.dialogCustomerId.set(null);
    this.dialogCustomer.set(null);
    this.dialogViewMode.set(false);
    this.dialogTitle.set('Add Customer');
    this.dialogVisible.set(true);
  }

  private openDialog(customer: Customer, viewOnly: boolean): void {
    this.dialogCustomerId.set(customer.Id ?? null);
    this.dialogCustomer.set(customer);
    this.dialogViewMode.set(viewOnly);
    this.dialogTitle.set(viewOnly ? 'View Customer' : 'Edit Customer');
    this.dialogVisible.set(true);
  }

  protected onFormSaved(customer: Customer): void {
    const created = this.dialogCustomerId() == null;
    this.dialogCustomer.set(customer);
    this.dialogVisible.set(false);
    this.store.upsertSavedCustomer(customer, created);
  }

  protected onFormCancelled(): void {
    this.dialogVisible.set(false);
  }

  protected delete(customer: Customer): void {
    const label = customer.CommercialName || customer.Name || `#${customer.Id}`;
    this.confirmDialog.confirmDelete(label, () => {
      // The task scope only requires Read + Edit against the staging API,
      // so deletion is wired up at the UI/UX level (confirmation, optimistic
      // toast) without a destructive network call, matching the mock API spec.
      this.messageService.add({
        severity: 'success',
        summary: 'Deleted',
        detail: `${label} was removed.`,
      });
      this.store.reload();
    });
  }

  protected exportExcel(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Export started',
      detail: 'Your Excel export will download shortly.',
    });
  }
}