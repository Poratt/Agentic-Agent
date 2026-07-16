import { Component, input, ChangeDetectionStrategy } from '@angular/core';

export interface DeleteConfirmRenderData {
    id?: number;
    entityType?: string;
    name?: string;
    deleted?: boolean;
}

@Component({
    selector: 'app-delete-confirm-card',
    standalone: true,
    templateUrl: './delete-confirm-card.component.html',
    styleUrl: './delete-confirm-card.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteConfirmCardComponent {
    data = input.required<DeleteConfirmRenderData>();
}
