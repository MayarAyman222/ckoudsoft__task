export interface CustomerQueryParams {
  /** Free-text search term (mapped to the API's `Text` query param). */
  text: string;
  /** Which fields the free-text search matches against (user-configurable, mirrors the reference UI's field-picker chips). */
  searchFields: string[];
  direction: 'ltr' | 'rtl';
  /** Zero-based page index used internally by the UI. */
  pageIndex: number;
  pageSize: number;
  sortField: string | null;
  sortOrder: 'asc' | 'desc' | null;
  /** Column-level filters, e.g. { ClientType: 'Client', City: 'Cairo' }. */
  columnFilters: Record<string, string>;
}

export const DEFAULT_SEARCH_FIELDS = ['Id', 'Code', 'CommercialName', 'Email', 'Mobile'];

export const DEFAULT_QUERY_PARAMS: CustomerQueryParams = {
  text: '',
  searchFields: [...DEFAULT_SEARCH_FIELDS],
  direction: 'ltr',
  pageIndex: 0,
  pageSize: 5,
  sortField: null,
  sortOrder: null,
  columnFilters: {},
};

/**
 * Normalized paged result. The staging endpoint's exact envelope isn't
 * guaranteed (arrays vs. `{ Data, Total }` wrappers are both common in this
 * backend family), so `CustomerService` maps whatever shape it receives into
 * this contract before it ever reaches the store or the UI.
 */
export interface PagedResult<T> {
  items: T[];
  total: number;
}
