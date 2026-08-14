import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { IdeasPage } from './ideas-page';
import { IdeasStore } from '../../../core/store/ideas.store';

describe('IdeasPage', () => {
  let component: IdeasPage;
  let fixture: ComponentFixture<IdeasPage>;
  let ideasStoreMock: {
    loadNightlyUnread: ReturnType<typeof vi.fn>;
    markNightlyRead: ReturnType<typeof vi.fn>;
    loadSessions: ReturnType<typeof vi.fn>;
    pageState: ReturnType<typeof vi.fn>;
    nightlyUnread: ReturnType<typeof vi.fn>;
    ideas: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    loading: ReturnType<typeof vi.fn>;
    phase: ReturnType<typeof vi.fn>;
    statusText: ReturnType<typeof vi.fn>;
    partial: ReturnType<typeof vi.fn>;
    totalRequested: ReturnType<typeof vi.fn>;
    generate: ReturnType<typeof vi.fn>;
    domain: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    setCount: ReturnType<typeof vi.fn>;
    stopGenerating: ReturnType<typeof vi.fn>;
    modelSelection: ReturnType<typeof vi.fn>;
    sessions: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    ideasStoreMock = {
      loadNightlyUnread: vi.fn(),
      markNightlyRead: vi.fn(),
      loadSessions: vi.fn(),
      pageState: vi.fn().mockReturnValue(3),
      nightlyUnread: vi.fn().mockReturnValue(0),
      ideas: vi.fn().mockReturnValue([]),
      error: vi.fn().mockReturnValue(null),
      loading: vi.fn().mockReturnValue(false),
      phase: vi.fn().mockReturnValue(0),
      statusText: vi.fn().mockReturnValue(''),
      partial: vi.fn().mockReturnValue(false),
      totalRequested: vi.fn().mockReturnValue(0),
      generate: vi.fn(),
      domain: vi.fn().mockReturnValue(''),
      count: vi.fn().mockReturnValue(5),
      setCount: vi.fn(),
      stopGenerating: vi.fn(),
      modelSelection: vi.fn().mockReturnValue(undefined),
      sessions: vi.fn().mockReturnValue([]),
    };

    await TestBed.configureTestingModule({
      imports: [IdeasPage],
      providers: [
        provideZonelessChangeDetection(),
        { provide: IdeasStore, useValue: ideasStoreMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IdeasPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call loadNightlyUnread on init', () => {
    expect(ideasStoreMock.loadNightlyUnread).toHaveBeenCalled();
  });
});
