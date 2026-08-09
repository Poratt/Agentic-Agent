import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';
import { PrimeNGConfigType, providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { environment } from '../../environments/environment';

export const DARK_MODE_SELECTOR = '[data-theme="dark"]';

const PRIMARY_PALETTE = {
  50: 'color-mix(in srgb, var(--color-primary) 10%, white)',
  100: 'color-mix(in srgb, var(--color-primary) 18%, white)',
  200: 'color-mix(in srgb, var(--color-primary) 30%, white)',
  300: 'color-mix(in srgb, var(--color-primary) 45%, white)',
  400: 'color-mix(in srgb, var(--color-primary) 65%, white)',
  500: 'var(--color-primary)',
  600: 'color-mix(in srgb, var(--color-primary) 85%, black)',
  700: 'color-mix(in srgb, var(--color-primary) 70%, black)',
  800: 'color-mix(in srgb, var(--color-primary) 55%, black)',
  900: 'color-mix(in srgb, var(--color-primary) 40%, black)',
  950: 'color-mix(in srgb, var(--color-primary) 30%, black)',
};

export const AppThemePreset = definePreset(Aura, {
  semantic: {
    primary: PRIMARY_PALETTE,
    colorScheme: {
      light: {
        primary: {
          color: 'var(--color-primary)',
          contrastColor: 'var(--color-white)',
          hoverColor: 'var(--primary-300)',
          activeColor: 'var(--color-primary)',
        },
      },
      dark: {
        primary: {
          color: 'var(--color-primary)',
          contrastColor: 'var(--color-bg)',
          hoverColor: 'var(--primary-300)',
          activeColor: 'var(--color-primary)',
        },
      },
    },
  },
});

export const AppPrimeConfig: PrimeNGConfigType = {
  theme: {
    preset: AppThemePreset,
    options: {
      darkModeSelector: DARK_MODE_SELECTOR,
    },
  },
  ripple: true,
  overlayAppendTo: 'body',
  inputVariant: 'filled',
  pt: {
    button: {},
    pagination: {},
    menu: {
      list: { class: '' },
      item: { class: '' },
      itemContent: { class: '' },
      itemLink: { class: '' },
      itemIcon: { class: '' },
      itemLabel: { class: '' },
      separator: { class: '' },
      submenuLabel: { class: '!' },
    },
    confirmdialog: {},
  },
  license: environment.primeUiLicenseKey,
};

export const PRIME_NG_PROVIDERS = [providePrimeNG(AppPrimeConfig), MessageService, DialogService, ConfirmationService];
