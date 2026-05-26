import { Directive, inject, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { UserRole } from '../enums/user-role.enum';
import { AuthStore } from '../store/auth.store';

@Directive({
  selector: '[accessTo]',
  standalone: true,
})
export class AccessToDirective {
  private templateRef = inject(TemplateRef<unknown>);
  private vcr = inject(ViewContainerRef);
  private authStore = inject(AuthStore);

  @Input() set accessTo(roles: UserRole[]) {
    const userRole = this.authStore.user()?.role;
    const hasAccess = roles.includes(userRole as UserRole);

    this.vcr.clear();
    if (hasAccess) {
      this.vcr.createEmbeddedView(this.templateRef);
    }
  }
}
