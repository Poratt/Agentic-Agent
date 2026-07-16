import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeleteConfirmCardComponent, DeleteConfirmRenderData } from './delete-confirm-card.component';

describe('DeleteConfirmCardComponent', () => {
    let component: DeleteConfirmCardComponent;
    let fixture: ComponentFixture<DeleteConfirmCardComponent>;

    const sampleData: DeleteConfirmRenderData = {
        id: 42,
        entityType: 'User',
        name: 'John Doe',
        deleted: true,
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DeleteConfirmCardComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(DeleteConfirmCardComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('data', sampleData);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display entity type', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('User');
    });

    it('should display name', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('John Doe');
    });

    it('should display id', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('42');
    });

    it('should show deleted badge when deleted is true', () => {
        const el = fixture.nativeElement as HTMLElement;
        const badge = el.querySelector('.status-badge.deleted');
        expect(badge).toBeTruthy();
        expect(badge?.textContent).toContain('נמחק');
    });

    it('should show pending badge when deleted is false', () => {
        fixture.componentRef.setInput('data', { ...sampleData, deleted: false });
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        const badge = el.querySelector('.status-badge.pending');
        expect(badge).toBeTruthy();
        expect(badge?.textContent).toContain('ממתין למחיקה');
    });
});
