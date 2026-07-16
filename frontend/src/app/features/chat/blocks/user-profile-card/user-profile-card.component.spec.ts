import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserProfileCardComponent, UserProfileRenderData } from './user-profile-card.component';

describe('UserProfileCardComponent', () => {
    let component: UserProfileCardComponent;
    let fixture: ComponentFixture<UserProfileCardComponent>;

    const sampleData: UserProfileRenderData = {
        sub: 42,
        email: 'alice@example.com',
        role: 1,
        iat: 1721030400,
        exp: 1721116800,
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [UserProfileCardComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(UserProfileCardComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('data', sampleData);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display ID', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('42');
    });

    it('should display email', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('alice@example.com');
    });

    it('should display Admin badge for role 1', () => {
        const el = fixture.nativeElement as HTMLElement;
        const badge = el.querySelector('.role-badge.admin');
        expect(badge).toBeTruthy();
        expect(badge?.textContent).toContain('Admin');
    });

    it('should display User badge for role 2', () => {
        fixture.componentRef.setInput('data', { ...sampleData, role: 2 });
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        const badge = el.querySelector('.role-badge.user');
        expect(badge).toBeTruthy();
        expect(badge?.textContent).toContain('User');
    });

    it('should display formatted timestamps', () => {
        const el = fixture.nativeElement as HTMLElement;
        const text = el.textContent ?? '';
        expect(text).toContain('Issued At:');
        expect(text).toContain('Expiration:');
    });
});
