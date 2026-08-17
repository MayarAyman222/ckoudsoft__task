# CRM Customer Management (Angular 17)

A high-performance Customer Management module for an ERP/CRM platform, built as
a technical assessment for the Senior Front-End Developer (Angular) role.

> **AI disclosure:** This project was scaffolded and implemented with the help
> of an AI coding assistant (Claude), as explicitly permitted by the task
> brief. All architectural decisions, trade-offs, and code below were reviewed
> for correctness against the task requirements.

## Stack

- **Angular 17** (standalone components, no NgModules)
- **Angular Signals** for state, **RxJS** for async orchestration
- **PrimeNG 17** for the data table, dialogs, forms and menus
- **Tailwind CSS** for layout/utility styling alongside PrimeNG's own theme
- **Reactive Forms** for the Customer Edit/Create form

## Getting started

```bash
npm install
npm start        # http://localhost:4200
npm run build    # production build -> dist/crm-customer-app
```

The API base URL and bearer token live in `src/environments/environment.ts`
/ `environment.development.ts`. In a real deployment the token would come
from an auth flow, not source control — it's hard-coded here only because
the assessment's staging API has no login endpoint.

## Folder structure

```
src/app/
├── core/                     # Singleton, app-wide concerns
│   ├── constants/            # API endpoint names
│   ├── interceptors/         # auth (bearer token), error (toast + normalize)
│   ├── models/                # Customer, query params, paged result
│   └── services/             # CustomerService (HTTP boundary)
│
├── shared/                   # Reusable, presentation-only building blocks
│   ├── components/           # page-header, status-badge, confirm-dialog
│   ├── pipes/                 # fieldError (validation-message pipe)
│   └── utils/                 # custom Reactive Forms validators
│
├── layout/shell/              # Sidebar + topbar shell (matches provided screens)
│
├── features/
│   └── customers/
│       ├── data-access/       # CustomerStore (Signals + RxJS state)
│       ├── feature-list/      # Customer list page + its private subcomponents
│       │   └── components/    # toolbar, column filters (list-only, not shared)
│       └── feature-form/      # Customer Create/Edit page + form factory
│
├── app.component.ts
├── app.config.ts              # providers: HttpClient+interceptors, animations, PrimeNG
└── app.routes.ts               # shell -> lazy-loaded feature routes
```

**Why this shape:** `core` holds things that exist once for the whole app
(HTTP, models, cross-cutting interceptors). `shared` holds dumb, reusable UI
that has no feature knowledge. `features/customers` owns everything specific
to the Customer domain, split further into `data-access` (state/HTTP
orchestration) vs. `feature-list` / `feature-form` (presentation). Nothing in
`feature-list` imports from `feature-form` or vice versa — the only shared
surface between them is `core` and `shared`. This keeps the module easy to
delete or extract wholesale, and keeps any future "Potential Request",
"Quotation", etc. feature from becoming entangled with Customer internals.

## State management: Signals + RxJS

`features/customers/data-access/customer.store.ts` is the core of the
performance story. The split is deliberate:

- **Signals hold state.** `_queryParams` (search/filters/sort/paging),
  `loading`, `error` and the derived `customers`/`total`/`totalPages` are all
  signals or `computed()`s. Every UI control (search box, filter dropdowns,
  paginator, sort header) just calls a store method that writes to a signal —
  no manual subscriptions in components, no `async` pipe boilerplate, and
  Angular's fine-grained reactivity means only the DOM that actually depends
  on a changed value re-renders.
- **RxJS owns the async process.** Signals alone don't give you
  `debounceTime`, `switchMap`, or cancellation. The store bridges the query
  params signal into an observable with `toObservable()`, pipes it through
  `debounceTime(250)` (so typing in the search box doesn't fire a request per
  keystroke) → `distinctUntilChanged` (skip no-op re-emits) →
  `switchMap(() => customerService.getCustomers(...))`. `switchMap` is the
  important part for a 100k+ row dataset: if the user clicks "next page"
  twice quickly, or changes a filter while a request is still in flight, the
  stale request is cancelled outright instead of racing the new one and
  potentially painting the wrong page of stale data.
