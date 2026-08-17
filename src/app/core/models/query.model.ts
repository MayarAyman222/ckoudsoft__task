export interface CustomerQueryParams {
  text: string;
  searchFields: string[];
  direction: 'ltr' | 'rtl';
  pageIndex: number;
  pageSize: number;
  sortField: string | null;
  sortOrder: 'asc' | 'desc' | null;
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


export interface PagedResult<T> {
  items: T[];
  total: number;
}
