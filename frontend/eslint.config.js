import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from '@angular-eslint/eslint-plugin';
import angularTemplate from '@angular-eslint/eslint-plugin-template';
import angularTemplateParser from '@angular-eslint/template-parser';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // TypeScript
  {
    files: ['src/**/*.ts'],
    plugins: { '@angular-eslint': angular },
    rules: {
      ...angular.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // Templates
  {
    files: ['src/**/*.html'],
    languageOptions: { parser: angularTemplateParser },
    plugins: { '@angular-eslint/template': angularTemplate },
    rules: {
      // ── Accessibility (נגישות - הורדנו למינימום כדי שלא יציק) ──
      '@angular-eslint/template/alt-text': 'warn',
      '@angular-eslint/template/click-events-have-key-events': 'off',
      '@angular-eslint/template/interactive-supports-focus': 'off',
      '@angular-eslint/template/label-has-associated-control': 'off',
      '@angular-eslint/template/mouse-events-have-key-events': 'off',
      '@angular-eslint/template/role-has-required-aria': 'off',
      '@angular-eslint/template/valid-aria': 'warn',
      '@angular-eslint/template/table-scope': 'off',
      '@angular-eslint/template/elements-content': 'off',
      '@angular-eslint/template/no-positive-tabindex': 'warn',
      '@angular-eslint/template/no-autofocus': 'off',
      '@angular-eslint/template/no-distracting-elements': 'warn',

      // ── Correctness (דברים שבאמת יכולים לשבור את הקוד - נשארים) ──
      '@angular-eslint/template/banana-in-box': 'error',
      '@angular-eslint/template/no-duplicate-attributes': 'error',
      '@angular-eslint/template/no-negated-async': 'error',
      '@angular-eslint/template/eqeqeq': 'warn',
      '@angular-eslint/template/button-has-type': 'off',
      '@angular-eslint/template/no-non-null-assertion': 'off',
      '@angular-eslint/template/no-any': 'off', // שחררנו את ה-$any

      // ── Style (עיצוב וסדר - שחררנו לחופשי) ────────────────────────
      '@angular-eslint/template/no-inline-styles': 'off',
      '@angular-eslint/template/attributes-order': 'off', // שילך לחפש מי ינענע אותו
      '@angular-eslint/template/prefer-self-closing-tags': 'off',
      '@angular-eslint/template/prefer-class-binding': 'off',
      '@angular-eslint/template/no-interpolation-in-attributes': 'off',
      '@angular-eslint/template/prefer-template-literal': 'off',

      // ── Modern Angular (פיצ'רים חדשים - המלצות בלבד) ───────────────
      '@angular-eslint/template/prefer-control-flow': 'warn',
      '@angular-eslint/template/prefer-at-else': 'off',
      '@angular-eslint/template/prefer-at-empty': 'off',
      '@angular-eslint/template/no-empty-control-flow': 'warn',
      '@angular-eslint/template/prefer-contextual-for-variables': 'off',
      '@angular-eslint/template/use-track-by-function': 'off',
      '@angular-eslint/template/prefer-built-in-pipes': 'off',
      '@angular-eslint/template/prefer-ngsrc': 'off',

      // ── Complexity (סיבוכיות - בוטל לחלוטין) ───────────────────────
      '@angular-eslint/template/no-call-expression': 'off', // מותר לקרוא לפונקציות ב-HTML בשקט
      '@angular-eslint/template/conditional-complexity': 'off',
      '@angular-eslint/template/cyclomatic-complexity': 'off', // שלא יספור לנו כמה if יש בטמפלייט
      '@angular-eslint/template/no-nested-tags': 'off',

      // ── i18n / misc ────────────────────────────────────────────
      '@angular-eslint/template/i18n': 'off',
      '@angular-eslint/template/prefer-static-string-properties': 'off',
    },
  },
];
