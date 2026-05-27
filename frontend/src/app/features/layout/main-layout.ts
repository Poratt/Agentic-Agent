import { Component, inject, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { AuthStore } from '../../core/store/auth.store';
import { ChatStore } from '../../core/store/chat.store';
import { getUserRoleData } from '../../core/enums/user-role.enum';
import { BadgeColor } from '../../core/directives/badge-color.directive';
import { ThemeService } from '../../core/services/theme.service';
import { AllSessionsDialog } from '../chat/all-sessions-dialog/all-sessions-dialog';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, BadgeColor],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
})
export class MainLayout implements OnInit {
  protected authStore = inject(AuthStore);
  protected chatStore = inject(ChatStore);
  protected themeService = inject(ThemeService);
  
  private dialogService = inject(DialogService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  
  private dialogRef?: DynamicDialogRef;
  protected readonly getUserRoleData = getUserRoleData;

  ngOnInit() {
    this.chatStore.loadSessions();
  }

  openAllSessionsDialog() {
    const dialogRef = this.dialogService.open(AllSessionsDialog, {
      header: 'ארכיון כל השיחות',
      width: '500px',
      modal: true,
      breakpoints: {
        '960px': '75vw',
        '640px': '90vw',
      },
      style: {
        'background': 'var(--color-bg)',
        'border': '1px solid var(--color-border)',
        'border-radius': 'var(--radius-lg)',
      },
    });

    this.dialogRef?.onClose
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((selectedSessionId: number | undefined) => {
        if (selectedSessionId) {
          this.chatStore.currentSessionId.set(selectedSessionId);
          this.router.navigate(['/chat'], { queryParams: { sessionId: selectedSessionId } });
        }
      });
  }
}