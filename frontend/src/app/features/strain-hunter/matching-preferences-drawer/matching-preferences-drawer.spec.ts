import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { MatchingPreferencesDrawer } from './matching-preferences-drawer';
import { MatchingEngineStore } from '../../../core/store/matching-engine.store';
import { TerpeneStore } from '../../../core/store/terpene.store';
import { GeneticsStore } from '../../../core/store/genetics.store';

describe('MatchingPreferencesDrawer', () => {
  let component: MatchingPreferencesDrawer;
  let fixture: ComponentFixture<MatchingPreferencesDrawer>;
  let engineMock: {
    cyclePref: ReturnType<typeof vi.fn>;
    setWeight: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
    prefs: ReturnType<typeof vi.fn>;
    weights: ReturnType<typeof vi.fn>;
    hasAnyPreference: ReturnType<typeof vi.fn>;
    prefState: ReturnType<typeof vi.fn>;
    setPref: ReturnType<typeof vi.fn>;
    topScored: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    engineMock = {
      cyclePref: vi.fn(),
      setWeight: vi.fn(),
      reset: vi.fn(),
      prefs: vi.fn().mockReturnValue({}),
      weights: vi.fn().mockReturnValue({ terpene: 60, genetics: 40 }),
      hasAnyPreference: vi.fn().mockReturnValue(false),
      prefState: vi.fn().mockReturnValue('neutral'),
      setPref: vi.fn(),
      topScored: vi.fn().mockReturnValue([]),
    };

    const terpeneStoreMock = {
      terpenes: vi.fn().mockReturnValue([]),
      reload: vi.fn(),
    };
    const geneticsStoreMock = {
      genetics: vi.fn().mockReturnValue([]),
      reload: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [MatchingPreferencesDrawer],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MatchingEngineStore, useValue: engineMock },
        { provide: TerpeneStore, useValue: terpeneStoreMock },
        { provide: GeneticsStore, useValue: geneticsStoreMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MatchingPreferencesDrawer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('categories computed should group items into terpene and genetics', () => {
    fixture.componentRef.setInput('items', [
      { terpenes: 'Myrcene,Limonene', originStrain: 'Haze', parent1: 'NL', parent2: 'SK' },
    ]);
    fixture.detectChanges();
    const cats = component.categories();
    expect(cats.length).toBe(2);
    expect(cats[0].category).toBe('terpene');
    expect(cats[0].items.length).toBe(2);
    expect(cats[1].category).toBe('genetics');
    expect(cats[1].items.length).toBe(3);
  });

  it('cycle should call engine.cyclePref', () => {
    component.cycle('terpene', 'Myrcene');
    expect(engineMock['cyclePref']).toHaveBeenCalledWith('terpene:Myrcene');
  });

  it('onWeightChange should call engine.setWeight', () => {
    const event = { target: { value: '70' } } as unknown as Event;
    component.onWeightChange('terpene', event);
    expect(engineMock['setWeight']).toHaveBeenCalledWith('terpene', 30);
  });

  it('reset should call engine.reset', () => {
    component.reset();
    expect(engineMock['reset']).toHaveBeenCalled();
  });
});
