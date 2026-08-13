import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Dashboard } from './dashboard';
import { AuthStore } from '../../core/store/auth.store';
import { UsersStore } from '../../core/store/users.store';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;
  let authStoreMock: {
    user: ReturnType<typeof vi.fn>;
  };
  let usersStoreMock: {
    users: ReturnType<typeof vi.fn>;
    pageState: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    authStoreMock = {
      user: vi.fn().mockReturnValue(null),
    };
    usersStoreMock = {
      users: vi.fn().mockReturnValue([]),
      pageState: vi.fn().mockReturnValue(3),
    };

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthStore, useValue: authStoreMock },
        { provide: UsersStore, useValue: usersStoreMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should compute pageState from usersStore', () => {
    expect(component.pageState()).toBe(3);
  });
});
