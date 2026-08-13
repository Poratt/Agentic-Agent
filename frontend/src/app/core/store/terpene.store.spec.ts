import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { of, throwError } from 'rxjs';
import { TerpeneStore } from './terpene.store';
import { TerpeneService } from '../services/terpene.service';
import { ITerpene } from '../models/terpene.interface';

describe('TerpeneStore', () => {
  let terpeneService: {
    update: ReturnType<typeof vi.fn>;
    enrich: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    terpeneService = {
      update: vi.fn(),
      enrich: vi.fn(),
      delete: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        TerpeneStore,
        { provide: TerpeneService, useValue: terpeneService },
      ],
    });
  });

  function create(): TerpeneStore {
    return TestBed.inject(TerpeneStore);
  }

  describe('update', () => {
    it('calls service and reloads on success', () => {
      terpeneService.update.mockReturnValue(of({ result: {} as ITerpene }));
      const store = create();
      store.update('Myrcene', { description: 'Updated desc' });

      expect(terpeneService.update).toHaveBeenCalledWith('Myrcene', { description: 'Updated desc' });
      expect(store.error()).toBeNull();
    });

    it('sets error on failure', () => {
      terpeneService.update.mockReturnValue(
        throwError(() => ({ error: { message: 'Update failed' } })),
      );
      const store = create();
      store.update('Myrcene', { description: 'Updated desc' });

      expect(store.error()).toBeTruthy();
    });
  });

  describe('enrich', () => {
    it('resolves result on success', async () => {
      const enriched: ITerpene = {
        id: 1, name: 'Myrcene', description: 'Enriched',
        color: '#000', colorDark: '#000', colorLight: '#fff',
      };
      terpeneService.enrich.mockReturnValue(of({ result: enriched }));
      const store = create();

      const result = await store.enrich('Myrcene');
      expect(result).toEqual(enriched);
    });

    it('sets error and rejects on failure', async () => {
      terpeneService.enrich.mockReturnValue(
        throwError(() => ({ error: { message: 'Enrich failed' } })),
      );
      const store = create();

      await expect(store.enrich('Myrcene')).rejects.toBeTruthy();
      expect(store.error()).toBeTruthy();
    });
  });

  describe('delete', () => {
    it('resolves on success', async () => {
      terpeneService.delete.mockReturnValue(of({ result: undefined }));
      const store = create();

      await store.delete('Myrcene');
      expect(terpeneService.delete).toHaveBeenCalledWith('Myrcene');
      expect(store.error()).toBeNull();
    });

    it('sets error and rejects on failure', async () => {
      terpeneService.delete.mockReturnValue(
        throwError(() => ({ error: { message: 'Delete failed' } })),
      );
      const store = create();

      await expect(store.delete('Myrcene')).rejects.toBeTruthy();
      expect(store.error()).toBeTruthy();
    });
  });

  describe('clearError', () => {
    it('resets error to null', () => {
      terpeneService.update.mockReturnValue(
        throwError(() => ({ error: { message: 'fail' } })),
      );
      const store = create();
      store.update('Myrcene', {});
      expect(store.error()).toBeTruthy();

      store.clearError();
      expect(store.error()).toBeNull();
    });
  });
});
