import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { Register } from './register';
import { AuthStore } from '../../../core/store/auth.store';

describe('Register', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;
  let authStoreMock: {
    register: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    loading: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    authStoreMock = {
      register: vi.fn(),
      error: vi.fn().mockReturnValue(null),
      loading: vi.fn().mockReturnValue(false),
    };

    await TestBed.configureTestingModule({
      imports: [Register, ReactiveFormsModule],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthStore, useValue: authStoreMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have invalid form initially', () => {
    expect(component.registerForm.valid).toBe(false);
  });

  it('should validate fullName required', () => {
    const ctrl = component.registerForm.get('fullName')!;
    ctrl.setValue('');
    expect(ctrl.valid).toBe(false);
    ctrl.setValue('John');
    expect(ctrl.valid).toBe(true);
  });

  it('should validate email format', () => {
    const ctrl = component.registerForm.get('email')!;
    ctrl.setValue('bad');
    expect(ctrl.valid).toBe(false);
    ctrl.setValue('ok@test.com');
    expect(ctrl.valid).toBe(true);
  });

  it('should validate password minLength(8)', () => {
    const ctrl = component.registerForm.get('password')!;
    ctrl.setValue('short');
    expect(ctrl.valid).toBe(false);
    ctrl.setValue('longpass');
    expect(ctrl.valid).toBe(true);
  });

  it('should call authStore.register on valid submit', () => {
    component.registerForm.setValue({ fullName: 'John', email: 'a@b.com', password: 'password1' });
    component.onSubmit();
    expect(authStoreMock.register).toHaveBeenCalledWith({
      fullName: 'John',
      email: 'a@b.com',
      password: 'password1',
    });
  });

  it('should not call authStore.register on invalid form', () => {
    component.onSubmit();
    expect(authStoreMock.register).not.toHaveBeenCalled();
  });
});
