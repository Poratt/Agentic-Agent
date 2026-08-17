import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { StrainHunterController } from './strain-hunter.controller';
import { StrainHunterService } from './strain-hunter.service';
import { UserRole } from '../../core/enums/user-role.enum';

jest.mock('puppeteer');

describe('StrainHunterController', () => {
  let controller: StrainHunterController;
  let service: jest.Mocked<StrainHunterService>;

  beforeEach(async () => {
    service = {
      fetchData: jest.fn(),
      getPreferences: jest.fn(),
      upsertPreferences: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StrainHunterController],
      providers: [{ provide: StrainHunterService, useValue: service }],
    }).compile();

    controller = module.get<StrainHunterController>(StrainHunterController);
    jest.clearAllMocks();
  });

  describe('GET /strain-hunter/fetch', () => {
    it('calls fetchData with forceRefresh=true for admin', async () => {
      const req = { user: { sub: 1, role: UserRole.Admin } } as any;
      service.fetchData.mockResolvedValue({ items: [], lastScrapedAt: null });

      const result = await controller.fetchData('true', req);

      expect(service.fetchData).toHaveBeenCalledWith(true);
      expect(result).toEqual({
        success: true,
        message: 'נטענו 0 זנים',
        result: { items: [], lastScrapedAt: null },
      });
    });

    it('calls fetchData with forceRefresh=false when param is absent', async () => {
      const req = { user: { sub: 2, role: UserRole.User } } as any;
      service.fetchData.mockResolvedValue({ items: [], lastScrapedAt: null });

      const result = await controller.fetchData(undefined, req);

      expect(service.fetchData).toHaveBeenCalledWith(false);
    });

    it('throws ForbiddenException when non-admin requests forceRefresh', async () => {
      const req = { user: { sub: 2, role: UserRole.User } } as any;

      await expect(controller.fetchData('true', req)).rejects.toThrow(ForbiddenException);
      expect(service.fetchData).not.toHaveBeenCalled();
    });

    it('passes forceRefresh="false" as false boolean', async () => {
      const req = { user: { sub: 1, role: UserRole.Admin } } as any;
      service.fetchData.mockResolvedValue({ items: [], lastScrapedAt: null });

      await controller.fetchData('false', req);

      expect(service.fetchData).toHaveBeenCalledWith(false);
    });
  });

  describe('GET /strain-hunter/preferences', () => {
    it('calls getPreferences with userId from JWT', async () => {
      const req = { user: { sub: 42, role: UserRole.User } } as any;
      const expected = { prefs: { 'a': 'like' }, weights: { terpene: 60, genetics: 40 } };
      service.getPreferences.mockResolvedValue(expected);

      const result = await controller.getPreferences(req);

      expect(service.getPreferences).toHaveBeenCalledWith(42);
      expect(result).toEqual({
        success: true,
        message: 'העדפות ההתאמה נטענו בהצלחה',
        result: expected,
      });
    });
  });

  describe('PUT /strain-hunter/preferences', () => {
    it('calls upsertPreferences with userId and dto', async () => {
      const req = { user: { sub: 7, role: UserRole.User } } as any;
      const dto = {
        prefs: { 'terpene:Myrcene': 'love' },
        weights: { terpene: 50, genetics: 50 },
      };
      const expected = { prefs: dto.prefs, weights: dto.weights };
      service.upsertPreferences.mockResolvedValue(expected);

      const result = await controller.upsertPreferences(req, dto);

      expect(service.upsertPreferences).toHaveBeenCalledWith(7, dto);
      expect(result).toEqual({
        success: true,
        message: 'העדפות ההתאמה נשמרו בהצלחה',
        result: expected,
      });
    });

    it('works with empty dto', async () => {
      const req = { user: { sub: 3, role: UserRole.User } } as any;
      const expected = { prefs: {}, weights: { terpene: 60, genetics: 40 } };
      service.upsertPreferences.mockResolvedValue(expected);

      const result = await controller.upsertPreferences(req, {});

      expect(service.upsertPreferences).toHaveBeenCalledWith(3, {});
      expect(result).toEqual({
        success: true,
        message: 'העדפות ההתאמה נשמרו בהצלחה',
        result: expected,
      });
    });
  });
});
