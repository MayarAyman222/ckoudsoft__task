import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API_ENDPOINTS } from '../constants/api.constants';
import { Customer } from '../models/customer.model';
import { CustomerQueryParams, PagedResult } from '../models/query.model';

/**
 * Thin HTTP boundary for the Customer domain.
 *
 * Why this shape:
 * - The component/store layer never sees `HttpParams` or raw API envelopes;
 *   it only deals with `CustomerQueryParams` in and `PagedResult<Customer>` out.
 * - `ReadAllCRMClients` is the only read endpoint the task allows, and it does
 *   not natively support paging/sorting query params. We still send the
 *   canonical params so the integration is forward-compatible with a
 *   paginated backend, and fall back to slicing the payload client-side when
 *   the response arrives as a flat array. This keeps the *contract* the app
 *   is built against ("server-side pagination") correct even though today's
 *   staging endpoint returns everything in one shot - swapping in a real
 *   paginated backend requires no changes outside this service.
 */
@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  getCustomers(params: CustomerQueryParams): Observable<PagedResult<Customer>> {
    let httpParams = new HttpParams()
      .set('Text', params.text ?? '')
      .set('Direction', params.direction ?? 'ltr')
      .set('InCT', '')
      .set('PageIndex', String(params.pageIndex))
      .set('PageSize', String(params.pageSize));

    if (params.sortField) {
      httpParams = httpParams
        .set('SortField', params.sortField)
        .set('SortOrder', params.sortOrder ?? 'asc');
    }

    for (const [key, value] of Object.entries(params.columnFilters)) {
      if (value) {
        httpParams = httpParams.set(key, value);
      }
    }

    return this.http
      .get<unknown>(`${this.baseUrl}/${API_ENDPOINTS.readAllClients}`, {
        params: httpParams,
      })
      .pipe(map((response) => this.normalizeAndPaginate(response, params)));
  }

  saveCustomer(payload: Customer): Observable<Customer> {
    return this.http
      .post<unknown>(`${this.baseUrl}/${API_ENDPOINTS.saveCustomer}?InCT=`, payload)
      .pipe(map((response) => this.normalizeSavedCustomer(response, payload)));
  }

  /**
   * Normalizes whichever envelope the API returned (`Customer[]` or
   * `{ Data, Total }`-style wrappers are both common on this backend family)
   * and, if the server didn't already page the result, applies client-side
   * pagination/sorting/filtering as a safety net so the UI contract never
   * breaks regardless of which shape comes back.
   */
  private normalizeAndPaginate(
    response: unknown,
    params: CustomerQueryParams
  ): PagedResult<Customer> {
    const raw = this.extractArray(response);
    const alreadyPaged = raw.length <= params.pageSize && this.looksServerPaged(response);

    if (alreadyPaged) {
      return {
        items: raw,
        total: this.extractTotal(response) ?? raw.length,
      };
    }

    let filtered = raw;

    if (params.text) {
      const term = params.text.toLowerCase();
      const fields = params.searchFields?.length ? params.searchFields : ['CommercialName'];
      filtered = filtered.filter((c) =>
        fields.some((field) => {
          const value = this.resolveSearchFieldValue(c, field);
          return value != null && String(value).toLowerCase().includes(term);
        })
      );
    }

    for (const [key, value] of Object.entries(params.columnFilters)) {
      if (!value) continue;
      const needle = value.toLowerCase();
      filtered = filtered.filter((c) =>
        this.resolveSearchFieldValue(c, key).toLowerCase().includes(needle)
      );
    }

    if (params.sortField) {
      const field = params.sortField;
      const dir = params.sortOrder === 'desc' ? -1 : 1;
      filtered = [...filtered].sort((a, b) => {
        const av = (a as Record<string, unknown>)[field];
        const bv = (b as Record<string, unknown>)[field];
        if (av == null && bv == null) return 0;
        if (av == null) return -1 * dir;
        if (bv == null) return 1 * dir;
        return av > bv ? dir : av < bv ? -dir : 0;
      });
    }

    const total = filtered.length;
    const start = params.pageIndex * params.pageSize;
    const items = filtered.slice(start, start + params.pageSize);

    return { items, total };
  }

  /**
   * Maps a search-field key (as picked in the field-selector chips, e.g.
   * "Name" or "AccountManager") to the actual value(s) on the Customer to
   * search against. "Name" intentionally checks both CommercialName and the
   * legacy Name field since the API is inconsistent about which is populated.
   */
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

  private extractArray(response: unknown): Customer[] {
    if (Array.isArray(response)) return response as Customer[];
    if (response && typeof response === 'object') {
      const obj = response as Record<string, unknown>;
      const candidate = obj['Data'] ?? obj['data'] ?? obj['Result'] ?? obj['Items'];
      if (Array.isArray(candidate)) return candidate as Customer[];
    }
    return [];
  }

  private normalizeSavedCustomer(response: unknown, fallback: Customer): Customer {
    const savedCustomer = this.extractCustomer(response);
    if (!savedCustomer) {
      return fallback;
    }

    const fallbackId = Number(fallback.Id);
    const savedId = Number(savedCustomer.Id);

    return {
      ...savedCustomer,
      ...fallback,
      Id: Number.isFinite(fallbackId) && fallbackId > 0
        ? fallback.Id
        : Number.isFinite(savedId) && savedId > 0
          ? savedCustomer.Id
          : fallback.Id,
    };
  }

  private extractCustomer(response: unknown): Customer | null {
    if (Array.isArray(response)) {
      return this.firstCustomerFromArray(response);
    }

    if (!response || typeof response !== 'object') {
      return null;
    }

    const obj = response as Record<string, unknown>;

    if (this.looksLikeCustomer(obj)) {
      return obj as Customer;
    }

    const candidate =
      obj['Data'] ??
      obj['data'] ??
      obj['Result'] ??
      obj['result'] ??
      obj['Item'] ??
      obj['item'] ??
      obj['Entity'] ??
      obj['entity'];

    if (Array.isArray(candidate)) {
      return this.firstCustomerFromArray(candidate);
    }

    if (candidate && typeof candidate === 'object') {
      const candidateObj = candidate as Record<string, unknown>;
      return this.looksLikeCustomer(candidateObj) ? (candidateObj as Customer) : null;
    }

    const id = obj['Id'] ?? obj['ID'] ?? obj['id'];
    const numericId = Number(id);
    return Number.isFinite(numericId) && numericId > 0 ? { Id: numericId } : null;
  }

  private firstCustomerFromArray(items: unknown[]): Customer | null {
    const customer = items.find(
      (item) =>
        item &&
        typeof item === 'object' &&
        this.looksLikeCustomer(item as Record<string, unknown>)
    );

    return customer ? (customer as Customer) : null;
  }

  private looksLikeCustomer(obj: Record<string, unknown>): boolean {
    return ['Id', 'Code', 'CommercialName', 'Name', 'Email', 'Mobile'].some((key) => key in obj);
  }

  private extractTotal(response: unknown): number | null {
    if (response && typeof response === 'object') {
      const obj = response as Record<string, unknown>;
      const candidate = obj['Total'] ?? obj['TotalCount'] ?? obj['total'];
      if (typeof candidate === 'number') return candidate;
    }
    return null;
  }

  private looksServerPaged(response: unknown): boolean {
    return !!(
      response &&
      typeof response === 'object' &&
      !Array.isArray(response) &&
      ('Total' in (response as object) || 'TotalCount' in (response as object))
    );
  }
}
