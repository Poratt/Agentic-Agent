import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MainSidebar } from '../main-sidebar/main-sidebar';

@Component({
	selector: 'app-main-layout',
	standalone: true,
	imports: [CommonModule, RouterOutlet, MainSidebar],
	templateUrl: './main-layout.html',
})
export class MainLayout {}

