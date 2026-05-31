import { Component, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../../core/store/auth.store';
import { UsersStore } from '../../core/store/users.store';
import { UserRole } from '../../core/enums/user-role.enum';
import { PageStates } from '../../core/enums/page-states.enum';
import { getUserRoleData } from '../../core/enums/user-role.enum';
import { BadgeColor } from '../../core/directives/badge-color.directive';

@Component({
  selector: 'app-users-management',
  standalone: true,
  imports: [CommonModule, BadgeColor],
  templateUrl: './users-management.html',
})
export class UsersManagement implements OnInit {
  protected authStore = inject(AuthStore);
  protected usersStore = inject(UsersStore);
  protected readonly getUserRoleData = getUserRoleData;
  protected readonly PageStates = PageStates;

  pageState = computed(() => this.usersStore.pageState());

  ngOnInit() {
    this.usersStore.loadUsers();
    console.log(this.getUserRoleData(1)?.icon);
    
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