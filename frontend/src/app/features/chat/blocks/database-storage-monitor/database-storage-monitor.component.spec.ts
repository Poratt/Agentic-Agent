import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DatabaseStorageMonitorComponent, DatabaseStorageRenderData } from './database-storage-monitor.component';

class MockIntersectionObserver {
    observe = () => {};
    unobserve = () => {};
    disconnect = () => {};
}

beforeAll(() => {
    (window as any).IntersectionObserver = MockIntersectionObserver;
});

afterAll(() => {
    delete (window as any).IntersectionObserver;
});

describe('DatabaseStorageMonitorComponent', () => {
    let component: DatabaseStorageMonitorComponent;
    let fixture: ComponentFixture<DatabaseStorageMonitorComponent>;

    const sampleData: DatabaseStorageRenderData = {
        databaseName: 'agentic_admin',
        tableCount: 3,
        totalRows: 15200,
        totalSizeFormatted: '24.5 MB',
        tables: [
            { tableName: 'users', rowCount: 10000, totalSizeFormatted: '12 MB', percentOfDatabase: 49, totalSizeBytes: 12582912 },
            { tableName: 'chat_messages', rowCount: 4000, totalSizeFormatted: '8 MB', percentOfDatabase: 33, totalSizeBytes: 8388608 },
            { tableName: 'sessions', rowCount: 1200, totalSizeFormatted: '4.5 MB', percentOfDatabase: 18, totalSizeBytes: 4718592 },
        ],
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DatabaseStorageMonitorComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(DatabaseStorageMonitorComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('data', sampleData);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display database name', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('agentic_admin');
    });

    it('should display table count', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('3');
    });

    it('should display total size', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('24.5 MB');
    });

    it('should render table rows sorted by size desc', () => {
        const el = fixture.nativeElement as HTMLElement;
        const rows = el.querySelectorAll('.table-row');
        expect(rows.length).toBe(3);
        const firstName = rows[0].querySelector('.table-name');
        expect(firstName?.textContent).toContain('users');
    });

    it('should render donut chart', () => {
        const el = fixture.nativeElement as HTMLElement;
        const donut = el.querySelector('.donut');
        expect(donut).toBeTruthy();
    });
});
