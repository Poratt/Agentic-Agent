import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { IdeasProgress } from './ideas-progress';

describe('IdeasProgress', () => {
  let component: IdeasProgress;
  let fixture: ComponentFixture<IdeasProgress>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IdeasProgress],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(IdeasProgress);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should accept phase and statusText inputs', () => {
    fixture.componentRef.setInput('phase', 1);
    fixture.componentRef.setInput('statusText', 'Building ideas...');
    fixture.detectChanges();
    expect(component.phase()).toBe(1);
    expect(component.statusText()).toBe('Building ideas...');
  });
});
