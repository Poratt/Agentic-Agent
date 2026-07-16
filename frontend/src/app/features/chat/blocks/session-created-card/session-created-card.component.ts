import { Component, input, ChangeDetectionStrategy } from '@angular/core';

export interface SessionCreatedRenderData {
    id?: number;
    title?: string;
    createdAt?: string;
    updatedAt?: string;
}

@Component({
    selector: 'app-session-created-card',
    standalone: true,
    templateUrl: './session-created-card.component.html',
    styleUrl: './session-created-card.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionCreatedCardComponent {
    data = input.required<SessionCreatedRenderData>();
}
