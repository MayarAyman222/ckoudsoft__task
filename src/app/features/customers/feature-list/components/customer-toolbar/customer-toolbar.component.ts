import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SearchFieldsSelectorComponent } from '../search-fields-selector/search-fields-selector.component';

/**
 * Top search row: free-text search box, the "Filter" expand/collapse
 * toggle, and the search-fields chip picker — all inline, matching the
 * reference screens exactly.
 */
@Component({
  selector: 'app-customer-toolbar',
  standalone: true,
  imports: [FormsModule, SearchFieldsSelectorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar">
      <span class="toolbar__search">
        <i class="pi pi-search"></i>
        <input
          type="text"
          placeholder="Search...."
          [ngModel]="searchTerm()"
          (ngModelChange)="searchChange.emit($event)"
        />
        <i class="pi pi-microphone toolbar__mic"></i>
      </span>

      <button type="button" class="toolbar__filter" (click)="filterToggle.emit()">
        <i class="pi pi-filter"></i>
        <span>Filter</span>
        <i class="pi" [class.pi-chevron-up]="filterExpanded()" [class.pi-chevron-down]="!filterExpanded()"></i>
      </button>

      <app-search-fields-selector (fieldsChange)="fieldsChange.emit($event)" />
    </div>
  `,
  styles: [
    `
      .toolbar {
        display: grid;
        grid-template-columns: minmax(260px, 1fr) 92px minmax(280px, 0.96fr);
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }
      app-search-fields-selector {
        min-width: 0;
      }
      .toolbar__search {
        display: flex;
        align-items: center;
        gap: 6px;
        background: #f7f9fc;
        border: 1px solid #d8e1ec;
        border-radius: 6px;
        height: var(--toolbar-height);
        padding: 0 8px;
        min-width: 0;
        color: #73839a;
      }
      .toolbar__search input {
        border: none;
        background: transparent;
        outline: none;
        font-size: 0.63rem;
        width: 100%;
        color: #334155;
      }
      .toolbar__search i {
        font-size: 0.62rem;
      }
      .toolbar__mic {
        flex-shrink: 0;
      }
      .toolbar__filter {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        background: #fff;
        border: 1px solid #ccd8e8;
        border-radius: 5px;
        height: var(--toolbar-height);
        padding: 0 10px;
        font-size: 0.64rem;
        color: #1f2937;
        cursor: pointer;
        flex-shrink: 0;
        font-weight: 600;

        i:first-child {
          color: #475569;
        }
        i:last-child {
          font-size: 0.52rem;
          color: #94a3b8;
        }

        &:hover {
          background: #f8fafc;
        }
      }

      @media (max-width: 900px) {
        .toolbar {
          grid-template-columns: minmax(0, 1fr) 92px;
        }

        app-search-fields-selector {
          grid-column: 1 / -1;
        }
      }

      @media (max-width: 520px) {
        .toolbar {
          grid-template-columns: 1fr;
        }

        .toolbar__filter {
          justify-content: flex-start;
        }
      }
    `,
  ],
})
export class CustomerToolbarComponent {
  readonly searchTerm = input('');
  readonly filterExpanded = input(false);

  readonly searchChange = output<string>();
  readonly filterToggle = output<void>();
  readonly fieldsChange = output<string[]>();
}
