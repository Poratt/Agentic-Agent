import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthStore } from '../../core/store/auth.store';
import { getUserRoleData } from '../../core/enums/user-role.enum';
import { BadgeColor } from '../../core/directives/badge-color.directive';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, BadgeColor],
  templateUrl: './main-layout.html',
})
export class MainLayout {
  protected authStore = inject(AuthStore);
  protected readonly getUserRoleData = getUserRoleData;
}