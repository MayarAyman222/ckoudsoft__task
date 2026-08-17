import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  merge,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { CustomerService } from '../../../core/services/customer.service';
import { Customer } from '../../../core/models/customer.model';
import { CustomerQueryParams, DEFAULT_QUERY_PARAMS } from '../../../core/models/query.model';

interface LocalCustomerSave {
  key: string;
  customer: Customer;
  created: boolean;
}


@Injectable()
export class CustomerStore {
  private readonly customerService = inject(CustomerService);

  
  private static readonly LOCAL_SAVES_STORAGE_KEY = 'crm.customer.localSaves.v1';

  private readonly _queryParams = signal<CustomerQueryParams>({
    ...DEFAULT_QUERY_PARAMS,
  });
  private readonly _error = signal<string | null>(null);
  private readonly refresh$ = new Subject<void>();
  private readonly localSaves = signal<LocalCustomerSave[]>(
    CustomerStore.readPersistedLocalSaves()
  );

  readonly queryParams = this._queryParams.asReadonly();
  readonly error = this._error.asReadonly();

  private readonly queryParams$ = toObservable(this._queryParams);

  private reloadNonce = 0;
  private localSaveNonce = 0;

  private readonly result = toSignal(
    merge(
      this.queryParams$.pipe(map((params) => ({ params, nonce: 0 }))),
      this.refresh$.pipe(
        map(() => ({ params: this._queryParams(), nonce: ++this.reloadNonce }))
      )
    ).pipe(
      debounceTime(250),
      distinctUntilChanged((a, b) => a.nonce === 0 && b.nonce === 0 && JSON.stringify(a.params) === JSON.stringify(b.params)),
      map(({ params }) => params),
      tap(() => this._error.set(null)),
      switchMap((params) =>
        this.customerService.getCustomers(params).pipe(
          catchError((err) => {
            this._error.set('Failed to load customers. Please try again.');
            console.error(err);
            return of({ items: [] as Customer[], total: 0 });
          })
        )
      )
    ),
    { initialValue: { items: [] as Customer[], total: 0 } }
  );

  readonly loading = signal(false);

