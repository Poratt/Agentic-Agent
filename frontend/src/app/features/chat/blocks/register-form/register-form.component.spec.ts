import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterFormComponent, RegisterFormRenderData } from './register-form.component';

describe('RegisterFormComponent', () => {
    let component: RegisterFormComponent;
    let fixture: ComponentFixture<RegisterFormComponent>;

    const sampleData: RegisterFormRenderData = {
        fullName: 'John Doe',
        email: 'john@example.com',
        password: 'secret123',
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [RegisterFormComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(RegisterFormComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('data', sampleData);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display form title', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('Register');
    });

    it('should display full name field value', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('John Doe');
    });

    it('should display email field value', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('john@example.com');
    });

    it('should mask password field', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('••••••••');
    });

    it('should display submit button', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('Create Account');
    });

    it('should show placeholders when data is empty', () => {
        fixture.componentRef.setInput('data', {});
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('Enter your full name');
        expect(el.textContent).toContain('Enter your email');
        expect(el.textContent).toContain('Enter your password');
    });
});
