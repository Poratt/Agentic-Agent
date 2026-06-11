Update Guide

[x] In the application's project directory, run ng update @angular/core@22 @angular/cli@22 to update your application to Angular v22. - Basic

[x] Angular v22 requires Node.js v22.22.3 or v24.15.0 and later. Update your Node.js version to meet this minimum requirement. You can check your current version with node --version. - Basic

[x] Update your project to use TypeScript 6.0 or later. Versions older than 6.0 are no longer supported. Use ng update which will handle this automatically. - Basic

[x] Data-prefixed attributes (e.g., data-\*) no longer bind to inputs or outputs. If you were relying on this behavior, use explicit property bindings instead (e.g., [attr.data-value]="value" or [dataValue]="value" for a component input). - Medium
[x] The compiler now throws an error when inputs, outputs, or model are binding to the same property/output. Review your component decorators and ensure no duplicate bindings exist. - Medium

[x] Safe navigation (?.) and nullish coalescing (??) now correctly narrow down nullable types in templates. This may trigger nullishCoalescingNotNullable and optionalChainNotNullable diagnostics on existing projects. Either fix the diagnostics by updating your templates, or temporarily disable them in your tsconfig.json under angularCompilerOptions. - Medium
[x] Angular expressions with optional chaining (?.) now return undefined instead of null. You can use the $safeNavigationMigration() magic function to revert to the previous behavior. - Medium

[x] in variables in template expressions now throw an error as it does in native JavaScript. If you have variables named in in your component or template, update your template expressions to use this.in or renameyour variable. - Advanced

[x] The AnimationCallbackEvent.animationComplete signature has changed. Update any code that depends on the old signature of this event. Review your animation event handlers and tests. - Advanced
[x] If your application uses upload progress reporting through HttpXhrBackend, explicitly opt-in by using provideHttpClient(withXhr()). The default HTTP client no longer includes XHR support by default. - Medium
[x] The reportProgress option in HTTP requests is deprecated. Use reportUploadProgress or reportDownloadProgress instead for more explicit control over progress reporting. - Medium

[x] XHR support in @angular/platform-server is deprecated and is intended to be removed in Angular 23. The underlying xhr2 library does not safely handle redirects (e.g. it can forward Authorization headers on cross-origin redirects and is susceptible to DoS via redirect loops). For server-side rendering, use the default fetch backend instead of withXhr(). - Medium
[x] provideRoutes() has been removed. Use provideRouter() instead, or configure routes as a multi token using ROUTES if necessary. Update your application bootstrap configuration. - Medium

[x] If using AngularJS interoperability, replace deprecated getAngularLib() and setAngularLib() with getAngularJSGlobal() and setAngularJSGlobal() respectively. - Advanced

[x] ComponentFactoryResolver and ComponentFactory are no longer available. Pass the component class directly to APIs like ViewContainerRef.createComponent() or use the standalone createComponent() function instead. - Advanced

[x] createNgModuleRef has been removed. Use createNgModule() instead for dynamic module creation scenarios. - Advanced
[x] Elements with multiple matching selectors now throw a compile-time error. Ensure your components use unique selectors and review any directives that might have conflicting selectors. - Medium

[x] Components with no changeDetection property defined are now OnPush by default. To maintain Eager (the previous default) change detection, explicitly set changeDetection: ChangeDetectionStrategy.Eager in your component decorator. - Medium

[x] ChangeDetectorRef.checkNoChanges() has been removed. In tests, use fixture.detectChanges() instead or verify your component state through other means. - Advanced

[x] Leave animations are no longer limited to the element being removed. They now support nested animations scoped to component boundaries. Review your animation configurations if you relied on the previous scoping behavior. - Medium

[x] paramsInheritanceStrategy now defaults to "always" instead of "emptyOnly". This means route parameters are inherited from all parent routes. To restore the previous behavior, explicitly set paramsInheritanceStrategy: "emptyOnly" in your router configuration. - Medium

[x] The currentSnapshot parameter in CanMatchFn and the canMatch method of the CanMatch interface is now required. Update any class implementations of CanMatch to include this required third argument. - Advanced
[x] Hammer.js integration has been removed from Angular platform-browser. If you need touch gesture support, implement your own gesture detection or use an alternative library. - Medium

[x] The second argument of appRef.bootstrap() no longer accepts any type. Ensure the element you pass is not nullable and matches the expected type. - Advanced

[x] Unused styles are now automatically removed when their associated host is dropped. Be aware that other DOM on the page may be affected if those styles are used by elements outside of Angular or if not using ViewEncapsulation.Emulated. - Medium

[x] The return type for TitleStrategy.getResolvedTitleForRoute has changed from any to a stricter type (e.g., string | undefined). Update your custom TitleStrategy implementations to match the new signature. - Advanced

[x] Incremental hydration is now the default behavior for applications using Server-Side Rendering (SSR). Review your application if you relied on the previous non-incremental hydration behavior. You can use [] withNoIncrementalHydration() to restore the previous behavior if needed. - Basic
[x] The fullTemplateTypeCheck compiler option has been removed. Use strictTemplates instead to enable strict template type checking in your tsconfig.json. - Medium

The strictTemplates compiler option now defaults to true. If your project was not using strict template type checking, you may see new compilation errors. Resolve these errors or explicitly set strictTemplates: [] false in your tsconfig.json to opt out. - Basic

[x] Webpack builders (@angular-devkit/build-angular and @angular-devkit/build-webpack) are now deprecated. Migrate to the @angular/build builders (esbuild/application) for your application builds. - Advanced

[x] CommonEngine APIs from @angular/ssr are deprecated. Migrate to AngularNodeAppEngine or AngularAppEngine instead. - Advanced
[x] istanbul-lib-instrument is now an optional peer dependency. If your project uses Karma with code coverage enabled, ensure istanbul-lib-instrument is explicitly installed. - Medium

[x] ng serve now gives the highest priority to the PORT environment variable. This value overrides any port configured in angular.json or provided via the --port flag. - Basic

[x] The @angular-devkit/architect-cli package is no longer available. Use the architect CLI tool from the @angular-devkit/architect package instead. - Advanced
[x] The experimental @angular-devkit/build-angular:jest and @angular-devkit/build-angular:web-test-runner test builders have been removed. - Medium

After you update - You don't need to do anything after moving between these versions.

UPGRADE REVIEW :

אה, זה מגעיל 😄

`$safeNavigationMigration()` זה פונקציה זמנית שAngular מוסיף כדי לשמר התנהגות ישנה של `?.` שהחזיר `null` במקום `undefined`. הוא לא אמור להישאר בקוד.

הקוד המקורי היה כנראה:

```html
@if (authStore.user()?.role) {
<span class="badge" [badgeColor]="getUserRoleData(authStore.user()!.role)?.color">
  <span class="ph sm" [ngClass]="getUserRoleData(authStore.user()!.role)?.icon"></span>
  {{ getUserRoleData(authStore.user()!.role)?.heLabel }}
</span>
}
```

ב-Angular 22 `?.` מחזיר `undefined` במקום `null`, אז הבדיקה `!== null && !== undefined` מיותרת לחלוטין — מספיק:

```html
@if (authStore.user()?.role) {
```

כדאי לסרוק את כל הפרויקט:

```powershell
grep -r "safeNavigationMigration" frontend/src
```
