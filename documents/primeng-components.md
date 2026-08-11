# PrimeNG Components Audit

扫描日期: 2026-08-10 (עודכן: הסרת יבואות מתות)

## רכיבים לפי קובץ

| #   | file name                          | primeng elements                                                                                                 |
| --- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | `app.ts`                           | `ConfirmDialogModule`, `ToastModule`                                                                             |
| 2   | `app.html`                         | `<p-toast>`, `<p-confirm-dialog>`                                                                                |
| 3   | `users-management.ts`              | `InputTextModule`, `TableModule`                                                                                 |
| 4   | `users-management.html`            | `<p-table>`, `<p-sort-icon>`                                                                                     |
| 5   | `chat.ts`                          | `Select`                                                                                                         |
| 6   | `chat.html`                        | `<p-select>`                                                                                                     |
| 7   | `ideas-form.ts`                    | `Select`                                                                                                         |
| 8   | `ideas-form.html`                  | `<p-select>`                                                                                                     |
| 9   | `header.ts`                        | `TieredMenu`, `MenuItem`                                                                                         |
| 10  | `header.html`                      | `<p-tiered-menu>`                                                                                                |
| 11  | `strain-hunter.ts`                 | `DialogModule`, `InputTextModule`, `SliderModule`, `TableModule`                                                 |
| 12  | `strain-hunter.html`               | `<p-dialog>`, `<p-slider>`, `<p-table>`, `<p-sort-icon>`                                                         |
| 13  | `matching-preferences-drawer.ts`   | `DrawerModule`                                                                                                   |
| 14  | `matching-preferences-drawer.html` | `<p-drawer>`                                                                                                     |
| 15  | `strain-hunter-settings.ts`        | `TableModule`, `Tabs`, `TabList`, `Tab`, `TabPanels`, `TabPanel`, `ToastModule`                                  |
| 16  | `strain-hunter-settings.html`      | `<p-tabs>`, `<p-tablist>`, `<p-tab>`, `<p-tabpanels>`, `<p-tabpanel>`, `<p-table>`, `<p-sort-icon>`, `<p-toast>` |
| 17  | `llm-providers-management.ts`      | `InputTextModule`, `TableModule`, `DialogModule`, `ToggleSwitchModule`                                           |
| 18  | `llm-providers-management.html`    | `<p-table>`, `<p-sort-icon>`, `<p-dialog>`, `<p-toggleSwitch>`                                                   |
| 19  | `media-studio.ts`                  | `Select`                                                                                                         |
| 20  | `media-studio.html`                | `<p-select>`                                                                                                     |
| 21  | `settings.ts`                      | `Tabs`, `TabList`, `Tab`, `TabPanels`, `TabPanel`                                                                |
| 22  | `settings.html`                    | `<p-tabs>`, `<p-tablist>`, `<p-tab>`, `<p-tabpanels>`, `<p-tabpanel>`                                            |
| 23  | `users-table.component.ts`         | `TableModule`                                                                                                    |
| 24  | `users-table.component.html`       | `<p-table>`                                                                                                      |
| 25  | `primeng-define-preset.ts`         | `providePrimeNG`, `PrimeNGConfigType`, `ConfirmationService`, `MessageService`                                   |

## סיכום שימושים

| אלמנט                 | כמות שימושים |
| --------------------- | ------------ |
| `Table` / `p-table`   | 5            |
| `Select` / `p-select` | 3            |
| `InputText`           | 3            |
| `Tabs` / `p-tabs`     | 2            |
| `Dialog` / `p-dialog` | 2            |
| `Toast` / `p-toast`   | 2            |
| `ToggleSwitch`        | 2            |
| `ConfirmDialog`       | 1            |
| `TieredMenu`          | 1            |
| `Drawer`              | 1            |
| `Slider`              | 1            |

## יבואות שנמחקו (לא היו בשימוש)

| רכיב                      | קובץ                                                   |
| ------------------------- | ------------------------------------------------------ |
| `FloatLabelModule`        | `media-studio.ts`                                      |
| `ConfirmDialogModule`     | `strain-hunter-settings.ts` (כבר מסופק גלובלית)        |
| `ButtonModule`            | `matching-preferences-drawer.ts`                       |
| `ButtonModule`            | `llm-providers-management.ts`                          |
| `TooltipModule` (PrimeNG) | `strain-hunter.ts` (משתמש ב-custom directive)          |
| `InputTextModule`         | `strain-hunter-settings.ts`                            |
| `RippleModule`            | `llm-providers-management.ts`                          |
| `DialogService`           | `primeng-define-preset.ts` (רשום גלובלית אך לא בשימוש) |
