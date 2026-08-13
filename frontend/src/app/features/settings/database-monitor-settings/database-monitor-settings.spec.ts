import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { DatabaseMonitorSettings } from './database-monitor-settings';
import { DatabaseMonitorService, DatabaseStorageSummary } from '../../../core/services/database-monitor.service';
import { of } from 'rxjs';

function makeSummary(): DatabaseStorageSummary {
  return {
    databaseName: 'testdb',
    tableCount: 2,
    totalRows: 1000,
    totalSizeBytes: 1024,
    totalSizeFormatted: '1 KB',
    largestTableName: 'users',
    tables: [
      { tableName: 'users', rowCount: 500, dataSizeBytes: 512, indexSizeBytes: 128, totalSizeBytes: 640, dataSizeFormatted: '512B', indexSizeFormatted: '128B', totalSizeFormatted: '640B', percentOfDatabase: 62.5 },
      { tableName: 'posts', rowCount: 500, dataSizeBytes: 256, indexSizeBytes: 128, totalSizeBytes: 384, dataSizeFormatted: '256B', indexSizeFormatted: '128B', totalSizeFormatted: '384B', percentOfDatabase: 37.5 },
    ],
  };
}

describe('DatabaseMonitorSettings', () => {
  let component: DatabaseMonitorSettings;
  let fixture: ComponentFixture<DatabaseMonitorSettings>;
  let serviceMock: {
    getStorage: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    serviceMock = {
      getStorage: vi.fn().mockReturnValue(of({ success: true, result: makeSummary() })),
    };

    await TestBed.configureTestingModule({
      imports: [DatabaseMonitorSettings],
      providers: [
        provideZonelessChangeDetection(),
        { provide: DatabaseMonitorService, useValue: serviceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DatabaseMonitorSettings);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loadStorage should set data on success', async () => {
    await component.loadStorage();
    expect(component.data()).toBeTruthy();
    expect(component.data()?.databaseName).toBe('testdb');
  });

  it('getBarWidth should return a valid fraction', () => {
    const result = component.getBarWidth(50);
    expect(typeof result).toBe('string');
    expect(Number(result)).toBeGreaterThan(0);
    expect(Number(result)).toBeLessThanOrEqual(1);
  });

  it('getChartColor should return CSS variable', () => {
    const color = component.getChartColor(0);
    expect(color).toBe('var(--color-chart-1)');
  });

  it('chartSegments should compute segments from data', () => {
    const segments = component.chartSegments();
    expect(segments.length).toBe(2);
    expect(segments[0].tableName).toBe('users');
    expect(segments[1].tableName).toBe('posts');
  });

  it('chartSegments should be empty when no data', () => {
    component.data.set(null);
    expect(component.chartSegments().length).toBe(0);
  });
});