  readonly customers = computed(() => this.mergeLocalSaves(this.result().items));
  readonly total = computed(() => this.result().total + this.pendingCreatedCount());
  readonly pageIndex = computed(() => this._queryParams().pageIndex);
  readonly pageSize = computed(() => this._queryParams().pageSize);
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize()))
  );
  readonly isEmpty = computed(() => !this.loading() && this.customers().length === 0);

  constructor() {
    
    merge(this.queryParams$, this.refresh$)
      .pipe(debounceTime(0), takeUntilDestroyed())
      .subscribe(() => this.loading.set(true));

    toObservable(this.result)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.loading.set(false));
  }


  search(text: string): void {
    this.patch({ text, pageIndex: 0 });
  }

  setSearchFields(fields: string[]): void {
    this.patch({ searchFields: fields, pageIndex: 0 });
  }

  setColumnFilter(field: string, value: string): void {
    const columnFilters = { ...this._queryParams().columnFilters, [field]: value };
    if (!value) delete columnFilters[field];
    this.patch({ columnFilters, pageIndex: 0 });
  }

  clearFilters(): void {
    this.patch({ text: '', columnFilters: {}, pageIndex: 0 });
  }

  setPage(pageIndex: number): void {
    this.patch({ pageIndex });
  }

  setPageSize(pageSize: number): void {
    this.patch({ pageSize, pageIndex: 0 });
  }

  setSort(sortField: string | null, sortOrder: 'asc' | 'desc' | null): void {
    this.patch({ sortField, sortOrder });
  }

  reload(): void {
    this.refresh$.next();
  }

  upsertSavedCustomer(customer: Customer, created: boolean): void {
    const key = this.customerKey(customer) ?? `local:${++this.localSaveNonce}`;

    this.localSaves.update((saves) => {
      const next = [
        { key, customer, created },
        ...saves.filter(
          (save) => save.key !== key && !this.isSameCustomer(save.customer, customer)
        ),
      ];
      CustomerStore.persistLocalSaves(next);
      return next;
    });

    if (created) {
      this.patch({ pageIndex: 0 });
    }

    this.reload();
  }

  private static readPersistedLocalSaves(): LocalCustomerSave[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(CustomerStore.LOCAL_SAVES_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as LocalCustomerSave[]) : [];
    } catch {
      return [];
    }
  }

  private static persistLocalSaves(saves: LocalCustomerSave[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(CustomerStore.LOCAL_SAVES_STORAGE_KEY, JSON.stringify(saves));
    } catch {
      
    }
  }

  private patch(partial: Partial<CustomerQueryParams>): void {
    this._queryParams.set({ ...this._queryParams(), ...partial });
  }

  private mergeLocalSaves(serverItems: Customer[]): Customer[] {
    const params = this._queryParams();
    const saves = this.localSaves();
    const visibleLocalCustomers = saves
      .map((save) => save.customer)
      .filter((customer) => this.matchesQuery(customer, params));

    const merged: Customer[] = [];

    for (const customer of visibleLocalCustomers) {
      this.pushIfNew(merged, customer);
    }

    for (const customer of serverItems) {
      if (!saves.some((save) => this.isSameCustomer(save.customer, customer))) {
        this.pushIfNew(merged, customer);
      }
    }

    return merged.slice(0, params.pageSize);
  }

  private pendingCreatedCount(): number {
    const params = this._queryParams();
    const serverItems = this.result().items;

    return this.localSaves().filter(
      (save) =>
        save.created &&
        this.matchesQuery(save.customer, params) &&
        !serverItems.some((customer) => this.isSameCustomer(save.customer, customer))
    ).length;
  }

  private pushIfNew(customers: Customer[], customer: Customer): void {
    if (!customers.some((existing) => this.isSameCustomer(existing, customer))) {
      customers.push(customer);
    }
  }

  private matchesQuery(customer: Customer, params: CustomerQueryParams): boolean {
    const term = params.text.trim().toLowerCase();
    if (term) {
      const fields = params.searchFields?.length ? params.searchFields : ['CommercialName'];
      const matchesText = fields.some((field) =>
        this.resolveSearchFieldValue(customer, field).toLowerCase().includes(term)
      );

      if (!matchesText) return false;
    }

    for (const [key, value] of Object.entries(params.columnFilters)) {
      const needle = value.trim().toLowerCase();
      if (!needle) continue;

      if (!this.resolveSearchFieldValue(customer, key).toLowerCase().includes(needle)) {
        return false;
      }
    }

    return true;
  }

  private resolveSearchFieldValue(customer: Customer, field: string): string {
    switch (field) {
      case 'Id':
        return customer.Id != null ? String(customer.Id) : '';
      case 'Name':
        return String(customer.CommercialName ?? customer.Name ?? '');
      case 'NameAR':
        return String(customer.NameAR ?? '');
      case 'NameEN':
        return String(customer.NameEN ?? '');
      default:
        return String((customer as Record<string, unknown>)[field] ?? '');
    }
  }

  private isSameCustomer(a: Customer, b: Customer): boolean {
    const aId = this.customerId(a);
    const bId = this.customerId(b);

    if (aId != null && bId != null) {
      return aId === bId;
    }

    const aCode = this.customerCode(a);
    const bCode = this.customerCode(b);
    return aCode != null && aCode === bCode;
  }

  private customerKey(customer: Customer): string | null {
    const id = this.customerId(customer);
    if (id != null) {
      return `id:${id}`;
    }

    const code = this.customerCode(customer);
    return code ? `code:${code}` : null;
  }

  private customerId(customer: Customer): number | null {
    const id = Number(customer.Id);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private customerCode(customer: Customer): string | null {
    const code = customer.Code?.trim().toLowerCase();
    return code || null;
  }
}