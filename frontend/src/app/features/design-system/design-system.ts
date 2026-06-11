import { CommonModule } from '@angular/common';
import { afterNextRender, Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageStates } from '../../core/enums/page-states.enum';
import { ThemeMode, ThemeService } from '../../core/services/theme.service';

type ColorGroup = 'Primary' | 'Secondary' | 'Neutrals' | 'Feedback';
type TokenCategory = 'color' | 'type' | 'space' | 'radius' | 'effect';

interface TokenItem {
    name: string;
    label: string;
    category: TokenCategory;
    value: string;
    className?: string;
}

interface ColorGroupView {
    name: ColorGroup;
    tokens: TokenItem[];
}

interface PatternPreview {
    name: string;
    classList: string;
    description: string;
    code: string;
}

@Component({
    selector: 'app-design-system',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './design-system.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: [
        './design-system.css',
        './_design-system-showcase.css',
        './_design-system-buttons.css',
        './_design-system-tokens.css',
    ],
})
export class DesignSystem {
    private themeService = inject(ThemeService);

    protected readonly PageStates = PageStates;
    protected readonly pageState = signal(PageStates.Ready);
    protected readonly sandboxTitle = signal('Operational Insight');
    protected readonly sandboxDensity = signal(2);
    protected readonly copiedToken = signal<string | null>(null);
    protected readonly themeMode = this.themeService.mode;

    protected readonly colorGroups = signal<ColorGroupView[]>([
        {
            name: 'Primary',
            tokens: [
                this.createToken('--color-primary', 'Primary accent', 'color', 'swatch-primary'),
                this.createToken('--color-primary-glow', 'Primary glow', 'color', 'swatch-primary-glow'),
            ],
        },
        {
            name: 'Secondary',
            tokens: [
                this.createToken('--color-secondary', 'Secondary accent', 'color', 'swatch-secondary'),
                this.createToken('--color-secondary-glow', 'Secondary glow', 'color', 'swatch-secondary-glow'),
            ],
        },
        {
            name: 'Neutrals',
            tokens: [
                this.createToken('--color-bg', 'App background', 'color', 'swatch-bg'),
                this.createToken('--color-surface', 'Surface glass', 'color', 'swatch-surface'),
                this.createToken('--color-border', 'Border', 'color', 'swatch-border'),
                this.createToken('--color-text-primary', 'Text primary', 'color', 'swatch-text-primary'),
                this.createToken('--color-text-secondary', 'Text secondary', 'color', 'swatch-text-secondary'),
                this.createToken('--color-input-bg', 'Input background', 'color', 'swatch-input'),
                this.createToken('--color-white', 'White constant', 'color', 'swatch-white'),
            ],
        },
        {
            name: 'Feedback',
            tokens: [
                this.createToken('--color-success', 'Success', 'color', 'swatch-success'),
                this.createToken('--color-danger', 'Danger', 'color', 'swatch-danger'),
                this.createToken('--color-danger-bg', 'Danger background', 'color', 'swatch-danger-bg'),
                this.createToken('--color-info', 'Information', 'color', 'swatch-info'),
                this.createToken('--color-info-bg', 'Info background', 'color', 'swatch-info-bg'),
            ],
        },
    ]);

    protected readonly typographyTokens = signal<TokenItem[]>([
        this.createToken('--font-main', 'Font family', 'type', 'font-md'),
        this.createToken('--font-size-xs', 'Micro / badge', 'type', 'font-xs'),
        this.createToken('--font-size-sm', 'Small / caption', 'type', 'font-sm'),
        this.createToken('--font-size-md', 'Body', 'type', 'font-md'),
        this.createToken('--font-size-lg', 'Section header', 'type', 'font-lg'),
        this.createToken('--font-size-xl', 'Page title', 'type', 'font-xl'),
        this.createToken('--font-size-xxl', 'Display', 'type', 'font-xxl'),
        this.createToken('--font-size-huge', 'Huge metric', 'type', 'font-huge'),
        this.createToken('--font-weight-normal', 'Normal weight', 'type', 'weight-normal'),
        this.createToken('--font-weight-medium', 'Medium weight', 'type', 'weight-medium'),
        this.createToken('--font-weight-semibold', 'Semibold weight', 'type', 'weight-semibold'),
        this.createToken('--font-weight-bold', 'Bold weight', 'type', 'weight-bold'),
    ]);

