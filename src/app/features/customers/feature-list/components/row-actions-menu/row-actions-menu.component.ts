import { ChangeDetectionStrategy, Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { OverlayPanel, OverlayPanelModule } from 'primeng/overlaypanel';
import { Customer } from '../../../../../core/models/customer.model';

export type RowActionKey =
  | 'view'
  | 'edit'
  | 'delete'
  | 'changeStatus'
  | 'location'
  | 'attachment'
  | 'salesOrder'
  | 'followUp'
  | 'log'
  | 'nfc'
  | 'addPotential'
  | 'potential'
  | 'contacts';

interface RowActionDef {
  key: RowActionKey;
  label: string;
  icon: string;
  colorClass: string;
}

/**
 * Reproduces the two-column action dropdown shown in the task screenshots.
 * PrimeNG's `p-menu` only renders a single column, so this is a small
 * purpose-built overlay instead — still reusable across any row/entity that
 * needs the same action set.
 */
@Component({
  selector: 'app-row-actions-menu',
  standalone: true,
  imports: [OverlayPanelModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-overlayPanel #panel styleClass="row-actions-panel">
      <div class="row-actions-grid">
        @for (action of actions; track action.key) {
          <button
            type="button"
            class="row-actions-grid__item"
            [class.row-actions-grid__item--danger]="action.key === 'delete'"
            (click)="handle(action.key); panel.hide()"
          >
            <i [class]="action.icon" [style.color]="action.colorClass"></i>
            <span>{{ action.label }}</span>
          </button>
        }
      </div>
    </p-overlayPanel>
  `,
  styles: [
    `
      .row-actions-grid {
        display: grid;
        grid-template-columns: repeat(3, 92px);
        gap: 0 10px;
        padding: 6px 7px;
      }
      .row-actions-grid__item {
        display: flex;
        align-items: center;
        gap: 6px;
        border: none;
        background: transparent;
        min-height: 25px;
        padding: 5px 3px;
        border-radius: 4px;
        font-size: 0.6rem;
        font-weight: 600;
        color: #0f172a;
        cursor: pointer;
        text-align: left;
        white-space: nowrap;

        i {
          font-size: 0.68rem;
          width: 12px;
        }

        &:hover {
          background: #f1f5f9;
        }

        &--danger {
          color: #dc2626;
        }
      }
    `,
  ],
})
export class RowActionsMenuComponent {
  @ViewChild('panel') panel!: OverlayPanel;

  @Output() action = new EventEmitter<{ key: RowActionKey; customer: Customer }>();

  private currentCustomer: Customer | null = null;

  protected readonly actions: RowActionDef[] = [
    { key: 'view', label: 'View', icon: 'pi pi-eye', colorClass: '#f59e0b' },
    { key: 'edit', label: 'Edit', icon: 'pi pi-pencil', colorClass: '#16a34a' },
    { key: 'delete', label: 'Delete', icon: 'pi pi-trash', colorClass: '#dc2626' },
    { key: 'changeStatus', label: 'Change Status', icon: 'pi pi-sync', colorClass: '#0ea5e9' },
    { key: 'location', label: 'Location', icon: 'pi pi-map-marker', colorClass: '#0ea5e9' },
    { key: 'attachment', label: 'Attachment', icon: 'pi pi-paperclip', colorClass: '#8b5cf6' },
    { key: 'salesOrder', label: 'Sales Order', icon: 'pi pi-shopping-cart', colorClass: '#0ea5e9' },
    { key: 'followUp', label: 'Follow-Up', icon: 'pi pi-flag', colorClass: '#f59e0b' },
    { key: 'log', label: 'Log', icon: 'pi pi-history', colorClass: '#f59e0b' },
    { key: 'nfc', label: 'NFC', icon: 'pi pi-wifi', colorClass: '#ec4899' },
    { key: 'addPotential', label: 'Add Potential', icon: 'pi pi-star', colorClass: '#16a34a' },
    { key: 'potential', label: 'Potential', icon: 'pi pi-star-fill', colorClass: '#f59e0b' },
    { key: 'contacts', label: 'Contacts', icon: 'pi pi-address-book', colorClass: '#0ea5e9' },
  ];

  toggle(event: Event, customer: Customer): void {
    this.currentCustomer = customer;
    this.panel.toggle(event);
  }

  protected handle(key: RowActionKey): void {
    if (this.currentCustomer) {
      this.action.emit({ key, customer: this.currentCustomer });
    }
  }
}
