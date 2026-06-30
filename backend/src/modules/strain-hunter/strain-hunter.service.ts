import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as puppeteer from 'puppeteer';
import { Strain } from './entities/strain';
import { GeneticsService } from '../genetics/genetics.service';
import { TerpeneService } from '../terpene/terpene.service';

export type StrainItem = {
    name: string;
    enName: string;
    isNew: boolean;
    rating: string;
    deal: string;
    marketer: string;
    manufacturer: string;
    brand: string;
    expiry: string;
    price: string;
    catalogPrice: string;
    parent1: string;
    parent2: string;
    originStrain: string;
    countryOfOrigin: string;
    terpenes: string;
    packageType: string;
    symbols: { url: string; alt: string }[];
    imageUrl: string;
    productUrl: string;
    category: string;
    family: string;
    growType: string;
    thc: string;
    cbd: string;
};

type BrowserExtractedItem = StrainItem | null;
type JaneProductRecord = Record<string, unknown>;

const DEFAULT_VALUE = '';
const JANE_PRODUCTS_API_PATH = '/api/widget/products/store/tiltan/';
const MAX_SCROLL_ATTEMPTS = 18;
const PRODUCT_ROW_SELECTOR =
    'table[role="table"] tbody[role="rowgroup"] > tr[role="row"], table[role="table"] tbody tr';

const SOURCE_URL =
    'https://jane.co.il/store/tiltan/?filters=productProductType%5Ein%5Eflower%3B' +
    'productCategory%5Ein%5ET22%2FC4%3BproductGrowType%5Ein%5Eindoor%3B' +
    'productFamily%5Ein%5Eindica&sortBy=store_price';


const TILTAN_URL =
    'https://jane.co.il/store/tiltan/?filters=productProductType%5Ein%5Eflower%3B' +
    'productCategory%5Ein%5ET22%2FC4%3BproductGrowType%5Ein%5Eindoor%3B' +
    'productFamily%5Ein%5Eindica&sortBy=store_price';


const OSISHKIN_URL =
    'https://jane.co.il/store/sup-osishkin/?filters=productProductType%5Ein%5Eflower%3B' +
    'productCategory%5Ein%5ET22%2FC4%3BproductGrowType%5Ein%5Eindoor%3B' +
    'productFamily%5Ein%5Eindica&sortBy=store_price';



@Injectable()
export class StrainHunterService {
    constructor(
        @InjectRepository(Strain)
        private readonly strainRepository: Repository<Strain>,
        private readonly geneticsService: GeneticsService,
        private readonly terpeneService: TerpeneService,
    ) { }

    async fetchData(forceRefresh = false): Promise<{ items: Strain[] }> {
        if (!forceRefresh) {
            const count = await this.strainRepository.count();
            if (count > 0) {
                const items = await this.strainRepository.find();
                return { items };
            }
        }

        const scraped = await this.fetchDataFromUrl(SOURCE_URL);

        await this.strainRepository.clear();

        const entities = scraped.items.map((item) => {
            return this.strainRepository.create({
                name: item.name,
                enName: item.enName,
                isNew: item.isNew,
                rating: item.rating,
                deal: item.deal,
                marketer: item.marketer,
                manufacturer: item.manufacturer,
                brand: item.brand,
                expiry: item.expiry,
                price: item.price,
                catalogPrice: item.catalogPrice,
                parent1: item.parent1,
                parent2: item.parent2,
                originStrain: item.originStrain,
                countryOfOrigin: item.countryOfOrigin,
                terpenes: item.terpenes,
                packageType: item.packageType,
                symbols: item.symbols,
                imageUrl: item.imageUrl,
                productUrl: item.productUrl,
                category: item.category,
                family: item.family,
                growType: item.growType,
                thc: item.thc,
                cbd: item.cbd,
            });
        });

        await this.strainRepository.save(entities);

        // Extract unique genetics and terpene names from scraped items for silent enrichment
        const allGeneticsNames = [
            ...new Set(
                scraped.items
                    .flatMap((item) => [item.originStrain, item.parent1, item.parent2])
                    .filter(Boolean)
                    .filter((n) => n !== 'לא ידוע' && n.trim().length >= 2)
            ),
        ];

        const allTerpeneNames = [
            ...new Set(
                scraped.items
                    .flatMap((item) => item.terpenes.split(',').map((t) => t.trim()))
                    .filter(Boolean)
                    .filter((n) => n !== 'לא ידוע' && n.trim().length >= 2)
            ),
        ];

        // Enrich in parallel — both are independent
        await Promise.all([
            this.geneticsService.enrichBatch(allGeneticsNames),
            this.terpeneService.enrichBatch(allTerpeneNames),
        ]);

        return { items: entities };
    }