    protected readonly spacingTokens = signal<TokenItem[]>([
        this.createToken('--space-1', 'Base unit', 'space', 'space-1'),
        this.createToken('--space-2', 'Tight gap', 'space', 'space-2'),
        this.createToken('--space-3', 'Compact padding', 'space', 'space-3'),
        this.createToken('--space-4', 'Default padding', 'space', 'space-4'),
        this.createToken('--space-6', 'Card gap', 'space', 'space-6'),
        this.createToken('--space-8', 'Page rhythm', 'space', 'space-8'),
        this.createToken('--space-12', 'Large section', 'space', 'space-12'),
        this.createToken('--space-16', 'Hero section', 'space', 'space-16'),
    ]);

    protected readonly radiusTokens = signal<TokenItem[]>([
        this.createToken('--radius-sm', 'Small radius', 'radius'),
        this.createToken('--radius-md', 'Medium radius', 'radius'),
        this.createToken('--radius-lg', 'Large radius', 'radius'),
        this.createToken('--radius-xl', 'Extra large radius', 'radius'),
    ]);

    protected readonly effectTokens = signal<TokenItem[]>([
        this.createToken('--shadow-soft', 'Soft elevation', 'effect'),
        this.createToken('--shadow-glow-primary', 'Primary glow', 'effect'),
        this.createToken('--shadow-glow-secondary', 'Secondary glow', 'effect'),
        this.createToken('--transition-standard', 'Standard motion', 'effect'),
    ]);

    protected readonly patterns: PatternPreview[] = [
        {
            name: '.glass-effect',
            classList: 'glass-effect pattern-glass',
            description: 'Theme-aware translucent panel using surface, border, and blur tokens.',
            code: '<section class="glass-effect card">...</section>',
        },
        {
            name: '.metric-card',
            classList: 'glass-effect card metric-card pattern-metric',
            description: 'Dashboard metric surface with accent icon, number, and compact metadata.',
            code: '<div class="glass-effect card metric-card">...</div>',
        },
        {
            name: '.status-indicator',
            classList: 'pattern-status',
            description: 'Live connectivity row using the semantic success palette and pulsing dot.',
            code: '<div class="status-indicator"><span class="pulse-dot"></span>...</div>',
        },
    ];

    constructor() {
        afterNextRender(() => this.refreshTokenValues());
    }

    protected setTheme(mode: ThemeMode): void {
        this.themeService.setMode(mode);
        queueMicrotask(() => this.refreshTokenValues());
    }

    protected copyToken(tokenName: string): void {
        void navigator.clipboard.writeText(`var(${tokenName})`).then(() => {
            this.copiedToken.set(tokenName);
            window.setTimeout(() => this.copiedToken.set(null), 1400);
        });
    }

    protected updateSandboxTitle(value: string): void {
        this.sandboxTitle.set(value.trim() || 'Operational Insight');
    }

    protected sandboxGapLabel(): string {
        if (this.sandboxDensity() === 1) {
            return 'Compact';
        }
        if (this.sandboxDensity() === 3) {
            return 'Spacious';
        }
        return 'Comfortable';
    }

    private createToken(name: string, label: string, category: TokenCategory, className?: string): TokenItem {
        return { name, label, category, value: 'loading', className };
    }

    private refreshTokenValues(): void {
        const styles = getComputedStyle(document.documentElement);

        this.colorGroups.update((groups) =>
            groups.map((group) => ({
                ...group,
                tokens: group.tokens.map((token) => this.withResolvedValue(token, styles)),
            })),
        );
        this.typographyTokens.update((tokens) => tokens.map((token) => this.withResolvedValue(token, styles)));
        this.spacingTokens.update((tokens) => tokens.map((token) => this.withResolvedValue(token, styles)));
        this.radiusTokens.update((tokens) => tokens.map((token) => this.withResolvedValue(token, styles)));
        this.effectTokens.update((tokens) => tokens.map((token) => this.withResolvedValue(token, styles)));
    }

    private withResolvedValue(token: TokenItem, styles: CSSStyleDeclaration): TokenItem {
        const value = styles.getPropertyValue(token.name).trim();
        return { ...token, value: value || 'not defined' };
    }
}
