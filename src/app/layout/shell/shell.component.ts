import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BadgeModule } from 'primeng/badge';

interface NavItem {
  icon: string;
  label: string;
  route: string;
  favorite?: boolean;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, BadgeModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  protected readonly collapsed = signal(false);

  protected readonly userName = 'Khaled';
  protected readonly userInitial = this.userName.charAt(0).toUpperCase();

  protected readonly navItems: NavItem[] = [
    { icon: 'pi pi-th-large', label: 'Dashboard', route: '/dashboard' },
    { icon: 'pi pi-users', label: 'Customer', route: '/customers', favorite: true },
    { icon: 'pi pi-briefcase', label: 'Potential Request', route: '/potential-request' },
    { icon: 'pi pi-file', label: 'Quotation', route: '/quotation' },
    { icon: 'pi pi-shopping-cart', label: 'Sales Order', route: '/sales-order' },
    { icon: 'pi pi-ticket', label: 'Tickets', route: '/tickets' },
  ];
}
