import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StrainHunterService } from './strain-hunter.service';
import { Strain } from './entities/strain';
import { UserMatchingPreferences } from './entities/user-matching-preferences.entity';
import { GeneticsService } from '../genetics/genetics.service';
import { TerpeneService } from '../terpene/terpene.service';

jest.mock('puppeteer');

function makeStrain(overrides: Partial<Strain> = {}): Strain {
  return {
    id: 1,
    name: 'gorilla glue',
    enName: 'Gorilla Glue',
    isNew: false,
    rating: '(10) 4.5',
    deal: '2 ב-₪199',
    marketer: 'קנטק',
    manufacturer: 'קנאפארמה',
    brand: 'לומה',
    expiry: '12/26',
    price: '₪99',
    catalogPrice: '₪199',
    parent1: "Chem's Sister",
    parent2: 'Sour Dubb',
    originStrain: 'GG4',
    countryOfOrigin: 'קנדה',
    terpenes: 'Myrcene 0.5%',
    packageType: 'שקית',
    batch: 'B001',
    symbols: [],
    imageUrl: 'https://example.com/img.jpg',
    productUrl: 'https://example.com/product',
    category: 'T22/C4',
    family: 'indica',
    growType: 'indoor',
    thc: '24%',
    cbd: '0.5%',
    lastScrapedAt: new Date('2026-01-01'),
    ...overrides,
  } as Strain;
}

function makeScrapedItems() {
  return [
    {
      name: 'gorilla glue',
      enName: 'Gorilla Glue',
      isNew: false,
      rating: '(10) 4.5',
      deal: '2 ב-₪199',
      marketer: 'קנטק',
      manufacturer: 'קנאפארמה',
      brand: 'לומה',
      expiry: '12/26',
      price: '₪99',
      catalogPrice: '₪199',
      parent1: "Chem's Sister",
      parent2: 'Sour Dubb',
      originStrain: 'GG4',
      countryOfOrigin: 'קנדה',
      terpenes: 'Myrcene 0.5%',
      packageType: 'שקית',
      batch: 'B001',
      symbols: [],
      imageUrl: 'https://example.com/img.jpg',
      productUrl: 'https://example.com/product',
      category: 'T22/C4',
      family: 'indica',
      growType: 'indoor',
      thc: '24%',
      cbd: '0.5%',
    },
  ];
}

