import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { Header } from './header';
import { AuthStore } from '../../../core/store/auth.store';
import { ThemeService } from '../../../core/services/theme.service';

describe('Header', () => {
  let component: Header;
  let fixture: ComponentFixture<Header>;
  let authStoreMock: {
    user: ReturnType<typeof signal>;
    logout: ReturnType<typeof vi.fn>;
  };
  let themeServiceMock: {
    mode: ReturnType<typeof signal>;
    toggle: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    authStoreMock = {
      user: signal({ email: 'test@example.com' } as any),
      logout: vi.fn(),
    };
    themeServiceMock = {
      mode: signal<'dark' | 'light'>('dark'),
      toggle: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthStore, useValue: authStoreMock },
        { provide: ThemeService, useValue: themeServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should compute userEmail from authStore', () => {
    expect((component as any).userEmail()).toBe('test@example.com');
  });

  it('should compute avatarLetter from email', () => {
    expect((component as any).avatarLetter()).toBe('T');
  });

  it('should return ? when no email', () => {
    authStoreMock.user.set(null);
    fixture.detectChanges();
    expect((component as any).avatarLetter()).toBe('?');
  });

  it('should have menu items', () => {
    const items = (component as any).menuItems();
    expect(items.length).toBeGreaterThanOrEqual(2);
  });
});
