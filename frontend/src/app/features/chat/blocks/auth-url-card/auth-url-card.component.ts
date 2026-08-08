import { Component, input, ChangeDetectionStrategy } from '@angular/core';

export interface AuthUrlRenderData {
    url: string;
    title?: string;
}

@Component({
    selector: 'app-auth-url-card',
    standalone: true,
    templateUrl: './auth-url-card.component.html',
    styleUrl: './auth-url-card.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthUrlCardComponent {
    data = input.required<AuthUrlRenderData>();
}