import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { IdeaCard } from './idea-card';
import { SavedIdea } from '../../../core/models/saved-idea.model';

describe('IdeaCard', () => {
  let component: IdeaCard;
  let fixture: ComponentFixture<IdeaCard>;

  const mockIdea: SavedIdea = {
    id: 1,
    userId: 1,
    sessionId: 1,
    title: 'Test Idea',
    description: 'A test idea',
    targetMarket: 'Developers',
    validationScore: 8,
    validationReason: 'Good potential',
    risks: [],
    competitors: [],
    nextSteps: [],
    signalsReferenced: [],
    groundedInSignals: true,
    isFavorite: false,
    createdAt: '2026-01-01',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IdeaCard],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(IdeaCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('idea', mockIdea);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('scoreVariant returns success for score >= 7', () => {
    expect(component.scoreVariant(7)).toBe('success');
    expect(component.scoreVariant(9)).toBe('success');
  });

  it('scoreVariant returns warning for score 4-6', () => {
    expect(component.scoreVariant(4)).toBe('warning');
    expect(component.scoreVariant(6)).toBe('warning');
  });

  it('scoreVariant returns danger for score < 4', () => {
    expect(component.scoreVariant(0)).toBe('danger');
    expect(component.scoreVariant(3)).toBe('danger');
  });

  it('competitorSearchUrl builds an encoded Google search link', () => {
    expect(component.competitorSearchUrl('Vidyo.ai')).toBe('https://www.google.com/search?q=Vidyo.ai');
    expect(component.competitorSearchUrl('כלי וידאו')).toBe(
      `https://www.google.com/search?q=${encodeURIComponent('כלי וידאו')}`,
    );
  });

  it('toggle emits toggled event', () => {
    const spy = vi.fn();
    component.toggled.subscribe(spy);
    component.toggle();
    expect(spy).toHaveBeenCalled();
  });

  it('onToggleFav emits toggleFav event', () => {
    const spy = vi.fn();
    component.toggleFav.subscribe(spy);
    component.onToggleFav();
    expect(spy).toHaveBeenCalledWith({ ideaId: 1, isFavorite: true });
  });

  it('hides solo-dev sections when the fields are absent (old ideas)', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).not.toContain('סטק מוצע');
    expect(el.textContent).not.toContain('ערוץ הפצה ראשון');
    expect(el.textContent).not.toContain('זמן ל-MVP');
  });

  it('renders solo-dev sections when the fields exist', () => {
    fixture.componentRef.setInput('idea', {
      ...mockIdea,
      techStackSuggestion: 'Whisper API + Next.js',
      firstDistributionStep: 'פוסט ב-r/podcasting',
      estimatedMvpDays: 21,
    });
    fixture.componentRef.setInput('expanded', true);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Whisper API + Next.js');
    expect(el.textContent).toContain('פוסט ב-r/podcasting');
    expect(el.textContent).toContain('21');
  });
});
