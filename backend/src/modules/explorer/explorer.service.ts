import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

export type ExplorerStrainItem = {
    name: string;
    enName: string;
    isNew: boolean;
    rating: string;
    deal: string;
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
};

type BrowserExtractedItem = ExplorerStrainItem | null;

const DEFAULT_VALUE = 'לא צוין';
const PRODUCT_ROW_SELECTOR =
    'table[role="table"] tbody[role="rowgroup"] > tr[role="row"], table[role="table"] tbody tr';
const EXPLORER_SOURCE_URL =
    'https://jane.co.il/store/tiltan/?filters=productProductType%5Ein%5Eflower%3BproductCategory%5Ein%5ET22%2FC4%3BproductGrowType%5Ein%5Eindoor%3BproductFamily%5Ein%5Eindica&sortBy=store_price';

@Injectable()
export class ExplorerService {
    fetchData(): Promise<{ items: ExplorerStrainItem[] }> {
        return this.fetchDataFromUrl(EXPLORER_SOURCE_URL);
    }

    private async fetchDataFromUrl(url: string): Promise<{ items: ExplorerStrainItem[] }> {
        let browser: puppeteer.Browser | null = null;

        try {
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
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            );

            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
            await this.waitForProductRows(page);

            const rowCount = await this.getProductRowCount(page);
            const items: ExplorerStrainItem[] = [];

            for (let index = 0; index < rowCount; index += 1) {
                const clicked = await this.clickProductRow(page, index);
                if (!clicked) continue;

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
            if (browser) await browser.close();

            const message = error instanceof Error ? error.message : 'Unknown scraping error';
            throw new HttpException(`Scraping failed: ${message}`, HttpStatus.BAD_REQUEST);
        }
    }

    private wait(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private async waitForProductRows(page: puppeteer.Page): Promise<void> {
        await page.waitForSelector('body', { timeout: 15000 });

        for (let attempt = 0; attempt < 8; attempt += 1) {
            const rowCount = await this.getProductRowCount(page);
            if (rowCount > 0) return;

            await page.evaluate(() => window.scrollBy(0, window.innerHeight));
            await this.wait(750);
            await page.evaluate(() => window.scrollTo(0, 0));
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
                if (!isVisible(row) || row.querySelector('th')) return false;

                const cells = Array.from(row.querySelectorAll('td, [role="cell"]'));
                if (cells.length < 8) return false;

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
                if (rect.width === 0 || rect.height === 0 || element.querySelector('th')) return false;

                const cells = Array.from(element.querySelectorAll('td, [role="cell"]'));
                const firstCell = cells[0];
                const text = element.textContent?.trim() ?? '';
                return cells.length >= 8 && text.length > 0 && !!firstCell?.querySelector('[dir="ltr"], img, a');
            });

            if (isProductRow) productRows.push(row);
        }

        const row = productRows[index];
        if (!row) return false;

        await row.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
        await row.click();

        return true;
    }

    private async extractProductRow(page: puppeteer.Page, index: number): Promise<BrowserExtractedItem> {
        return page.evaluate(
            ({ rowIndex, selector, defaultValue }) => {
                const countryNames = ['ישראל', 'קנדה', 'פורטוגל', 'אורוגוואי', 'אוגנדה', 'ספרד', 'גרמניה'];

                const normalize = (value: string | null | undefined) => {
                    const cleaned = (value ?? '').replace(/\s+/g, ' ').trim();
                    return cleaned || defaultValue;
                };

                const isVisible = (element: Element) => {
                    const rect = element.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0;
                };

                const isProductRow = (row: Element) => {
                    if (!isVisible(row) || row.querySelector('th')) return false;

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

                const productRows = Array.from(document.querySelectorAll(selector)).filter(isProductRow);
                const row = productRows[rowIndex];
                if (!row) return null;

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
                    if (!root) return defaultValue;

                    const spans = Array.from(root.querySelectorAll('span'));

                    for (const span of spans) {
                        const label = normalize(span.textContent);
                        if (!labels.some((candidate) => label.includes(candidate))) continue;

                        const valueCell = span.nextElementSibling;
                        if (valueCell) return normalize(valueCell.textContent);
                    }

                    return defaultValue;
                };

                const expandedRoot = getExpandedRoot();
                const firstCell = row.querySelector('td:first-child, [role="cell"]:first-child');
                const enName = normalize(firstCell?.querySelector('[dir="ltr"]')?.textContent);
                const hebNameCandidate = Array.from(firstCell?.querySelectorAll('.text-gray-900, .text-base') ?? [])
                    .map((element) => normalize(element.textContent))
                    .find((text) => text !== defaultValue && text !== enName && !text.includes('חדש'));
                const name = normalize(
                    (hebNameCandidate ?? firstCell?.textContent)
                        ?.replace(/חדש!?/g, '')
                        .replace(enName === defaultValue ? '' : enName, ''),
                );

                const parent1 = readGridValue(expandedRoot, ['הורה #1', 'הורה 1', 'Parent 1']);
                const parent2 = readGridValue(expandedRoot, ['הורה #2', 'הורה 2', 'Parent 2']);
                const originStrain = readGridValue(expandedRoot, ['זן מקור', 'גנטיקה', 'Genetics']);
                const manufacturerFromExpanded = readGridValue(expandedRoot, ['מגדל']);
                const brandFromExpanded = readGridValue(expandedRoot, ['מותג']);
                const expiryFromExpanded = readGridValue(expandedRoot, ['תוקף']);
                const terpenes = readGridValue(expandedRoot, ['טרפנים']);
                const packageType = readGridValue(expandedRoot, ['סוג אריזה']);
                const countryFromExpanded = readGridValue(expandedRoot, ['ארץ ייצור', 'ארץ מקור', 'ארץ']);
                const countryOfOrigin =
                    countryFromExpanded !== defaultValue
                        ? countryFromExpanded
                        : countryNames.find((country) => getCellText(row, 6).includes(country)) ?? defaultValue;
                const price = getCellSelectorText(row, 9, '.text-green-600');
                const catalogPrice = getCellSelectorText(row, 9, '.line-through');

                return {
                    name,
                    enName,
                    isNew: (firstCell?.textContent ?? '').includes('חדש'),
                    rating: extractRating(firstCell),
                    deal: extractDeal(expandedRoot) !== defaultValue ? extractDeal(expandedRoot) : extractDeal(firstCell),
                    manufacturer: manufacturerFromExpanded !== defaultValue ? manufacturerFromExpanded : getCellText(row, 3),
                    brand: brandFromExpanded !== defaultValue ? brandFromExpanded : getCellText(row, 5),
                    expiry: expiryFromExpanded !== defaultValue ? expiryFromExpanded : getCellText(row, 7),
                    price,
                    catalogPrice,
                    parent1,
                    parent2,
                    originStrain,
                    countryOfOrigin,
                    terpenes,
                    packageType,
                };
            },
            { rowIndex: index, selector: PRODUCT_ROW_SELECTOR, defaultValue: DEFAULT_VALUE },
        );
    }
}
