import { ChangeDetectionStrategy, Component, ViewChild, computed, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OverlayPanelModule, OverlayPanel } from 'primeng/overlaypanel';

interface SearchFieldOption {
  field: string;
  label: string;
}

const ALL_FIELDS: SearchFieldOption[] = [
  { field: 'Id', label: 'ID' },
  { field: 'Code', label: 'Code' },
  { field: 'NameAR', label: 'Name (AR)' },
  { field: 'NameEN', label: 'Name (EN)' },
  { field: 'Name', label: 'Name' },
  { field: 'Email', label: 'Email' },
  { field: 'Mobile', label: 'Mobile' },
  { field: 'ClientType', label: 'Client Type' },
  { field: 'AccountManager', label: 'Account Manager' },
  { field: 'City', label: 'City' },
  { field: 'Country', label: 'Country' },
];

/**
 * Reproduces the "ID ⊗ Code ⊗ Name ⊗ Email ⊗ Mobile ⊗ ⌄" chip row next to the
 * search box: the chips show which fields free-text search currently
 * matches against, and the chevron opens a searchable checklist to add or
 * remove fields — functionally wired into `CustomerStore.setSearchFields`.
 */
@Component({
  selector: 'app-search-fields-selector',
  standalone: true,
  imports: [FormsModule, OverlayPanelModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="search-fields">
      <div class="search-fields__chips">
        @for (opt of selectedOptions(); track opt.field) {
          <span class="chip">
            {{ opt.label }}
            <i class="pi pi-times-circle" (click)="toggleField(opt.field, false)"></i>
          </span>
        }
      </div>
      <button type="button" class="search-fields__toggle" (click)="panel.toggle($event)">
        <i class="pi pi-chevron-down"></i>
      </button>
    </div>

    <p-overlayPanel #panel styleClass="search-fields-panel">
      <div class="search-fields-panel">
        <div class="search-fields-panel__search">
          <i class="pi pi-search"></i>
          <input type="text" placeholder="Search fields" [(ngModel)]="queryText" />
        </div>
        <div class="search-fields-panel__list">
          @for (opt of filteredOptions(); track opt.field) {
            <label class="search-fields-panel__item">
              <input
                type="checkbox"
                [checked]="isSelected(opt.field)"
                (change)="toggleField(opt.field, $any($event.target).checked)"
              />
              <span>{{ opt.label }}</span>
            </label>
          }
        </div>
      </div>
    </p-overlayPanel>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .search-fields {
        display: flex;
        align-items: center;
        gap: 4px;
        border: 1px solid #d8e1ec;
        border-radius: 6px;
        height: var(--toolbar-height);
        padding: 0 4px 0 7px;
        background: #f7f9fc;
        min-width: 0;
      }
      .search-fields__chips {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: nowrap;
        overflow-x: auto;
        scrollbar-width: none;
        min-width: 0;
        flex: 1;
      }
      .search-fields__chips::-webkit-scrollbar {
        display: none;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        background: transparent;
        color: #0f172a;
        border-radius: 0;
        padding: 0;
        font-size: 0.58rem;
        font-weight: 600;
        white-space: nowrap;
        i {
          font-size: 0.52rem;
          cursor: pointer;
          color: #64748b;
          &:hover {
            color: #2563eb;
          }
        }
      }
      .search-fields__toggle {
        border: none;
        background: transparent;
        color: #94a3b8;
        cursor: pointer;
        width: 18px;
        height: 20px;
        padding: 0;
        border-left: 1px solid #d8e1ec;
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        &:hover {
          color: #475569;
        }
      }
      .search-fields__toggle i {
        font-size: 0.52rem;
      }
      .search-fields-panel {
        width: 220px;
        display: flex;
        flex-direction: column;
      }
      .search-fields-panel__search {
        display: flex;
        align-items: center;
        gap: 6px;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 6px 8px;
        margin-bottom: 8px;
        color: #94a3b8;
        input {
          border: none;
          outline: none;
          font-size: 0.8rem;
          width: 100%;
          color: #334155;
        }
      }
      .search-fields-panel__list {
        max-height: 220px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .search-fields-panel__item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 4px;
        font-size: 0.82rem;
        color: #334155;
        cursor: pointer;
        border-radius: 4px;
        &:hover {
          background: #f8fafc;
        }
      }
    `,
  ],
})
export class SearchFieldsSelectorComponent {
  @ViewChild('panel') panel!: OverlayPanel;

  readonly fieldsChange = output<string[]>();

  protected readonly queryText = signal('');
  private readonly selected = signal<string[]>(['Id', 'Code', 'Name', 'Email', 'Mobile']);

  protected readonly filteredOptions = computed(() => {
    const q = this.queryText().trim().toLowerCase();
    if (!q) return ALL_FIELDS;
    return ALL_FIELDS.filter((f) => f.label.toLowerCase().includes(q));
  });

  protected readonly selectedOptions = computed(() =>
    ALL_FIELDS.filter((f) => this.selected().includes(f.field))
  );

  protected isSelected(field: string): boolean {
    return this.selected().includes(field);
  }

  protected toggleField(field: string, checked: boolean): void {
    const current = this.selected();
    const next = checked ? [...current, field] : current.filter((f) => f !== field);
    this.selected.set(next);
    this.fieldsChange.emit(next);
  }
}
