import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { of, throwError } from 'rxjs';
import { GeneticsStore } from './genetics.store';
import { GeneticsService } from '../services/genetics.service';
import { IGenetics } from '../models/genetics.interface';

describe('GeneticsStore', () => {
  let geneticsService: {
    update: ReturnType<typeof vi.fn>;
    enrich: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    geneticsService = {
      update: vi.fn(),
      enrich: vi.fn(),
      delete: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        GeneticsStore,
        { provide: GeneticsService, useValue: geneticsService },
      ],
    });
  });

  function create(): GeneticsStore {
    return TestBed.inject(GeneticsStore);
  }

  describe('update', () => {
    it('calls service and reloads on success', () => {
      geneticsService.update.mockReturnValue(of({ result: {} as IGenetics }));
      const store = create();
      store.update('OG Kush', { description: 'Updated desc' });

      expect(geneticsService.update).toHaveBeenCalledWith('OG Kush', { description: 'Updated desc' });
      expect(store.error()).toBeNull();
    });

    it('sets error on failure', () => {
      geneticsService.update.mockReturnValue(
        throwError(() => ({ error: { message: 'Update failed' } })),
      );
      const store = create();
      store.update('OG Kush', { description: 'Updated desc' });

      expect(store.error()).toBeTruthy();
    });
  });

  describe('enrich', () => {
    it('resolves result on success', async () => {
      const enriched: IGenetics = {
        id: 1, name: 'OG Kush', description: 'Enriched',
        color: '#000', colorDark: '#000', colorLight: '#fff',
      };
      geneticsService.enrich.mockReturnValue(of({ result: enriched }));
      const store = create();

      const result = await store.enrich('OG Kush');
      expect(result).toEqual(enriched);
    });

    it('sets error and rejects on failure', async () => {
      geneticsService.enrich.mockReturnValue(
        throwError(() => ({ error: { message: 'Enrich failed' } })),
      );
      const store = create();

      await expect(store.enrich('OG Kush')).rejects.toBeTruthy();
      expect(store.error()).toBeTruthy();
    });
  });

  describe('delete', () => {
    it('resolves on success', async () => {
      geneticsService.delete.mockReturnValue(of({ result: undefined }));
      const store = create();

      await store.delete('OG Kush');
      expect(geneticsService.delete).toHaveBeenCalledWith('OG Kush');
      expect(store.error()).toBeNull();
    });

    it('sets error and rejects on failure', async () => {
      geneticsService.delete.mockReturnValue(
        throwError(() => ({ error: { message: 'Delete failed' } })),
      );
      const store = create();

      await expect(store.delete('OG Kush')).rejects.toBeTruthy();
      expect(store.error()).toBeTruthy();
    });
  });

  describe('clearError', () => {
    it('resets error to null', () => {
      geneticsService.update.mockReturnValue(
        throwError(() => ({ error: { message: 'fail' } })),
      );
      const store = create();
      store.update('OG Kush', {});
      expect(store.error()).toBeTruthy();

      store.clearError();
      expect(store.error()).toBeNull();
    });
  });
});
