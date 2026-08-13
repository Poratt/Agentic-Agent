import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal, WritableSignal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { Login } from './login';
import { AuthStore } from '../../../core/store/auth.store';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let authStoreMock: {
    login: ReturnType<typeof vi.fn>;
    error: WritableSignal<string | null>;
    loading: WritableSignal<boolean>;
  };

  beforeEach(async () => {
    authStoreMock = {
      login: vi.fn(),
      error: signal<string | null>(null),
      loading: signal(false),
    };

    await TestBed.configureTestingModule({
      imports: [Login, ReactiveFormsModule],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthStore, useValue: authStoreMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have invalid form initially', () => {
    expect(component.loginForm.valid).toBe(false);
  });

  it('should validate email format', () => {
    const emailCtrl = component.loginForm.get('email')!;
    emailCtrl.setValue('invalid');
    expect(emailCtrl.valid).toBe(false);
    emailCtrl.setValue('test@example.com');
    expect(emailCtrl.valid).toBe(true);
  });

  it('should validate password required', () => {
    const passwordCtrl = component.loginForm.get('password')!;
    passwordCtrl.setValue('');
    expect(passwordCtrl.valid).toBe(false);
    passwordCtrl.setValue('secret');
    expect(passwordCtrl.valid).toBe(true);
  });

  it('should call authStore.login on valid submit', () => {
    component.loginForm.setValue({ email: 'a@b.com', password: 'pass' });
    component.onSubmit();
    expect(authStoreMock.login).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pass' });
  });

  it('should not call authStore.login on invalid form', () => {
    component.onSubmit();
    expect(authStoreMock.login).not.toHaveBeenCalled();
  });

  it('should display error from authStore', () => {
    authStoreMock.error.set('Invalid credentials');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.error-badge')?.textContent).toContain('Invalid credentials');
  });

  it('should disable submit when loading', () => {
    authStoreMock.loading.set(true);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
