import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface RegisterFormRenderData {
    fullName?: string;
    email?: string;
    password?: string;
}

@Component({
    selector: 'app-register-form',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './register-form.component.html',
    styleUrl: './register-form.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterFormComponent {
    data = input<RegisterFormRenderData>({});
}
