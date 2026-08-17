import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';

interface FilterFieldDef {
  field: string;
  label: string;
}

const FILTER_FIELDS: FilterFieldDef[] = [
  { field: 'Id', label: 'ID' },
  { field: 'Code', label: 'Code' },
  { field: 'Name', label: 'Name' },
  { field: 'Email', label: 'Email' },
  { field: 'Mobile', label: 'Mobile' },
  { field: 'ClientType', label: 'Client Type' },
  { field: 'AccountManager', label: 'Account Manager' },
  { field: 'City', label: 'City' },
  { field: 'Country', label: 'Country' },
];

/**
 * The expandable per-column filter grid shown under the search row in the
 * reference screens: one text input per filterable column, wired directly
 * to `CustomerStore.setColumnFilter`, plus a "Clear All Filters" action.
 */
@Component({
  selector: 'app-column-filter-grid',
  standalone: true,
  imports: [FormsModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="filter-grid">
      @for (def of fields; track def.field) {
        <div class="filter-grid__field">
          <label>{{ def.label }}</label>
          <input
            type="text"
            [placeholder]="'Filter ' + def.label"
            [ngModel]="activeFilters()[def.field] || ''"
            (ngModelChange)="filterChange.emit({ field: def.field, value: $event })"
          />
        </div>
      }
    </div>
    <div class="filter-grid__footer">
      <button
        pButton
        type="button"
        label="Clear All Filters"
        icon="pi pi-trash"
        class="p-button-text p-button-sm p-button-danger"
        (click)="clearAll.emit()"
      ></button>
    </div>
  `,
  styles: [
    `
      .filter-grid {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 12px 14px;
        background: #f8fafc;
        border: 1px solid #eef1f6;
        border-radius: 10px;
        padding: 14px 16px;
        margin-bottom: 12px;

        @media (max-width: 900px) {
          grid-template-columns: repeat(3, 1fr);
        }
        @media (max-width: 560px) {
          grid-template-columns: repeat(2, 1fr);
        }
      }
      .filter-grid__field {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;

        label {
          font-size: 0.72rem;
          font-weight: 600;
          color: #64748b;
        }

        input {
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 6px 8px;
          font-size: 0.8rem;
          outline: none;
          background: #fff;

          &:focus {
            border-color: #93c5fd;
          }
        }
      }
      .filter-grid__footer {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 10px;
      }
    `,
  ],
})
export class ColumnFilterGridComponent {
  readonly activeFilters = input<Record<string, string>>({});
  readonly filterChange = output<{ field: string; value: string }>();
  readonly clearAll = output<void>();

  protected readonly fields = FILTER_FIELDS;
}