describe('StrainHunterService', () => {
  let service: StrainHunterService;
  let strainRepo: jest.Mocked<Repository<Strain>>;
  let prefsRepo: jest.Mocked<Repository<UserMatchingPreferences>>;
  let geneticsService: jest.Mocked<GeneticsService>;
  let terpeneService: jest.Mocked<TerpeneService>;

  beforeEach(async () => {
    strainRepo = {
      count: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      clear: jest.fn(),
    } as any;

    prefsRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as any;

    geneticsService = {
      enrichBatch: jest.fn(),
    } as any;

    terpeneService = {
      enrichBatch: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StrainHunterService,
        { provide: getRepositoryToken(Strain), useValue: strainRepo },
        { provide: getRepositoryToken(UserMatchingPreferences), useValue: prefsRepo },
        { provide: GeneticsService, useValue: geneticsService },
        { provide: TerpeneService, useValue: terpeneService },
      ],
    }).compile();

    service = module.get<StrainHunterService>(StrainHunterService);
    jest.clearAllMocks();
  });

  describe('fetchData', () => {
    it('returns cached items when count > 0 and no forceRefresh', async () => {
      const cached = [makeStrain({ id: 10, lastScrapedAt: new Date('2026-03-01') })];
      strainRepo.count.mockResolvedValue(1);
      strainRepo.find.mockResolvedValue(cached);

      const result = await service.fetchData(false);

      expect(strainRepo.count).toHaveBeenCalled();
      expect(strainRepo.find).toHaveBeenCalled();
      expect(result.items).toEqual(cached);
      expect(result.lastScrapedAt).toEqual(new Date('2026-03-01'));
    });

    it('scrapes when cache is empty even without forceRefresh', async () => {
      strainRepo.count.mockResolvedValue(0);
      jest
        .spyOn(service as any, 'fetchDataFromUrl')
        .mockResolvedValue({ items: [] });
      strainRepo.create.mockImplementation((v) => v as any);
      strainRepo.save.mockImplementation(async (v) => v as any);
      geneticsService.enrichBatch.mockResolvedValue(undefined as any);
      terpeneService.enrichBatch.mockResolvedValue(undefined as any);

      const result = await service.fetchData(false);

      expect(strainRepo.count).toHaveBeenCalled();
      expect(strainRepo.clear).toHaveBeenCalled();
      expect(result.items).toBeDefined();
    });

    it('bypasses cache when forceRefresh=true even if data exists', async () => {
      strainRepo.count.mockResolvedValue(5);
      const scrapeSpy = jest
        .spyOn(service as any, 'fetchDataFromUrl')
        .mockResolvedValue({ items: [] });

      const result = await service.fetchData(true);

      expect(strainRepo.count).not.toHaveBeenCalled();
      expect(scrapeSpy).toHaveBeenCalledTimes(2);
      expect(strainRepo.clear).toHaveBeenCalled();
      expect(strainRepo.save).toHaveBeenCalled();
    });

    it('saves scraped entities and enriches genetics/terpenes', async () => {
      const scrapedItems = makeScrapedItems();
      jest
        .spyOn(service as any, 'fetchDataFromUrl')
        .mockResolvedValue({ items: scrapedItems });
      geneticsService.enrichBatch.mockResolvedValue(undefined as any);
      terpeneService.enrichBatch.mockResolvedValue(undefined as any);
      strainRepo.create.mockImplementation((v) => v as any);
      strainRepo.save.mockImplementation(async (v) => v as any);

      const result = await service.fetchData(true);

      expect(strainRepo.clear).toHaveBeenCalled();
      expect(strainRepo.create).toHaveBeenCalled();
      expect(strainRepo.save).toHaveBeenCalled();
      expect(geneticsService.enrichBatch).toHaveBeenCalled();
      expect(terpeneService.enrichBatch).toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
      expect(result.lastScrapedAt).toBeInstanceOf(Date);
    });

    it('merges items from both URLs and deduplicates', async () => {
      const item1 = { ...makeScrapedItems()[0], productUrl: 'https://a.com' };
      const item2 = { ...makeScrapedItems()[0], productUrl: 'https://b.com' };
      const itemDup = { ...makeScrapedItems()[0], productUrl: 'https://a.com' };

      const scrapeSpy = jest
        .spyOn(service as any, 'fetchDataFromUrl')
        .mockResolvedValueOnce({ items: [item1, itemDup] })
        .mockResolvedValueOnce({ items: [item2] });
      geneticsService.enrichBatch.mockResolvedValue(undefined as any);
      terpeneService.enrichBatch.mockResolvedValue(undefined as any);
      strainRepo.create.mockImplementation((v) => v as any);
      strainRepo.save.mockImplementation(async (v) => v as any);

      const result = await service.fetchData(true);

      expect(strainRepo.create).toHaveBeenCalledTimes(2);
    });

    it('propagates error when scrape fails', async () => {
      jest
        .spyOn(service as any, 'fetchDataFromUrl')
        .mockRejectedValue(new Error('navigation timeout'));

      await expect(service.fetchData(true)).rejects.toThrow('navigation timeout');
    });
  });

  describe('getPreferences', () => {
    it('returns existing preferences for user', async () => {
      const existing = {
        userId: 1,
        prefs: { 'terpene:Myrcene': 'like' },
        weights: { terpene: 70, genetics: 30 },
      };
      prefsRepo.findOne.mockResolvedValue(existing as any);

      const result = await service.getPreferences(1);

      expect(prefsRepo.findOne).toHaveBeenCalledWith({ where: { userId: 1 } });
      expect(result.prefs).toEqual({ 'terpene:Myrcene': 'like' });
      expect(result.weights).toEqual({ terpene: 70, genetics: 30 });
    });

    it('returns defaults when no preferences exist', async () => {
      prefsRepo.findOne.mockResolvedValue(null);

      const result = await service.getPreferences(999);

      expect(result.prefs).toEqual({});
      expect(result.weights).toEqual({ terpene: 60, genetics: 40 });
    });

    it('returns defaults when prefs and weights are null', async () => {
      prefsRepo.findOne.mockResolvedValue({
        userId: 1,
        prefs: null,
        weights: null,
      } as any);

      const result = await service.getPreferences(1);

      expect(result.prefs).toEqual({});
      expect(result.weights).toEqual({ terpene: 60, genetics: 40 });
    });
  });

  describe('upsertPreferences', () => {
    it('creates new preferences when none exist', async () => {
      prefsRepo.findOne.mockResolvedValue(null);
      prefsRepo.create.mockImplementation((v) => v as any);
      prefsRepo.save.mockImplementation(async (v) => v as any);

      const dto = {
        prefs: { 'genetics:GG4': 'love' },
        weights: { terpene: 50, genetics: 50 },
      };

      const result = await service.upsertPreferences(1, dto);

      expect(prefsRepo.create).toHaveBeenCalledWith({
        userId: 1,
        prefs: { 'genetics:GG4': 'love' },
        weights: { terpene: 50, genetics: 50 },
      });
      expect(prefsRepo.save).toHaveBeenCalled();
      expect(result.prefs).toEqual({ 'genetics:GG4': 'love' });
      expect(result.weights).toEqual({ terpene: 50, genetics: 50 });
    });

    it('updates existing preferences', async () => {
      const existing = {
        userId: 1,
        prefs: { 'terpene:Myrcene': 'avoid' },
        weights: { terpene: 60, genetics: 40 },
      };
      prefsRepo.findOne.mockResolvedValue(existing as any);
      prefsRepo.save.mockImplementation(async (v) => v as any);

      const dto = { prefs: { 'terpene:Myrcene': 'love' } };

      const result = await service.upsertPreferences(1, dto);

      expect(existing.prefs).toEqual({ 'terpene:Myrcene': 'love' });
      expect(prefsRepo.save).toHaveBeenCalledWith(existing);
      expect(result.prefs).toEqual({ 'terpene:Myrcene': 'love' });
      expect(result.weights).toEqual({ terpene: 60, genetics: 40 });
    });

    it('preserves existing prefs when dto omits prefs', async () => {
      const existing = {
        userId: 1,
        prefs: { 'terpene:Myrcene': 'like' },
        weights: { terpene: 60, genetics: 40 },
      };
      prefsRepo.findOne.mockResolvedValue(existing as any);
      prefsRepo.save.mockImplementation(async (v) => v as any);

      const dto = { weights: { terpene: 30, genetics: 70 } };

      const result = await service.upsertPreferences(1, dto);

      expect(result.prefs).toEqual({ 'terpene:Myrcene': 'like' });
      expect(result.weights).toEqual({ terpene: 30, genetics: 70 });
    });

    it('uses defaults when no existing prefs and dto is empty', async () => {
      prefsRepo.findOne.mockResolvedValue(null);
      prefsRepo.create.mockImplementation((v) => v as any);
      prefsRepo.save.mockImplementation(async (v) => v as any);

      const result = await service.upsertPreferences(1, {});

      expect(result.prefs).toEqual({});
      expect(result.weights).toEqual({ terpene: 60, genetics: 40 });
    });
  });
});
