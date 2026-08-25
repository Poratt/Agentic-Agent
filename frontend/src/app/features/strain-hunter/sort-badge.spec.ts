import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TableModule } from 'primeng/table';

@Component({
    imports: [TableModule],
    template: `
        <p-table sortMode="multiple" [multiSortMeta]="multiSortMeta" [value]="rows">
            <ng-template #header>
                <tr>
                    <th [pSortableColumn]="'price'">מחיר <p-sort-icon field="price" /></th>
                    <th [pSortableColumn]="'expiry'">תוקף <p-sort-icon field="expiry" /></th>
                </tr>
            </ng-template>
            <ng-template #body let-item>
                <tr>
                    <td>{{ item.price }}</td>
                    <td>{{ item.expiry }}</td>
                </tr>
            </ng-template>
        </p-table>
    `,
})
class SortBadgeHost {
    rows = [
        { price: 100, expiry: '02/27' },
        { price: 50, expiry: '01/27' },
    ];
    multiSortMeta = [
        { field: 'price', order: 1 },
        { field: 'expiry', order: 1 },
    ];
}

describe('PrimeNG multi-sort badge', () => {
    it('renders ordinal badges 1..N for every sorted column', async () => {
        await TestBed.configureTestingModule({
            imports: [SortBadgeHost],
            providers: [provideZonelessChangeDetection()],
        }).compileComponents();

        const fixture = TestBed.createComponent(SortBadgeHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const badges = fixture.debugElement.queryAll(By.css('.p-sortable-column-badge'));
        expect(badges.map((badge) => badge.nativeElement.textContent?.trim())).toEqual(['1', '2']);
    });

    it('renders no badge when only one column is sorted', async () => {
        await TestBed.configureTestingModule({
            imports: [SortBadgeHost],
            providers: [provideZonelessChangeDetection()],
        }).compileComponents();

        const fixture = TestBed.createComponent(SortBadgeHost);
        fixture.componentInstance.multiSortMeta = [{ field: 'price', order: 1 }];
        fixture.detectChanges();
        await fixture.whenStable();

        const badges = fixture.debugElement.queryAll(By.css('.p-sortable-column-badge'));
        expect(badges.length).toBe(0);
    });
});
