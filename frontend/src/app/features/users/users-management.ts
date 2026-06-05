import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../../core/store/auth.store';
import { UsersStore } from '../../core/store/users.store';
import { UserRole } from '../../core/enums/user-role.enum';
import { PageStates } from '../../core/enums/page-states.enum';
import { getUserRoleData } from '../../core/enums/user-role.enum';
import { BadgeColor } from '../../core/directives/badge-color.directive';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-users-management',
  standalone: true,
  imports: [CommonModule, BadgeColor, FormsModule],
  templateUrl: './users-management.html',
})
export class UsersManagement implements OnInit {
  protected authStore = inject(AuthStore);
  protected usersStore = inject(UsersStore);
  protected readonly getUserRoleData = getUserRoleData;
  protected readonly PageStates = PageStates;

  pageState = computed(() => this.usersStore.pageState());
  searchQuery = signal('');
  roleFilter = signal<UserRole | null>(null);
  dateFilter = signal('');

  filteredUsers = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const role = this.roleFilter();
    const date = this.dateFilter();

    return this.usersStore.users().filter((user) => {
      const roleData = this.getUserRoleData(user.role);
      const userDate = new Date(user.createdAt).toISOString().slice(0, 10);

      const matchesQuery =
        !query ||
        user.fullName?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        roleData?.label.toLowerCase().includes(query) ||
        roleData?.heLabel?.toLowerCase().includes(query);

      const matchesRole = role === null || user.role === role;
      const matchesDate = !date || userDate === date;

      return matchesQuery && matchesRole && matchesDate;
    });
  });

  ngOnInit() {
    this.usersStore.loadUsers();
    console.log(this.getUserRoleData(1)?.icon);
  }


  onSearchChange(query: string) {
    this.searchQuery.set(query);
  }


  toggleRole(userId: number, currentRole: UserRole) {
    const targetRole = currentRole === UserRole.Admin ? UserRole.User : UserRole.Admin;
    this.usersStore.updateUserRole(userId, targetRole);
  }

  getUserRoleIcon(role: UserRole) {
    const icon = this.getUserRoleData(role)?.icon ?? '';
    return {
      ph: true,
      [icon]: !!icon,
      sm: true,
    };
  }


  deleteUser(userId: number) {
    if (confirm('האם אתה בטוח שברצונך למחוק משתמש זה? פעולה זו אינה הפיכה.')) {
      this.usersStore.deleteUser(userId);
    }
  }


}