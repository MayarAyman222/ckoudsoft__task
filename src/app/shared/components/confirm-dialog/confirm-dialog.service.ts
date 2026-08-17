import { Injectable, inject } from '@angular/core';
import { ConfirmationService } from 'primeng/api';

/**
 * Thin wrapper over PrimeNG's ConfirmationService so feature code depends on
 * a small app-owned API (`confirmDelete`) instead of the library directly.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly confirmationService = inject(ConfirmationService);

  confirmDelete(entityLabel: string, onAccept: () => void): void {
    this.confirmationService.confirm({
      header: `Delete ${entityLabel}?`,
      message: `This action cannot be undone. Are you sure you want to delete ${entityLabel}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      accept: onAccept,
    });
  }
}
