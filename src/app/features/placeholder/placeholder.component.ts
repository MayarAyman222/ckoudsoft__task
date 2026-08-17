import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="placeholder">
      <i class="pi pi-hammer"></i>
      <h2>Coming soon</h2>
      <p>This module is outside the scope of the current assessment task.</p>
    </div>
  `,
  styles: [
    `
      .placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 80px 0;
        color: #94a3b8;
        text-align: center;

        i {
          font-size: 2.5rem;
        }

        h2 {
          font-size: 1.1rem;
          color: #475569;
          margin: 0;
        }

        p {
          font-size: 0.85rem;
          margin: 0;
        }
      }
    `,
  ],
})
export class PlaceholderComponent {}
