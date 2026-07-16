import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoleChangeCardComponent, RoleChangeRenderData } from './role-change-card.component';

describe('RoleChangeCardComponent', () => {
    let component: RoleChangeCardComponent;
    let fixture: ComponentFixture<RoleChangeCardComponent>;

    const sampleData: RoleChangeRenderData = {
        id: 99,
        email: 'alice@example.com',
        fullName: 'Alice Smith',
        role: 1,
        updatedAt: '2026-07-15T12:00:00Z',
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [RoleChangeCardComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(RoleChangeCardComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('data', sampleData);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display email', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('alice@example.com');
    });

    it('should display fullName', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('Alice Smith');
    });

    it('should display id', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('99');
    });

    it('should show Admin badge for role 1', () => {
        const el = fixture.nativeElement as HTMLElement;
        const badge = el.querySelector('.role-badge.admin');
        expect(badge).toBeTruthy();
        expect(badge?.textContent).toContain('Admin');
    });

    it('should show User badge for role 2', () => {
        fixture.componentRef.setInput('data', { ...sampleData, role: 2 });
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        const badge = el.querySelector('.role-badge.user');
        expect(badge).toBeTruthy();
        expect(badge?.textContent).toContain('User');
    });

    it('should display updatedAt', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('2026-07-15T12:00:00Z');
    });
});
