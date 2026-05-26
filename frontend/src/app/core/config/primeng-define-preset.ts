import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';
import { PrimeNGConfigType, providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';

export const DARK_MODE_SELECTOR = '.dark-mode';

const PRIMARY_PALETTE = {
  50: 'var(--primary-50)',
  100: 'var(--primary-100)',
  200: 'var(--primary-200)',
  300: 'var(--primary-300)',
  400: 'var(--primary-400)',
  500: 'var(--primary-500)',
  600: 'var(--primary-600)',
  700: 'var(--primary-700)',
  800: 'var(--primary-800)',
  900: 'var(--primary-900)',
  950: 'var(--primary-900)',
};

export const AppThemePreset = definePreset(Aura, {
  semantic: {
    primary: PRIMARY_PALETTE,
    colorScheme: {
      light: {
        primary: {
          color: '{primary.500}',
          inverseColor: '#ffffff',
          hoverColor: '{primary.600}',
          activeColor: '{primary.700}',
        },
      },
      dark: {
        primary: {
          color: '{primary.400}',
          inverseColor: '#000000',
          hoverColor: '{primary.300}',
          activeColor: '{primary.200}',
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
  },
};

export const PRIME_NG_PROVIDERS = [providePrimeNG(AppPrimeConfig), MessageService, DialogService];