    private async fetchDataFromUrl(url: string): Promise<{ items: StrainItem[] }> {
        let browser: puppeteer.Browser | null = null;

        try {
            const capturedProducts = new Map<string, JaneProductRecord>();
            browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-blink-features=AutomationControlled',
                    '--window-size=1920,1080',
                ],
            });

            const page = await browser.newPage();
            await page.setViewport({ width: 1920, height: 1080 });
            await page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
                '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            );

            page.on('response', async (response) => {
                const responseUrl = response.url();
                if (!responseUrl.includes(JANE_PRODUCTS_API_PATH) || response.status() >= 400) {
                    return;
                }

                try {
                    const json = (await response.json()) as unknown;
                    this.extractJaneProducts(json).forEach((product) => {
                        capturedProducts.set(this.getJaneProductKey(product), product);
                    });
                } catch {
                    // Ignored
                }
            });

            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
            await this.waitForProductRows(page);
            await this.scrollUntilJaneStopsLoading(page, capturedProducts);
            const newProductKeys = await this.extractVisibleNewProductKeys(page);

            if (capturedProducts.size > 0) {
                await browser.close();
                return {
                    items: Array.from(capturedProducts.values()).map((product) => {
                        return this.normalizeJaneProduct(product, newProductKeys);
                    }),
                };
            }

            const rowCount = await this.getProductRowCount(page);
            const items: StrainItem[] = [];

            for (let index = 0; index < rowCount; index += 1) {
                const clicked = await this.clickProductRow(page, index);
                if (!clicked) {
                    continue;
                }

                await this.wait(500);

                const item = await this.extractProductRow(page, index);
                if (item && item.name !== DEFAULT_VALUE) {
                    items.push(item);
                }

                await this.clickProductRow(page, index);
                await this.wait(250);
            }

            await browser.close();
            return { items };
        } catch (error: unknown) {
            if (browser) {
                await browser.close();
            }

            const message = error instanceof Error ? error.message : 'Unknown scraping error';
            throw new HttpException(`Scraping failed: ${message}`, HttpStatus.BAD_REQUEST);
        }
    }

    private wait(ms: number) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

    private async scrollUntilJaneStopsLoading(
        page: puppeteer.Page,
        capturedProducts: Map<string, JaneProductRecord>,
    ): Promise<void> {
        let stableAttempts = 0;
        let previousCount = capturedProducts.size;

        for (let attempt = 0; attempt < MAX_SCROLL_ATTEMPTS; attempt += 1) {
            await page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);

                const scrollableElements = Array.from(document.querySelectorAll<HTMLElement>('*'))
                    .filter((element) => {
                        return element.scrollHeight > element.clientHeight + 40;
                    })
                    .sort((a, b) => {
                        return b.scrollHeight - a.scrollHeight;
                    })
                    .slice(0, 6);

                scrollableElements.forEach((element) => {
                    element.scrollTop = element.scrollHeight;
                });
            });

            await this.wait(1200);

            if (capturedProducts.size === previousCount) {
                stableAttempts += 1;
            } else {
                stableAttempts = 0;
                previousCount = capturedProducts.size;
            }

            if (stableAttempts >= 3) {
                return;
            }
        }
    }

    private async extractVisibleNewProductKeys(page: puppeteer.Page): Promise<Set<string>> {
        const keys = await page.evaluate((selector) => {
            const normalize = (value: string | null | undefined) => {
                return (value ?? '').replace(/\s+/g, ' ').trim();
            };

            const isVisible = (element: Element) => {
                const rect = element.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
            };

            const isProductRow = (row: Element) => {
                if (!isVisible(row) || row.querySelector('th')) {
                    return false;
                }

                const cells = Array.from(row.querySelectorAll('td, [role="cell"]'));
                const firstCell = cells[0];
                const text = row.textContent?.trim() ?? '';
                return cells.length >= 8 && text.length > 0 && !!firstCell?.querySelector('[dir="ltr"], img, a');
            };

            const toNameKey = (name: string, enName: string) => {
                return `${name.toLowerCase()}|${enName.toLowerCase()}`;
            };

            return Array.from(document.querySelectorAll(selector))
                .filter(isProductRow)
                .map((row) => {
                    const firstCell = row.querySelector('td:first-child, [role="cell"]:first-child');
                    const firstCellText = firstCell?.textContent ?? '';
                    if (!firstCellText.includes('חדש')) {
                        return '';
                    }

                    const enName = normalize(firstCell?.querySelector('[dir="ltr"]')?.textContent);
                    const candidateSelectors = '.text-gray-900, .text-base';
                    const candidates = firstCell?.querySelectorAll(candidateSelectors) ?? [];
                    const hebNameCandidate = Array.from(candidates)
                        .map((element) => {
                            return normalize(element.textContent);
                        })
                        .find((text) => {
                            return text && text !== enName && !text.includes('חדש');
                        });
                    const name = normalize(
                        (hebNameCandidate ?? firstCellText).replace(/חדש!?/g, '').replace(enName, ''),
                    );

                    return name || enName ? toNameKey(name, enName) : '';
                })
                .filter(Boolean);
        }, PRODUCT_ROW_SELECTOR);

        return new Set(keys);
    }

    private extractJaneProducts(value: unknown): JaneProductRecord[] {
        if (Array.isArray(value)) {
            const productRecords = value.filter((item): item is JaneProductRecord => {
                return this.isJaneProductRecord(item);
            });
            if (productRecords.length > 0) {
                return productRecords;
            }

            return value.flatMap((item) => {
                return this.extractJaneProducts(item);
            });
        }

        if (!this.isPlainObject(value)) {
            return [];
        }
        if (this.isJaneProductRecord(value)) {
            return [value];
        }

        return Object.values(value).flatMap((item) => {
            return this.extractJaneProducts(item);
        });
    }

    private isJaneProductRecord(value: unknown): value is JaneProductRecord {
        if (!this.isPlainObject(value)) {
            return false;
        }

        const hasName = typeof value.heb_name === 'string' || typeof value.eng_name === 'string';
        const hasStoreIdentity =
            typeof value.store_product_id === 'number' ||
            typeof value.store_product_id === 'string' ||
            typeof value.store_price === 'number';

        return hasName && hasStoreIdentity;
    }

    private isPlainObject(value: unknown): value is JaneProductRecord {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    private getJaneProductKey(product: JaneProductRecord): string {
        const explicitKey = this.pickText(product.store_product_id, product.id, product.product_id);
        if (explicitKey) {
            return explicitKey;
        }

        return [
            this.pickText(product.heb_name, product.eng_name),
            this.toText(product.batch_id),
            this.toText(product.store_price),
        ].join(':');
    }

    private normalizeJaneProduct(product: JaneProductRecord, newProductKeys = new Set<string>()): StrainItem {
        const nestedProduct = this.asRecord(product.product);
        const batch = this.asRecord(product.batch);
        const reviews = this.asRecord(product.reviews);
        const name = this.pickText(product.heb_name, nestedProduct?.heb_name);
        const enName = this.pickText(product.eng_name, nestedProduct?.eng_name);

        return {
            name,
            enName,
            isNew: this.isJaneProductNew(product, name, enName, newProductKeys),
            rating: this.formatRating(reviews),
            deal: this.extractPromotionText(product),
            marketer: this.pickText(product.marketer_heb_name, product.marketer__heb_name),
            manufacturer: this.pickText(product.manufacturer_heb_name, product.manufacturer__heb_name),
            brand: this.pickText(
                product.manufacturer_series_heb_name,
                product.manufacturer_series__heb_name,
                product.series_heb_name,
            ),
            expiry: this.formatExpiry(this.pickText(batch?.expiration_date, product.store_product_date)),
            price: this.formatPrice(product.store_price),
            catalogPrice: this.formatPrice(product.catalog_price),
            parent1: this.extractFirstName(product.parent_strains_heb_name, product.parents),
            parent2: this.extractFirstName(product.parents_second_strains_heb_name, product.parents_second),
            originStrain: this.pickText(product.strain_heb_name),
            countryOfOrigin: this.formatCountry(product.origin_country),
            terpenes: this.formatTerpenes(product.terpenes),
            packageType: this.formatPackageType(product.packaging_options),
            symbols: this.extractSymbols(product.symbols),
            imageUrl: this.pickText(
                product.main_img_thumbnail_url,
                product.main_img_200_url,
                nestedProduct?.main_img_thumbnail_url,
                nestedProduct?.main_img_200_url,
            ),
            productUrl: this.pickText(product.biz_url, nestedProduct?.biz_url),
            category: this.pickText(product.category, nestedProduct?.category),
            family: this.pickText(product.family, nestedProduct?.family),
            growType: this.pickText(product.grow_type_name, nestedProduct?.grow_type_name),
            thc: this.pickText(batch?.percent_thc, product.percent_thc),
            cbd: this.pickText(batch?.percent_cbd, product.percent_cbd),
        };
    }

    private extractSymbols(value: unknown): { url: string; alt: string }[] {
        if (!Array.isArray(value)) {
            return [];
        }

        return value
            .map((item) => {
                const record = this.asRecord(item);
                if (record && typeof record.img_url === 'string') {
                    return {
                        url: record.img_url,
                        alt: typeof record.description === 'string' ? record.description : '',
                    };
                }
                return null;
            })
            .filter((obj): obj is { url: string; alt: string } => {
                return obj !== null;
            });
    }

    private isJaneProductNew(
        product: JaneProductRecord,
        name: string,
        enName: string,
        newProductKeys: Set<string>,
    ): boolean {
        const explicitFlag = this.pickText(
            product.is_new,
            product.isNew,
            product.is_new_product,
            product.is_new_in_store,
        );
        if (this.toBoolean(explicitFlag)) {
            return true;
        }

        const nameKey = `${name.toLowerCase()}|${enName.toLowerCase()}`;
        if (newProductKeys.has(nameKey)) {
            return true;
        }

        return this.collectTextValues(product).some((value) => {
            return /(^|\s)חדש!?($|\s)/.test(value);
        });
    }

    private asRecord(value: unknown): JaneProductRecord | null {
        return this.isPlainObject(value) ? value : null;
    }

    private pickText(...values: unknown[]): string {
        return values.map((value) => {
            return this.toText(value);
        }).find((value) => {
            return value !== DEFAULT_VALUE;
        }) ?? DEFAULT_VALUE;
    }

    private toText(value: unknown): string {
        if (typeof value === 'string') {
            return value.replace(/\s+/g, ' ').trim();
        }
        if (typeof value === 'number') {
            return String(value);
        }
        return DEFAULT_VALUE;
    }

    private toBoolean(value: unknown): boolean {
        return value === true || value === 'true' || value === 1 || value === '1';
    }

    private formatPrice(value: unknown): string {
        if (typeof value !== 'number') {
            return this.toText(value);
        }
        return `₪${Math.round(value)}`;
    }

    private formatExpiry(value: string): string {
        const match = value.match(/^(\d{4})-(\d{2})-\d{2}/);
        if (!match) {
            return value;
        }

        return `${match[2]}/${match[1].slice(2)}`;
    }

    private formatRating(reviews: JaneProductRecord | null): string {
        if (!reviews) {
            return DEFAULT_VALUE;
        }

        const count = typeof reviews.total_reviews_count === 'number' ? reviews.total_reviews_count : 0;
        const average = typeof reviews.total_reviews_avg === 'number' ? reviews.total_reviews_avg : 0;

        return average > 0 ? `(${count}) ${average}` : `(${count})`;
    }

    private extractFirstName(namesValue: unknown, recordsValue: unknown): string {
        if (Array.isArray(namesValue) && typeof namesValue[0] === 'string') {
            return namesValue[0];
        }
        if (!Array.isArray(recordsValue)) {
            return DEFAULT_VALUE;
        }

        const firstRecord = this.asRecord(recordsValue[0]);
        return this.pickText(firstRecord?.heb_name, firstRecord?.eng_name);
    }

    private extractPromotionText(product: JaneProductRecord): string {
        const candidates = this.collectTextValues(product).filter((value) => {
            return /\d+\s*ב-?\s*₪\s*\d+/.test(value);
        });
        return candidates[0] ?? DEFAULT_VALUE;
    }

    private collectTextValues(value: unknown): string[] {
        if (typeof value === 'string') {
            return [value];
        }
        if (Array.isArray(value)) {
            return value.flatMap((item) => {
                return this.collectTextValues(item);
            });
        }
        if (!this.isPlainObject(value)) {
            return [];
        }

        return Object.values(value).flatMap((item) => {
            return this.collectTextValues(item);
        });
    }

    private formatCountry(value: unknown): string {
        const country = this.toText(value).toUpperCase();
        const countryMap: Record<string, string> = {
            IL: 'ישראל',
            CA: 'קנדה',
            PT: 'פורטוגל',
            UY: 'אורוגוואי',
            UG: 'אוגנדה',
            ES: 'ספרד',
            DE: 'גרמניה',
        };

        return countryMap[country] ?? this.toText(value);
    }

    private formatPackageType(value: unknown): string {
        const values = Array.isArray(value) ? value.map((item) => {
            return this.toText(item);
        }) : [this.toText(value)];
        if (values.some((item) => {
            return item.toLowerCase().includes('bag');
        })) {
            return 'שקית';
        }
        if (values.some((item) => {
            return ['jar', 'can', 'bottle'].some((keyword) => {
                return item.toLowerCase().includes(keyword);
            });
        })) {
            return 'צנצנת';
        }

        return values.find((item) => {
            return item !== DEFAULT_VALUE;
        }) ?? DEFAULT_VALUE;
    }

    private formatTerpenes(value: unknown): string {
        if (!Array.isArray(value)) {
            return DEFAULT_VALUE;
        }

        return value
            .map((item) => {
                if (typeof item === 'string') {
                    return item;
                }

                const record = this.asRecord(item);
                if (!record) {
                    return DEFAULT_VALUE;
                }

                const name = this.pickText(
                    record.heb_name,
                    record.hebrew_name,
                    record.name,
                    record.label,
                    record.terpene_name,
                    record.terpene,
                    record.eng_name,
                    this.asRecord(record.terpene)?.heb_name,
                    this.asRecord(record.terpene)?.name,
                    this.asRecord(record.terpene)?.eng_name,
                );
                const percent = this.formatTerpenePercent(
                    record.percent,
                    record.percentage,
                    record.value,
                    record.amount,
                    record.concentration,
                    record.terpene_percent,
                    record.terpene_percentage,
                );

                if (!name) {
                    return DEFAULT_VALUE;
                }

                return percent ? `${name} ${percent}` : name;
            })
            .filter((item) => {
                return item !== DEFAULT_VALUE;
            })
            .join(', ');
    }

    private formatTerpenePercent(...values: unknown[]): string {
        const value = values.map((item) => {
            return this.toText(item);
        }).find((item) => {
            return item !== DEFAULT_VALUE;
        }) ?? DEFAULT_VALUE;
        if (!value) {
            return DEFAULT_VALUE;
        }
        if (value.includes('%')) {
            return value;
        }
        if (!/^\d+(?:[.,]\d+)?$/.test(value)) {
            return value;
        }
        if (Number(value.replace(',', '.')) === 0) {
            return DEFAULT_VALUE;
        }

        return `${value}%`;
    }

    private async waitForProductRows(page: puppeteer.Page): Promise<void> {
        await page.waitForSelector('body', { timeout: 15000 });

        for (let attempt = 0; attempt < 8; attempt += 1) {
            const rowCount = await this.getProductRowCount(page);
            if (rowCount > 0) {
                return;
            }

            await page.evaluate(() => {
                return window.scrollBy(0, window.innerHeight);
            });
            await this.wait(750);
            await page.evaluate(() => {
                return window.scrollTo(0, 0);
            });
            await this.wait(750);
        }

        throw new Error('Product table rows were not found after page hydration.');
    }

    private async getProductRowCount(page: puppeteer.Page): Promise<number> {
        return page.evaluate((selector) => {
            const isVisible = (element: Element) => {
                const rect = element.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
            };

            const isProductRow = (row: Element) => {
                if (!isVisible(row) || row.querySelector('th')) {
                    return false;
                }

                const cells = Array.from(row.querySelectorAll('td, [role="cell"]'));
                if (cells.length < 8) {
                    return false;
                }

                const firstCell = cells[0];
                const text = row.textContent?.trim() ?? '';
                return text.length > 0 && !!firstCell?.querySelector('[dir="ltr"], img, a');
            };

            return Array.from(document.querySelectorAll(selector)).filter(isProductRow).length;
        }, PRODUCT_ROW_SELECTOR);
    }

    private async clickProductRow(page: puppeteer.Page, index: number): Promise<boolean> {
        const rows = await page.$$(PRODUCT_ROW_SELECTOR);
        const productRows: puppeteer.ElementHandle<Element>[] = [];

        for (const row of rows) {
            const isProductRow = await row.evaluate((element) => {
                const rect = element.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0 || element.querySelector('th')) {
                    return false;
                }

                const cells = Array.from(element.querySelectorAll('td, [role="cell"]'));
                const firstCell = cells[0];
                const text = element.textContent?.trim() ?? '';
                return cells.length >= 8 && text.length > 0 && !!firstCell?.querySelector('[dir="ltr"], img, a');
            });

            if (isProductRow) {
                productRows.push(row);
            }
        }

        const row = productRows[index];
        if (!row) {
            return false;
        }

        await row.evaluate((element) => {
            return element.scrollIntoView({ block: 'center', inline: 'nearest' });
        });
        await row.click();

        return true;
    }

    private async extractProductRow(page: puppeteer.Page, index: number): Promise<BrowserExtractedItem> {
        return page.evaluate(
            ({ rowIndex, selector, defaultValue }) => {
                const countryNames = [
                    'ישראל', 'קנדה', 'פורטוגל', 'אורוגוואי', 'אוגנדה', 'ספרד', 'גרמניה'
                ];

                const normalize = (value: string | null | undefined) => {
                    const cleaned = (value ?? '').replace(/\s+/g, ' ').trim();
                    return cleaned || defaultValue;
                };

                const isVisible = (element: Element) => {
                    const rect = element.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0;
                };

                const isProductRow = (row: Element) => {
                    if (!isVisible(row) || row.querySelector('th')) {
                        return false;
                    }

                    const cells = Array.from(row.querySelectorAll('td, [role="cell"]'));
                    const firstCell = cells[0];
                    const text = row.textContent?.trim() ?? '';
                    return cells.length >= 8 && text.length > 0 && !!firstCell?.querySelector('[dir="ltr"], img, a');
                };

                const getCellText = (row: Element, index: number) => {
                    const cells = Array.from(row.querySelectorAll('td, [role="cell"]'));
                    return normalize(cells[index]?.textContent);
                };

                const getCell = (row: Element, index: number) => {
                    const cells = Array.from(row.querySelectorAll('td, [role="cell"]'));
                    return cells[index] ?? null;
                };

                const getCellSelectorText = (row: Element, index: number, childSelector: string) => {
                    const child = getCell(row, index)?.querySelector(childSelector);
                    return normalize(child?.textContent);
                };

                const extractDeal = (root: Element | null) => {
                    const text = root?.textContent ?? '';
                    const match = text.match(/\d+\s*ב-?\s*₪\s*\d+/);
                    return normalize(match?.[0]);
                };

                const extractRating = (root: Element | null) => {
                    const text = root?.textContent ?? '';
                    const match = text.match(/\(\s*\d+\s*\)\s*(?:\d+(?:\.\d+)?)?/);
                    return normalize(match?.[0]);
                };

                const extractSymbolsFromDom = (root: Element | null) => {
                    if (!root) {
                        return [];
                    }
                    const imgs = Array.from(root.querySelectorAll('img'));
                    return imgs
                        .filter((img) => {
                            return img.src.includes('/symbols/');
                        })
                        .map((img) => {
                            return {
                                url: img.src,
                                alt: img.alt || '',
                            };
                        });
                };

                const productRows = Array.from(document.querySelectorAll(selector)).filter(isProductRow);
                const row = productRows[rowIndex];
                if (!row) {
                    return null;
                }

                const getExpandedRoot = () => {
                    let sibling = row.nextElementSibling;

                    while (sibling && !isProductRow(sibling)) {
                        const text = sibling.textContent ?? '';
                        if (text.includes('זן מקור') || text.includes('הורה #1') || text.includes('הורה #2')) {
                            return sibling;
                        }

                        sibling = sibling.nextElementSibling;
                    }

                    return row.querySelector('[class*="shadow-inner"], [class*="expanded"], [class*="detail"]');
                };

                const readGridValue = (root: Element | null, labels: string[]) => {
                    if (!root) {
                        return defaultValue;
                    }

                    const spans = Array.from(root.querySelectorAll('span'));

                    for (const span of spans) {
                        const label = normalize(span.textContent);
                        if (!labels.some((candidate) => {
                            return label.includes(candidate);
                        })) {
                            continue;
                        }

                        const valueCell = span.nextElementSibling;
                        if (valueCell) {
                            return normalize(valueCell.textContent);
                        }
                    }

                    return defaultValue;
                };

                const expandedRoot = getExpandedRoot();
                const firstCell = row.querySelector('td:first-child, [role="cell"]:first-child');
                const enName = normalize(firstCell?.querySelector('[dir="ltr"]')?.textContent);
                const candidateSelectors = '.text-gray-900, .text-base';
                const candidates = firstCell?.querySelectorAll(candidateSelectors) ?? [];
                const hebNameCandidate = Array.from(candidates)
                    .map((element) => {
                        return normalize(element.textContent);
                    })
                    .find((text) => {
                        return text !== defaultValue && text !== enName && !text.includes('חדש');
                    });
                const name = normalize(
                    (hebNameCandidate ?? firstCell?.textContent)
                        ?.replace(/חדש!?/g, '')
                        .replace(enName === defaultValue ? '' : enName, ''),
                );
                const marketer = readGridValue(expandedRoot, ['משווק', 'Marketer']);
                const parent1 = readGridValue(expandedRoot, ['הורה #1', 'הורה 1', 'Parent 1']);
                const parent2 = readGridValue(expandedRoot, ['הורה #2', 'הורה 2', 'Parent 2']);
                const originStrain = readGridValue(expandedRoot, ['זן מקור', 'גנטיקה', 'Genetics']);
                const manufacturerFromExpanded = readGridValue(expandedRoot, ['מגדל']);
                const brandFromExpanded = readGridValue(expandedRoot, ['מותג']);
                const expiryFromExpanded = readGridValue(expandedRoot, ['תוקף']);
                const terpenes = readGridValue(expandedRoot, ['טרפנים']);
                const packageType = readGridValue(expandedRoot, ['סוג אריזה', 'סוגי אריזה נפוצים']);
                const countryFromExpanded = readGridValue(expandedRoot, ['ארץ ייצור', 'ארץ מקור', 'ארץ']);
                const countryOfOrigin =
                    countryFromExpanded !== defaultValue
                        ? countryFromExpanded
                        : countryNames.find((country) => {
                            return getCellText(row, 6).includes(country);
                        }) ?? defaultValue;
                const price = getCellSelectorText(row, 9, '.text-green-600');
                const catalogPrice = getCellSelectorText(row, 9, '.line-through');

                const thc = readGridValue(expandedRoot, ['THC', 'thc']);
                const cbd = readGridValue(expandedRoot, ['CBD', 'cbd']);
                const growType = readGridValue(expandedRoot, ['מתקן גידול', 'סוג גידול', 'גידול']);
                const category = readGridValue(expandedRoot, ['קטגוריה', 'Category']);
                const family = readGridValue(expandedRoot, ['משפחה', 'Family']);
                const imageUrl = firstCell?.querySelector('img')?.src ?? '';
                const productUrl = firstCell?.querySelector('a')?.href ?? '';

                return {
                    name,
                    enName,
                    isNew: (firstCell?.textContent ?? '').includes('חדש'),
                    rating: extractRating(firstCell),
                    deal: extractDeal(expandedRoot) !== defaultValue ?
                        extractDeal(expandedRoot) :
                        extractDeal(firstCell),
                    marketer,
                    manufacturer: manufacturerFromExpanded !== defaultValue ?
                        manufacturerFromExpanded :
                        getCellText(row, 3),
                    brand: brandFromExpanded !== defaultValue ?
                        brandFromExpanded :
                        getCellText(row, 5),
                    expiry: expiryFromExpanded !== defaultValue ?
                        expiryFromExpanded :
                        getCellText(row, 7),
                    price,
                    catalogPrice,
                    parent1,
                    parent2,
                    originStrain,
                    countryOfOrigin,
                    terpenes,
                    packageType,
                    symbols: extractSymbolsFromDom(row),
                    imageUrl,
                    productUrl,
                    category,
                    family,
                    growType,
                    thc,
                    cbd,
                };
            },
            { rowIndex: index, selector: PRODUCT_ROW_SELECTOR, defaultValue: DEFAULT_VALUE },
        );
    }
}