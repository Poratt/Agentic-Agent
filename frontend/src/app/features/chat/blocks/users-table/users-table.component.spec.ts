import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UsersTableComponent, UsersTableRenderData } from './users-table.component';

describe('UsersTableComponent', () => {
    let component: UsersTableComponent;
    let fixture: ComponentFixture<UsersTableComponent>;

    const sampleData: UsersTableRenderData = {
        users: [
            { id: 1, fullName: 'Alice Smith', email: 'alice@example.com', role: 1, createdAt: '2026-01-15T10:00:00Z' },
            { id: 2, fullName: 'Bob Jones', email: 'bob@example.com', role: 2, createdAt: '2026-03-20T14:30:00Z' },
        ],
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [UsersTableComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(UsersTableComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('data', sampleData);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display users in table', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('Alice Smith');
        expect(el.textContent).toContain('Bob Jones');
    });

    it('should display emails', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('alice@example.com');
        expect(el.textContent).toContain('bob@example.com');
    });

    it('should display Admin badge for role 1', () => {
        const el = fixture.nativeElement as HTMLElement;
        const badges = el.querySelectorAll('.badge.role-admin');
        expect(badges.length).toBe(1);
        expect(badges[0].textContent).toContain('Admin');
    });

    it('should display User badge for role 2', () => {
        const el = fixture.nativeElement as HTMLElement;
        const badges = el.querySelectorAll('.badge.role-user');
        expect(badges.length).toBe(1);
        expect(badges[0].textContent).toContain('User');
    });

    it('should display formatted dates', () => {
        const el = fixture.nativeElement as HTMLElement;
        const dateCells = el.querySelectorAll('.cell-date');
        expect(dateCells.length).toBe(2);
    });

    it('should show empty state when no users', () => {
        fixture.componentRef.setInput('data', { users: [] });
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        expect(el.querySelector('.empty-state')).toBeTruthy();
    });

    it('should show empty state when users is undefined', () => {
        fixture.componentRef.setInput('data', {});
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        expect(el.querySelector('.empty-state')).toBeTruthy();
    });
});
