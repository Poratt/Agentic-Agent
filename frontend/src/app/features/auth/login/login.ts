import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/store/auth.store';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './login.html',
})
export class Login {
    protected authStore = inject(AuthStore);
    private fb = inject(FormBuilder);

    loginForm: FormGroup = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required]],
    });

    onSubmit() {
        if (this.loginForm.invalid) {
            // Keep the button clickable (no [disabled] on invalid) so the
            // hit-target is never blocked — surface the validation errors
            // on submit instead.
            this.loginForm.markAllAsTouched();
            return;
        }
        this.authStore.login(this.loginForm.value);
    }
}
