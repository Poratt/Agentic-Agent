import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal, WritableSignal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { IdeasForm } from './ideas-form';
import { IdeasStore } from '../../../core/store/ideas.store';
import { LlmProviderStore } from '../../../core/store/llm-provider.store';

describe('IdeasForm', () => {
  let component: IdeasForm;
  let fixture: ComponentFixture<IdeasForm>;
  let storeMock: {
    // Must be a real signal — IdeasForm.canGenerate is a computed() and would
    // cache its first result forever against a plain vi.fn() mock.
    domain: WritableSignal<string>;
    count: ReturnType<typeof vi.fn>;
    loading: ReturnType<typeof vi.fn>;
    setDomain: ReturnType<typeof vi.fn>;
    setCount: ReturnType<typeof vi.fn>;
    setModel: ReturnType<typeof vi.fn>;
    generate: ReturnType<typeof vi.fn>;
    stopGenerating: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    storeMock = {
      domain: signal(''),
      count: vi.fn().mockReturnValue(5),
      loading: vi.fn().mockReturnValue(false),
      setDomain: vi.fn(),
      setCount: vi.fn(),
      setModel: vi.fn(),
      generate: vi.fn(),
      stopGenerating: vi.fn(),
    };

    const llmStoreMock = {
      chatModels: vi.fn().mockReturnValue([]),
      defaultModelId: vi.fn().mockReturnValue(null),
      providers: vi.fn().mockReturnValue([]),
      setDefaultModel: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [IdeasForm, ReactiveFormsModule],
      providers: [
        provideZonelessChangeDetection(),
        { provide: IdeasStore, useValue: storeMock },
        { provide: LlmProviderStore, useValue: llmStoreMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IdeasForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('incrementCount should call store.setCount with incremented value', () => {
    storeMock.count.mockReturnValue(5);
    component.incrementCount();
    expect(storeMock.setCount).toHaveBeenCalledWith(6);
  });

  it('incrementCount should not exceed 10', () => {
    storeMock.count.mockReturnValue(10);
    component.incrementCount();
    expect(storeMock.setCount).not.toHaveBeenCalled();
  });

  it('decrementCount should call store.setCount with decremented value', () => {
    storeMock.count.mockReturnValue(5);
    component.decrementCount();
    expect(storeMock.setCount).toHaveBeenCalledWith(4);
  });

  it('decrementCount should not go below 1', () => {
    storeMock.count.mockReturnValue(1);
    component.decrementCount();
    expect(storeMock.setCount).not.toHaveBeenCalled();
  });

  it('canGenerate should return true when domain is non-empty', () => {
    storeMock.domain.set('tech');
    expect(component.canGenerate()).toBe(true);
  });

  it('canGenerate should return false when domain is empty', () => {
    storeMock.domain.set('');
    expect(component.canGenerate()).toBe(false);
  });

  it('onGenerate should call store.generate when not loading', () => {
    storeMock.loading.mockReturnValue(false);
    storeMock.domain.set('tech');
    component.onGenerate();
    expect(storeMock.generate).toHaveBeenCalled();
  });

  it('onGenerate should not call store.generate when loading', () => {
    storeMock.loading.mockReturnValue(true);
    component.onGenerate();
    expect(storeMock.generate).not.toHaveBeenCalled();
  });

  it('onStopGenerate should call store.stopGenerating', () => {
    component.onStopGenerate();
    expect(storeMock.stopGenerating).toHaveBeenCalled();
  });
});