- The RxJS pipeline's output is bridged back with `toSignal()`, so the
  template only ever touches signals (`store.customers()`, `store.loading()`),
  never observables directly.
- The whole subscription is owned by the store and cleaned up automatically
  via `takeUntilDestroyed()` — no `ngOnDestroy`/`Subscription` bookkeeping
  anywhere in the feature.

`CustomerStore` is provided at the `CustomerListComponent` level (not
`root`), so its state (search term, filters, current page) is scoped to that
route and resets cleanly if the user navigates away and back, instead of
leaking as global app state.

## Handling 100,000+ records

The task calls for **server-side pagination, sorting, filtering and
searching** — the interface never holds more than one page of rows.

- `PrimeNG p-table` runs in `[lazy]="true"` mode: it never receives the full
  dataset, only the current page's rows (`store.customers()`), and it fires
  an `onLazyLoad` event (containing the requested page/sort) for every user
  interaction — page change, sort-column click. That event maps 1:1 onto
  `CustomerStore.setPage()` / `.setSort()`.
- `CustomerService.getCustomers()` sends `PageIndex`/`PageSize`/`SortField`/
  `SortOrder` query params on every request. The provided staging endpoint
  (`ReadAllCRMClients`) doesn't natively support these, so the service also
  includes a defensive **client-side fallback**: if the response comes back
  as a flat, unpaginated array, the service slices/sorts/filters it in memory
  before handing a `PagedResult<Customer>` up to the store. This means the
  *contract* the rest of the app is built against (small, paged responses)
  is correct today and requires **zero changes anywhere outside this one
  service** the moment the backend adds real server-side paging — which is
  what "100k+ records" in production actually requires, since no frontend
  technique makes shipping 100k rows over HTTP on every keystroke fast.
- Search input is debounced (250ms) before it ever reaches the HTTP layer.
- `switchMap` guarantees only one request is ever in flight for the list —
  never queues or races duplicate calls.
- `ChangeDetectionStrategy.OnPush` is used on every component; combined with
  signals, Angular skips change detection entirely for parts of the tree that
  didn't change.
- Row actions use a single shared `p-menu` triggered per-row via `toggle()`
  rather than instantiating a menu/dropdown per row, keeping the DOM light
  even at high page sizes (10/25/50/100 configurable via the paginator).

This "optimized server-side fetching" approach was chosen over virtual
scrolling because it directly matches the delivered screens (classic
"Showing X to Y of Z results" pagination with page-size selector and
Prev/Next), and because true virtual scrolling only helps once the data is
already paged down to a renderable size — the two techniques solve different
problems, and the actual bottleneck for a 100k-row backend is exactly the
network/query cost that server-side paging addresses.

## Forms: Reactive Forms with complex validation

`feature-form/customer-form.factory.ts` builds a single strongly-typed
`FormGroup` (`fb.nonNullable.group(...)`) mirroring the fields in the
provided `SaveCustomerWithContactPerson` payload and the "Edit Customer"
screen. Validation includes:

- Standard validators (`required`, `email`, `maxLength`, `pattern`).
- **Custom validators** in `shared/utils/custom-validators.ts`:
  `mobilePatternValidator` (accepts local or +country-code numbers),
  `notInFutureValidator` (birth date can't be in the future),
  `alphaNumericValidator` (VAT/registration-style codes).
- A **cross-field, group-level validator** (`atLeastOneOf(['Mobile',
  'Phone', 'Email'])`) enforcing an ERP business rule — a customer record
  must be reachable by at least one channel — surfaced as a form-level
  banner rather than a single field error.
- `feature-form/customer-form.factory.ts` also isolates the mapping between
  the API's `Customer` shape and the form's flat value (`toFormValue` /
  `toApiPayload`), so the component itself only orchestrates load/save and
  never hand-rolls field mapping inline.

The same component (`CustomerFormComponent`) handles Create, Edit and a
read-only **View** mode (`?mode=view` query param disables the form), instead
of three near-duplicate components.

## Error handling

`core/interceptors/error.interceptor.ts` centralizes HTTP error handling:
every failed request surfaces a business-friendly PrimeNG toast (network
unreachable vs. 401/403 vs. generic failure) without any feature component
needing to know about `HttpErrorResponse` shapes. `CustomerStore` additionally
exposes an `error` signal for the list itself to render an inline "Retry"
banner distinct from the transient toast.

## What's out of scope (by design)

Only `ReadAllCRMClients` (list) and `SaveCustomerWithContactPerson`
(create/edit) were provided/required by the task. Sidebar items other than
"Customer" (Dashboard, Potential Request, Quotation, Sales Order, Tickets)
render a lightweight placeholder so navigation doesn't dead-end. The
"Actions"/"Reports" cards and the extra row-menu entries (Change Status,
Location, Attachment, Sales Order, Follow-Up, Log, NFC, Add/View Potential,
Contacts) shown in the reference screens are rendered for visual parity and
surface a toast noting they're outside this task's scope, since no backing
endpoints were provided for them. "Delete" is wired at the UI/UX level
(confirmation dialog + toast) without a destructive network call, since no
delete endpoint was part of the mock API spec.

No lookup endpoint was provided for **Company**, **Region**, **City**, or
**Main Account** either (same situation as Country, which the task's own
mock API also doesn't expose a lookup for) — those four dropdowns are
populated from a small representative list in
`core/constants/lookups.constant.ts`, isolated in one place so wiring in a
real lookup endpoint later touches only that file.

## UI parity with the provided screens

- **Add/Edit/View Customer** opens as a modal dialog (`p-dialog`), not a
  separate route, matching the reference "Edit Customer" screen exactly —
  same 4-column field grid, same field grouping, same Cancel/Save footer.
  `CustomerFormComponent` itself has no knowledge of dialogs or routing (it
  just emits `saved`/`cancelled`), so the same component could be re-hosted
  as a full page or a side drawer with zero changes.
- The row **Actions** menu is a three-column overlay reproducing the exact
  action set and layout from the screenshot (View / Edit / Delete, Change
  Status / Location / Attachment, Sales Order / Follow-Up / Log, NFC / Add
  Potential / Potential, Contacts).
- **Search row**: a search box, a "Filter" expand/collapse toggle, and a
  field-picker chip row (`app-search-fields-selector`) sit inline, exactly
  like the reference. The chips are **functional**: they control which
  fields (`Id`, `Code`, `Name`, `Email`, `Mobile`, `NameAR`/`NameEN`,
  `ClientType`, `AccountManager`, `City`, `Country`) the free-text search
  matches against, wired through `CustomerStore.setSearchFields` into
  `CustomerService`'s search logic — add or remove a field from the
  checklist dropdown and the search behavior changes immediately.
- **Filter panel**: clicking "Filter" expands an inline grid of one text
  input per column (ID, Code, Name, Email, Mobile, Client Type, Account
  Manager, City, Country), each wired directly to
  `CustomerStore.setColumnFilter` — typing in any of them narrows the table
  live, and "Clear All Filters" resets everything in one call.
- **Pagination**: page-size options are `5 / 10 / 20` with `5` as the
  default, and the footer reads "Showing X to Y of Z Results" with
  First/Prev/page-numbers/Next/Last controls, matching the reference exactly.
- A **collapsible bottom bar** (the centered chevron under the table) toggles
  the "Actions"/"Reports" panel beneath the list, mirroring the
  expand/collapse control visible in the reference screens.
- The **sidebar and topbar** (logo, nav items with the active-route
  indicator, search-or-command bar, language selector, notification bell,
  and the two-line "Hello, {name}!" user block) mirror the reference chrome.