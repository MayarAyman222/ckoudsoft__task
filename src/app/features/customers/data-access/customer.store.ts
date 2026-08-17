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

/**
 * Signals hold the *state*; RxJS owns the *process* of turning state changes
 * into a single, cancellable HTTP request.
 *
 * Why split it this way:
 * - Every UI control (search box, column filters, paginator, sort header)
 *   just writes to a signal. Signals give cheap, synchronous, fine-grained
 *   change detection for the template (`loading()`, `customers()`, `total()`)
 *   without manual subscriptions in components.
 * - Fetching is inherently asynchronous and needs operators signals don't
 *   provide out of the box: `debounceTime` so free-text search doesn't fire
 *   a request per keystroke, and `switchMap` so a fast paginator click
 *   cancels the previous in-flight request instead of racing it (critical
 *   once you're proxying 100k+ rows - a stale response arriving after a
 *   newer one must never overwrite the UI).
 * - `toObservable` bridges the query-params signal into that RxJS pipeline;
 *   `toSignal` bridges the pipeline's output back into signals for the
 *   template. This keeps exactly one subscription alive for the store's
 *   whole lifetime (cleaned up automatically via `takeUntilDestroyed`)
 *   instead of components manually subscribing/unsubscribing.
 */
@Injectable()
export class CustomerStore {
  private readonly customerService = inject(CustomerService);

  /**
   * Local saves are a client-side cache that patches the merged list view
   * right after a save, since the staging API's `ReadAllCRMClients` endpoint
   * doesn't reliably reflect a just-written row on the very next read (no
   * read-by-id, occasional caching upstream). Without this, an edit could
   * flash back to its old value for a moment after `reload()`.
   *
   * That cache used to live only in the signal above, which meant it was
   * wiped on every full page refresh (new app bootstrap = new store
   * instance = empty signal), so a save that hadn't "caught up" on the
   * server yet would visually disappear the moment the user reloaded the
   * page. Persisting it to `localStorage` keeps it alive across refreshes,
   * the same as it survives in-memory across reloads within a session.
   */
  private static readonly LOCAL_SAVES_STORAGE_KEY = 'crm.customer.localSaves.v1';

  // ---- Writable state -----------------------------------------------------
  private readonly _queryParams = signal<CustomerQueryParams>({
    ...DEFAULT_QUERY_PARAMS,
  });
  private readonly _error = signal<string | null>(null);
  /** Bumped to force-refetch the current page (e.g. after a save). */
  private readonly refresh$ = new Subject<void>();
  private readonly localSaves = signal<LocalCustomerSave[]>(
    CustomerStore.readPersistedLocalSaves()
  );

  // ---- Public read-only state ---------------------------------------------
  readonly queryParams = this._queryParams.asReadonly();
  readonly error = this._error.asReadonly();

  private readonly queryParams$ = toObservable(this._queryParams);

  /** Monotonically increasing tag so an explicit reload() always bypasses distinctUntilChanged. */
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

  /** True while a request for the *current* query params is in flight. */
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
    // Derive a simple loading flag from param changes -> result changes,
    // without needing a second network round-trip just to know we're busy.
    merge(this.queryParams$, this.refresh$)
      .pipe(debounceTime(0), takeUntilDestroyed())
      .subscribe(() => this.loading.set(true));

    toObservable(this.result)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.loading.set(false));
  }

  // ---- Intents (called from the component) --------------------------------

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
    // Force a refetch even though the params object is unchanged (e.g. after a save).
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
      // Corrupt/unavailable storage shouldn't break the app - just start empty.
      return [];
    }
  }

  private static persistLocalSaves(saves: LocalCustomerSave[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(CustomerStore.LOCAL_SAVES_STORAGE_KEY, JSON.stringify(saves));
    } catch {
      // Storage full/blocked (private browsing, quota) - fail silently and
      // keep working from the in-memory signal for the rest of the session.
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