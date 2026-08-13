import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { RenderHostComponent } from './render-host.component';

describe('RenderHostComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RenderHostComponent],
      providers: [
        provideZonelessChangeDetection(),
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(RenderHostComponent);
    fixture.componentRef.setInput('componentType', 'unknown');
    fixture.componentRef.setInput('renderData', {});
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should accept componentType and renderData inputs', () => {
    const fixture = TestBed.createComponent(RenderHostComponent);
    fixture.componentRef.setInput('componentType', 'weather-current');
    fixture.componentRef.setInput('renderData', { temp: 25 });
    expect(fixture.componentInstance.componentType()).toBe('weather-current');
    expect(fixture.componentInstance.renderData()).toEqual({ temp: 25 });
  });
});
