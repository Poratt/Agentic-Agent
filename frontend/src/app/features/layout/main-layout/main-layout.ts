import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Header } from '../header/header';
import { MainSidebar } from '../main-sidebar/main-sidebar';

@Component({
    selector: 'app-main-layout',
    standalone: true,
    imports: [CommonModule, RouterOutlet, MainSidebar, Header],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './main-layout.html',
})
export class MainLayout {}
