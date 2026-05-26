import { Component, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../../core/store/auth.store';
import { UsersStore } from '../../core/store/users.store';
import { PageStates } from '../../core/enums/page-states.enum';
import { getUserRoleData } from '../../core/enums/user-role.enum';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  protected authStore = inject(AuthStore);
  protected usersStore = inject(UsersStore);
  protected readonly getUserRoleData = getUserRoleData;
  protected readonly PageStates = PageStates;

  pageState = computed(() => this.usersStore.pageState());

  ngOnInit() {
    this.usersStore.loadUsers();
  }
}