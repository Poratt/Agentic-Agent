import { Test, TestingModule } from '@nestjs/testing';
import { TerpeneController } from './terpene.controller';
import { TerpeneService } from './terpene.service';
import { Terpene } from './entities/terpene.entity';

const DTO_KEYS = ['id', 'name', 'description', 'scent', 'effects', 'color', 'colorDark', 'colorLight'].sort();

describe('TerpeneController — DTO mapping coverage', () => {
    let controller: TerpeneController;

    const MOCK_ENTITY: Terpene = {
        id: 1,
        name: 'טסט',
        description: 'test',
        scent: 'test',
        effects: ['test'],
        color: '#000000',
        colorDark: '#000000',
        colorLight: '#000000',
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [TerpeneController],
            providers: [{ provide: TerpeneService, useValue: {} }],
        }).compile();

        controller = module.get<TerpeneController>(TerpeneController);
    });

    it('mapToDto returns all DTO fields and nothing extra', () => {
        const result = (controller as any).mapToDto(MOCK_ENTITY);
        const resultKeys = Object.keys(result).sort();

        expect(resultKeys).toEqual(DTO_KEYS);
    });

    it('mapToDto maps every DTO field from the entity', () => {
        const result = (controller as any).mapToDto(MOCK_ENTITY);

        for (const key of DTO_KEYS) {
            expect(result).toHaveProperty(key);
        }
    });

    it('mapToDto handles nullable fields as undefined', () => {
        const entity: Terpene = {
            ...MOCK_ENTITY,
            description: null,
            scent: null,
            effects: null,
        };
        const result = (controller as any).mapToDto(entity);

        expect(result.description).toBeUndefined();
        expect(result.scent).toBeUndefined();
        expect(result.effects).toBeUndefined();
    });
});
