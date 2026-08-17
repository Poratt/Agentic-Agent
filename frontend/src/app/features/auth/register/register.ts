import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/store/auth.store';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './register.html',
})
export class Register {
    protected authStore = inject(AuthStore);
    private fb = inject(FormBuilder);

    registerForm: FormGroup = this.fb.group({
        fullName: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(8)]],
    });

    onSubmit() {
        if (this.registerForm.invalid) {
            // Keep the button clickable (no [disabled] on invalid) so the
            // hit-target is never blocked — surface the validation errors
            // on submit instead.
            this.registerForm.markAllAsTouched();
            return;
        }
        this.authStore.register(this.registerForm.value);
    }
}
