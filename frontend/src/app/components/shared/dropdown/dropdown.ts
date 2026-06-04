import { Component, OnInit, inject, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthStore } from '../../../core/store/auth.store';
import { ChatStore } from '../../../core/store/chat.store';
import { getUserRoleData } from '../../../core/enums/user-role.enum';
import { BadgeColor } from '../../../core/directives/badge-color.directive';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
    selector: 'app-dropdown',
    standalone: true,
    imports: [CommonModule, RouterLink, RouterLinkActive, BadgeColor],
    templateUrl: './dropdown.html',
    styleUrl: './dropdown.css',
})
export class MainSidebar {

    public dropdownTrigger = signal(false);



    showDropdown() {
        this.dropdownTrigger.set(true);
    }

    hideDropdown() {
        this.dropdownTrigger.set(false);
    }


}