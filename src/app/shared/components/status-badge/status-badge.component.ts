import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge" [class]="'badge--' + tone()">{{ label() }}</span>
  `,
  styles: [
    `
      .badge {
        display: inline-flex;
        align-items: center;
        padding: 2px 10px;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
        line-height: 1.6;
        white-space: nowrap;
      }
      .badge--neutral { background: #f1f5f9; color: #475569; }
      .badge--success { background: #dcfce7; color: #15803d; }
      .badge--warning { background: #fef9c3; color: #a16207; }
      .badge--danger { background: #fee2e2; color: #b91c1c; }
      .badge--info { background: #dbeafe; color: #1d4ed8; }
    `,
  ],
})
export class StatusBadgeComponent {
  readonly label = input.required<string>();
  readonly tone = input<BadgeTone>('neutral');

  protected readonly computedTone = computed(() => this.tone());
}
