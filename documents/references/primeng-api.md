```ts
import _ as i0 from '@angular/core';
import { EventEmitter, SimpleChanges, ElementRef, TemplateRef } from '@angular/core';
import _ as rxjs from 'rxjs';
import { Nullable } from 'primeng/ts-helpers';
import { QueryParamsHandling } from '@angular/router';
import { MotionOptions } from '@primeuix/motion';
import \* as i1 from '@angular/common';

/\*\*

- Represents a blockable user interface element.
  _/
  interface BlockableUI {
  /\*\*
  _ Retrieves the blockable element associated with the UI.
  _ @returns The HTML element that can be blocked.
  _/
  getBlockableElement(): HTMLElement;
  }

/\*\*

- Type of the confirm event.
  \*/
  declare enum ConfirmEventType {
  ACCEPT = 0,
  REJECT = 1,
  CANCEL = 2
  }

/\*\*

- Represents a confirmation dialog configuration.
- @group Interface
  _/
  interface Confirmation {
  /\*\*
  _ The message to be displayed in the confirmation dialog.
  _/
  message?: string;
  /\*\*
  _ A unique key to identify the confirmation dialog.
  _/
  key?: string;
  /\*\*
  _ The name of the icon to be displayed in the confirmation dialog.
  _/
  icon?: string;
  /\*\*
  _ The header text of the confirmation dialog.
  _/
  header?: string;
  /\*\*
  _ The callback function to be executed when the accept button is clicked.
  _/
  accept?: () => void;
  /\*\*
  _ The callback function to be executed when the reject button is clicked.
  _/
  reject?: () => void;
  /\*\*
  _ The label text for the accept button.
  _/
  acceptLabel?: string;
  /\*\*
  _ The label text for the reject button.
  _/
  rejectLabel?: string;
  /\*\*
  _ The name of the icon to be displayed on the accept button.
  _/
  acceptIcon?: string;
  /\*\*
  _ The name of the icon to be displayed on the reject button.
  _/
  rejectIcon?: string;
  /\*\*
  _ Specifies whether the accept button should be visible.
  _/
  acceptVisible?: boolean;
  /\*\*
  _ Specifies whether the reject button should be visible.
  _/
  rejectVisible?: boolean;
  /\*\*
  _ Specifies whether to block scrolling on the page when the confirmation dialog is displayed.
  _/
  blockScroll?: boolean;
  /\*\*
  _ Specifies whether the confirmation dialog should be closed when the escape key is pressed.
  _/
  closeOnEscape?: boolean;
  /\*\*
  _ Specifies whether clicking outside the confirmation dialog should dismiss it.
  _/
  dismissableMask?: boolean;
  /\*\*
  _ Element to receive the focus when the dialog gets visible.
  _ @defaultValue 'accept'
  _/
  defaultFocus?: 'accept' | 'reject' | 'close' | 'none';
  /**
  _ The CSS class name to be applied to the accept button.
  _/
  acceptButtonStyleClass?: string;
  /**
  _ The CSS class name to be applied to the reject button.
  _/
  rejectButtonStyleClass?: string;
  /**
  _ The target event where the confirmation dialog is triggered from.
  _/
  target?: EventTarget;
  /**
  _ An event emitter for the accept event.
  _/
  acceptEvent?: EventEmitter<void>;
  /**
  _ An event emitter for the reject event.
  _/
  rejectEvent?: EventEmitter<ConfirmEventType>;
  /**
  _ Accept button properties.
  _/
  acceptButtonProps?: any;
  /**
  _ Reject button properties.
  _/
  rejectButtonProps?: any;
  /**
  _ Close button properties.
  _/
  closeButtonProps?: any;
  /**
  _ Defines if the dialog is closable.
  _/
  closable?: boolean;
  /**
  _ Defines the dialog position.
  _/
  position?: any;
  /\*\*
  _ Specifies whether the dialog displayed as modal or not.
  _ @defaultValue true
  \*/
  modal?: boolean;
  }

/\*\*

- Methods used in confirmation service.
- @group Service
  _/
  declare class ConfirmationService {
  private requireConfirmationSource;
  private acceptConfirmationSource;
  requireConfirmation$: rxjs.Observable<Confirmation | null>;
  accept: rxjs.Observable<Confirmation | null>;
  /\*\*
  _ Callback to invoke on confirm.
  _ @param {Confirmation} confirmation - Represents a confirmation dialog configuration.
  _ @group Method
  _/
  confirm(confirmation: Confirmation): this;
  /\*\*
  _ Closes the dialog.
  _ @group Method
  _/
  close(): this;
  /\*\*
  _ Accepts the dialog.
  _ @group Method
  \*/
  onAccept(): void;
  static ɵfac: i0.ɵɵFactoryDeclaration<ConfirmationService, never>;
  static ɵprov: i0.ɵɵInjectableDeclaration<ConfirmationService>;
  }

declare class ContextMenuService {
private activeItemKeyChange;
activeItemKeyChange$: rxjs.Observable<string>;
activeItemKey: Nullable<string>;
changeKey(key: string): void;
reset(): void;
static ɵfac: i0.ɵɵFactoryDeclaration<ContextMenuService, never>;
static ɵprov: i0.ɵɵInjectableDeclaration<ContextMenuService>;
}

declare class FilterMatchMode {
static readonly STARTS_WITH = "startsWith";
static readonly CONTAINS = "contains";
static readonly NOT_CONTAINS = "notContains";
static readonly ENDS_WITH = "endsWith";
static readonly EQUALS = "equals";
static readonly NOT_EQUALS = "notEquals";
static readonly IN = "in";
static readonly LESS_THAN = "lt";
static readonly LESS_THAN_OR_EQUAL_TO = "lte";
static readonly GREATER_THAN = "gt";
static readonly GREATER_THAN_OR_EQUAL_TO = "gte";
static readonly BETWEEN = "between";
static readonly IS = "is";
static readonly IS_NOT = "isNot";
static readonly BEFORE = "before";
static readonly AFTER = "after";
static readonly DATE_IS = "dateIs";
static readonly DATE_IS_NOT = "dateIsNot";
static readonly DATE_BEFORE = "dateBefore";
static readonly DATE_AFTER = "dateAfter";
}
/\*\*

- Defines the filter match mode type.
- @group Types
  \*/
  type FilterMatchModeType = 'startsWith' | 'contains' | 'notContains' | 'endsWith' | 'equals' | 'notEquals' | 'in' | 'between' | 'lt' | 'lte' | 'gt' | 'gte' | 'is' | 'isNot' | 'before' | 'after' | 'dateIs' | 'dateIsNot' | 'dateBefore' | 'dateAfter';

/\*\*

- Represents metadata for filtering a data set.
- @group Interface
  _/
  interface FilterMetadata {
  /\*\*
  _ The value used for filtering.
  _/
  value?: any;
  /\*\*
  _ The match mode for filtering.
  _/
  matchMode?: string;
  /\*\*
  _ The operator for filtering.
  \*/
  operator?: string;
  }

declare class FilterOperator {
static readonly AND = "and";
static readonly OR = "or";
}

declare class FilterService {
filter(value: any[], fields: any[], filterValue: any, filterMatchMode: string, filterLocale?: string): any[];
filters: {
[rule: string]: Function;
};
register(rule: string, fn: Function): void;
static ɵfac: i0.ɵɵFactoryDeclaration<FilterService, never>;
static ɵprov: i0.ɵɵInjectableDeclaration<FilterService>;
}

/\*\*

- Represents metadata for sorting.
- @group Interface
  \*/
  interface SortMeta {
  field: string;
  order: number;
  }

/\*\*

- Represents an event object for lazy loading data.
- @group Interface
  _/
  interface LazyLoadEvent {
  /\*\*
  _ The index of the first record to be loaded.
  _/
  first?: number;
  /\*\*
  _ The index of the last record to be loaded.
  _/
  last?: number;
  /\*\*
  _ The number of rows to load.
  _/
  rows?: number;
  /\*\*
  _ The field to be used for sorting.
  _/
  sortField?: string;
  /\*\*
  _ The sort order for the field.
  _/
  sortOrder?: number;
  /\*\*
  _ An array of sort metadata objects for multiple column sorting.
  _/
  multiSortMeta?: SortMeta[];
  /\*\*
  _ An object containing filter metadata for filtering the data.
  _ The keys represent the field names, and the values represent the corresponding filter metadata.
  _/
  filters?: {
  [s: string]: FilterMetadata;
  };
  /**
  _ The global filter value for filtering across all columns.
  _/
  globalFilter?: any;
  /**
  _ A function that can be called to force an update in the lazy loaded data.
  _/
  forceUpdate?: () => void;
  }

/\*\*

- Meta data for lazy load event.
- @group Interface
  \*/
  interface LazyLoadMeta {
  first?: number | undefined | null;
  rows?: number | undefined | null;
  sortField?: string | string[] | null | undefined;
  sortOrder?: number | undefined | null;
  filters?: {
  [s: string]: FilterMetadata | FilterMetadata[] | undefined;
  };
  globalFilter?: string | string[] | undefined | null;
  multiSortMeta?: SortMeta[] | undefined | null;
  forceUpdate?: Function;
  last?: number | undefined | null;
  }

interface Lifecycle {
/**
_ Simulates Angular's ngOnInit hook.
_ @see {@link OnInit#ngOnInit}
\*/
onInit(): void;
/**
_ Simulates Angular's ngOnChanges hook.
_ @see {@link OnChanges#ngOnChanges}
_/
onChanges(changes: SimpleChanges): void;
/\*\*
_ Simulates Angular's ngDoCheck hook.
_ @see {@link DoCheck#ngDoCheck}
_/
onDoCheck(): void;
/**
_ Simulates Angular's ngOnDestroy hook.
_ @see {@link OnDestroy#ngOnDestroy}
\*/
onDestroy(): void;
/**
_ Simulates Angular's ngAfterContentInit hook.
_ @see {@link AfterContentInit#ngAfterContentInit}
_/
onAfterContentInit(): void;
/\*\*
_ Simulates Angular's ngAfterContentChecked hook.
_ @see {@link AfterContentChecked#ngAfterContentChecked}
_/
onAfterContentChecked(): void;
/**
_ Simulates Angular's ngAfterViewInit hook.
_ @see {@link AfterViewInit#ngAfterViewInit}
\*/
onAfterViewInit(): void;
/**
_ Simulates Angular's ngAfterViewChecked hook.
_ @see {@link AfterViewChecked#ngAfterViewChecked}
_/
onAfterViewChecked(): void;
}
interface LifecycleHooks extends Partial<Lifecycle> {
/\*\*
_ Defines a function to be called before the component's initialization (constructor phase).
\*/
onBeforeInit?(): void;
}

/\*\*

- Defines options of Tooltip.
- @group Interface
  _/
  interface TooltipOptions {
  /\*\*
  _ Label of tooltip.
  _/
  tooltipLabel?: string;
  /\*\*
  _ Position of tooltip.
  _/
  tooltipPosition?: 'right' | 'left' | 'top' | 'bottom';
  /\*\*
  _ Event to show the tooltip.
  _/
  tooltipEvent?: 'hover' | 'focus' | 'both';
  /\*\*
  _ Target element to attach the overlay, valid values are "body" or a local ng-template variable of another element (note: use binding with brackets for template variables, e.g. [appendTo]="mydiv" for a div element having #mydiv as variable name).
  _ @defaultValue body
  _/
  appendTo?: HTMLElement | ElementRef | TemplateRef<any> | string | null | undefined | any;
  /**
  _ Type of CSS position.
  _/
  positionStyle?: string;
  /**
  _ Style class of the tooltip.
  _/
  tooltipStyleClass?: string;
  /**
  _ Whether the z-index should be managed automatically to always go on top or have a fixed value.
  _ @defaultValue auto
  \*/
  tooltipZIndex?: string;
  /**
  _ By default the tooltip contents are rendered as text. Set to false to support html tags in the content.
  _/
  escape?: boolean;
  /**
  _ When present, it specifies that the component should be disabled.
  _/
  disabled?: boolean;
  /**
  _ Specifies the additional vertical offset of the tooltip from its default position.
  _/
  positionTop?: number;
  /**
  _ Specifies the additional horizontal offset of the tooltip from its default position.
  _/
  positionLeft?: number;
  /**
  _ Delay to show the tooltip in milliseconds.
  _/
  showDelay?: number;
  /**
  _ Delay to hide the tooltip in milliseconds.
  _/
  hideDelay?: number;
  /**
  _ Time to wait in milliseconds to hide the tooltip even it is active.
  _/
  life?: number;
  /**
  _ When present, it adds a custom id to the tooltip.
  _/
  id?: string;
  /**
  _ Whether to hide tooltip when hovering over tooltip content.
  _ @defaultValue true
  _/
  autoHide?: boolean;
  /\*\*
  _ Whether to hide tooltip on escape key press.
  _ @defaultValue true
  _/
  hideOnEscape?: boolean;
  /\*\*
  _ Whether to show the tooltip only when the target text overflows (e.g., ellipsis is active).
  _ @defaultValue false
  \*/
  showOnEllipsis?: boolean;
  }

/\*\*

- MenuItem provides the following properties. Note that not all of them may be utilized by the tabmenu component.
- @group Interface
  _/
  interface MenuItem {
  /\*\*
  _ Text of the item.
  _/
  label?: string;
  /\*\*
  _ Icon of the item.
  _/
  icon?: string;
  /\*\*
  _ Callback to execute when item is clicked.
  _/
  command?(event: MenuItemCommandEvent): void;
  /\*\*
  _ External link to navigate when item is clicked.
  _/
  url?: string;
  /\*\*
  _ An array of children menuitems.
  _/
  items?: MenuItem[];
  /\*\*
  _ Visibility of submenu.
  _/
  expanded?: boolean;
  /\*\*
  _ Whether the submenu can be toggled (collapsed/expanded).
  _/
  toggleable?: boolean;
  /\*\*
  _ When set as true, disables the menuitem.
  _/
  disabled?: boolean;
  /\*\*
  _ Whether the dom element of menuitem is created or not.
  _/
  visible?: boolean;
  /\*\*
  _ Specifies where to open the linked document.
  _/
  target?: string;
  /\*\*
  _ Whether to escape the label or not. Set to false to display html content.
  _/
  escape?: boolean;
  /\*\*
  _ Configuration for active router link.
  _/
  routerLinkActiveOptions?: any;
  /\*\*
  _ Defines the item as a separator.
  _/
  separator?: boolean;
  /\*\*
  _ Value of the badge.
  _/
  badge?: string;
  /\*\*
  _ Tooltip of the item.
  _/
  tooltip?: string;
  /\*\*
  _ Position of the tooltip item.
  _/
  tooltipPosition?: string;
  /\*\*
  _ Style class of the badge.
  _/
  badgeStyleClass?: string;
  /\*\*
  _ Inline style of the menuitem.
  _/
  style?: {
  [klass: string]: any;
  } | null | undefined;
  /\*\*
  _ Style class of the menuitem.
  _/
  styleClass?: string;
  /\*\*
  _ Tooltip text of the item.
  _/
  title?: string;
  /\*\*
  _ Identifier of the element.
  _/
  id?: string;
  /\*\*
  _ Value of HTML data-_ attribute.
  _/
  automationId?: any;
  /**
  _ Specifies tab order of the item.
  _/
  tabindex?: string;
  /**
  _ RouterLink definition for internal navigation.
  _/
  routerLink?: any;
  /**
  _ Query parameters for internal navigation via routerLink.
  _/
  queryParams?: {
  [k: string]: any;
  };
  /**
  _ Sets the hash fragment for the URL.
  _/
  fragment?: string;
  /**
  _ How to handle query parameters in the router link for the next navigation. One of:
  merge : Merge new with current parameters.
  preserve : Preserve current parameters.k.
  _/
  queryParamsHandling?: QueryParamsHandling;
  /**
  _ When true, preserves the URL fragment for the next navigation.
  _/
  preserveFragment?: boolean;
  /**
  _ When true, navigates without pushing a new state into history.
  _/
  skipLocationChange?: boolean;
  /**
  _ When true, navigates while replacing the current state in history.
  _/
  replaceUrl?: boolean;
  /**
  _ Inline style of the item's icon.
  _/
  iconStyle?: {
  [klass: string]: any;
  } | null | undefined;
  /**
  _ Class of the item's icon.
  _/
  iconClass?: string;
  /**
  _ Inline style of the item's label.
  _/
  labelStyle?: {
  [klass: string]: any;
  } | null | undefined;
  /**
  _ Class of the item's label.
  _/
  labelClass?: string;
  /**
  _ Inline style of the item's link.
  _/
  linkStyle?: {
  [klass: string]: any;
  } | null | undefined;
  /**
  _ Class of the item's link.
  _/
  linkClass?: string;
  /**
  _ Developer-defined state that can be passed to any navigation.
  _ @see {MenuItemState}
  \*/
  state?: {
  [k: string]: any;
  };
  /**
  _ Options of the item's tooltip.
  _ @see {TooltipOptions}
  _/
  tooltipOptions?: TooltipOptions;
  /\*\*
  _ Optional
  \*/
  [key: string]: any;
  }
  /\*\*
- Custom command event
- @see {@link MenuItem.command}
- @group Events
  _/
  interface MenuItemCommandEvent {
  /\*\*
  _ Browser event.
  _/
  originalEvent?: Event;
  /\*\*
  _ Selected menu item.
  _/
  item?: MenuItem | MegaMenuItem;
  /\*\*
  _ Index of the selected item.
  \*/
  index?: number;
  }

/\*\*

- MegaMenuItem API provides the following properties.
- @group Interface
  _/
  interface MegaMenuItem {
  /\*\*
  _ Text of the item.
  _/
  label?: string;
  /\*\*
  _ Icon of the item.
  _/
  icon?: string;
  /\*\*
  _ Callback to execute when item is clicked.
  _/
  command?: (event?: any) => void;
  /\*\*
  _ External link to navigate when item is clicked.
  _/
  url?: string;
  /\*\*
  _ An array of children menuitems.
  _/
  items?: MenuItem[][];
  /\*\*
  _ Specifies whether the mega menu item is expanded.
  _/
  expanded?: boolean;
  /\*\*
  _ When set as true, disables the menuitem.
  _/
  disabled?: boolean;
  /\*\*
  _ Whether the dom element of menuitem is created or not.
  _/
  visible?: boolean;
  /\*\*
  _ Specifies where to open the linked document.
  _/
  target?: string;
  /\*\*
  _ Configuration for active router link.
  _/
  routerLinkActiveOptions?: any;
  /\*\*
  _ Defines the item as a separator.
  _/
  separator?: boolean;
  /\*\*
  _ Value of the badge.
  _/
  badge?: string;
  /\*\*
  _ Style class of the badge.
  _/
  badgeStyleClass?: string;
  /\*\*
  _ Inline style of the menuitem.
  _/
  style?: any;
  /\*\*
  _ Style class of the menuitem.
  _/
  styleClass?: string;
  /\*\*
  _ Inline style of the item's icon.
  _/
  iconStyle?: any;
  /\*\*
  _ Tooltip text of the item.
  _/
  title?: string;
  /\*\*
  _ Identifier of the element.
  _/
  id?: string;
  /\*\*
  _ Value of HTML data-_ attribute.
  _/
  automationId?: any;
  /**
  _ Specifies tab order of the item.
  _/
  tabindex?: string;
  /**
  _ RouterLink definition for internal navigation.
  _/
  routerLink?: any;
  /**
  _ Query parameters for internal navigation via routerLink.
  _/
  queryParams?: {
  [k: string]: any;
  };
  /**
  _ Sets the hash fragment for the URL.
  _/
  fragment?: string;
  /**
  _ How to handle query parameters in the router link for the next navigation. One of:
  merge : Merge new with current parameters.
  preserve : Preserve current parameters.k.
  _/
  queryParamsHandling?: QueryParamsHandling;
  /**
  _ When true, preserves the URL fragment for the next navigation.
  _/
  preserveFragment?: boolean;
  /**
  _ When true, navigates without pushing a new state into history.
  _/
  skipLocationChange?: boolean;
  /**
  _ When true, navigates while replacing the current state in history.
  _/
  replaceUrl?: boolean;
  /**
  _ Developer-defined state that can be passed to any navigation.
  _/
  state?: {
  [k: string]: any;
  };
  /**
  _ Optional
  _/
  [key: string]: any;
  }

/\*\*

- Deines valid options for the toast message.
- @group Interface
  \*/
  interface ToastMessageOptions {
  text?: any;
  severity?: string;
  summary?: string;
  detail?: string;
  id?: any;
  key?: string;
  life?: number;
  sticky?: boolean;
  closable?: boolean;
  data?: any;
  icon?: string;
  contentStyleClass?: string;
  styleClass?: string;
  closeIcon?: string;
  }

/\*\*

- Message service used in messages and toast components.
- @group Service
  _/
  declare class MessageService {
  private messageSource;
  private clearSource;
  messageObserver: rxjs.Observable<ToastMessageOptions | ToastMessageOptions[]>;
  clearObserver: rxjs.Observable<string | null>;
  /\*\*
  _ Inserts single message.
  _ @param {ToastMessageOptions} message - Message to be added.
  _ @group Method
  _/
  add(message: ToastMessageOptions): void;
  /\*\*
  _ Inserts new messages.
  _ @param {Message[]} messages - Messages to be added.
  _ @group Method
  _/
  addAll(messages: ToastMessageOptions[]): void;
  /\*\*
  _ Clears the message with the given key.
  _ @param {string} key - Key of the message to be cleared.
  _ @group Method
  \*/
  clear(key?: string): void;
  static ɵfac: i0.ɵɵFactoryDeclaration<MessageService, never>;
  static ɵprov: i0.ɵɵInjectableDeclaration<MessageService>;
  }

/\*\*

- Represents the type of overlay mode, which can be 'modal', 'overlay', or undefined.
- @group Types
  \*/
  type OverlayModeType = 'modal' | 'overlay' | undefined;
  /\*\*
- Represents the type of direction for a responsive overlay, which can be one of the specified values or undefined.
- @group Types
  \*/
  type ResponsiveOverlayDirectionType = 'center' | 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'left-start' | 'left-end' | 'right' | 'right-start' | 'right-end' | undefined;
  /\*\*
- Represents the options for an overlay listener.
- @group Interface
  _/
  interface OverlayListenerOptions {
  /\*\*
  _ The type of listener, which can be 'scroll', 'outside', 'resize', or undefined.
  _/
  type?: 'scroll' | 'outside' | 'resize' | undefined;
  /\*\*
  _ The mode of the overlay listener.
  _/
  mode?: OverlayModeType;
  /\*\*
  _ Indicates whether the overlay listener is valid.
  \*/
  valid?: boolean;
  }
  /\*\*
- Represents the options for a responsive overlay.
- @group Events
  _/
  interface ResponsiveOverlayOptions {
  /\*\*
  _ The inline style for the responsive overlay.
  _/
  style?: any;
  /\*\*
  _ The CSS class for the responsive overlay.
  _/
  styleClass?: string;
  /\*\*
  _ The inline style for the content of the responsive overlay.
  _/
  contentStyle?: any;
  /\*\*
  _ The CSS class for the content of the responsive overlay.
  _/
  contentStyleClass?: string;
  /\*\*
  _ The breakpoint for the responsive overlay.
  _/
  breakpoint?: string;
  /\*\*
  _ The media query for the responsive overlay.
  _/
  media?: string;
  /\*\*
  _ The direction for the responsive overlay.
  \*/
  direction?: ResponsiveOverlayDirectionType;
  }
  /\*\*
- Represents an event that occurs when an overlay is shown.
- @group Events
  _/
  interface OverlayOnShowEvent {
  /\*\*
  _ The overlay element.
  _/
  overlay?: HTMLElement | undefined;
  /\*\*
  _ The target element.
  _/
  target?: HTMLElement | undefined;
  /\*\*
  _ The mode of the overlay.
  \*/
  mode?: OverlayModeType;
  }
  /\*\*
- Represents an event that occurs before an overlay is shown.
- @extends {OverlayOnShowEvent}
- @group Events
  \*/
  interface OverlayOnBeforeShowEvent extends OverlayOnShowEvent {
  }
  /\*\*
- Represents an event that occurs before an overlay is hidden.
- @extends {OverlayOnBeforeShowEvent}
- @group Events
  \*/
  interface OverlayOnBeforeHideEvent extends OverlayOnBeforeShowEvent {
  }
  /\*\*
- Represents an event that occurs when an overlay is hidden.
- @extends {OverlayOnShowEvent}
- @group Events
  \*/
  interface OverlayOnHideEvent extends OverlayOnShowEvent {
  }
  /\*\*
- Represents the options for an overlay.
- @group Interface
  _/
  interface OverlayOptions {
  /\*\*
  _ The mode of the overlay.
  _/
  mode?: OverlayModeType;
  /\*\*
  _ The inline style for the overlay.
  _/
  style?: any;
  /\*\*
  _ The CSS class for the overlay.
  _/
  styleClass?: string;
  /\*\*
  _ The inline style for the content of the overlay.
  _/
  contentStyle?: any;
  /\*\*
  _ The CSS class for the content of the overlay.
  _/
  contentStyleClass?: string;
  /\*\*
  _ The target element.
  _/
  target?: any;
  /\*\*
  _ The element or location where the overlay should be appended.
  _/
  appendTo?: 'body' | HTMLElement | undefined;
  /\*\*
  _ Indicates whether the overlay should have an auto-generated z-index.
  _/
  autoZIndex?: boolean;
  /\*\*
  _ The base z-index value for the overlay.
  _/
  baseZIndex?: number;
  /\*\*
  _ The motion options for the overlay.
  _/
  motionOptions?: MotionOptions;
  /\*\*
  _ Indicates whether the overlay should be hidden when the escape key is pressed.
  _/
  hideOnEscape?: boolean;
  /\*\*
  _ A listener function for handling events related to the overlay.
  _/
  listener?: (event: Event, options?: OverlayListenerOptions) => boolean | void;
  /\*\*
  _ The options for a responsive overlay.
  _/
  responsive?: ResponsiveOverlayOptions | undefined;
  /\*\*
  _ A callback function that is invoked before the overlay is shown.
  _/
  onBeforeShow?: (event?: OverlayOnBeforeShowEvent) => void;
  /\*\*
  _ A callback function that is invoked when the overlay is shown.
  _/
  onShow?: (event?: OverlayOnShowEvent) => void;
  /\*\*
  _ A callback function that is invoked before the overlay is hidden.
  _/
  onBeforeHide?: (event?: OverlayOnBeforeHideEvent) => void;
  /\*\*
  _ A callback function that is invoked when the overlay is hidden.
  _/
  onHide?: (event?: OverlayOnHideEvent) => void;
  /\*\*
  _ A callback function that is invoked when the overlay's animation starts.
  _/
  onAnimationStart?: (event?: AnimationEvent) => void;
  /\*\*
  _ A callback function that is invoked when the overlay's animation is done.
  \*/
  onAnimationDone?: (event?: AnimationEvent) => void;
  }

declare class OverlayService {
private clickSource;
private parentDragSource;
clickObservable: rxjs.Observable<any>;
parentDragObservable: rxjs.Observable<Element>;
add(event: any): void;
emitParentDrag(container: Element): void;
static ɵfac: i0.ɵɵFactoryDeclaration<OverlayService, never>;
static ɵprov: i0.ɵɵInjectableDeclaration<OverlayService>;
}

/\*\*

- Defines the pass-through options.
  _/
  interface PassThroughOptions {
  /\*\*
  _ Defines whether the props should be merged.
  _ @default false
  _/
  mergeProps?: boolean | ((global: unknown, self: unknown, datasets?: unknown) => unknown);
  /**
  _ Defines whether the sections should be merged.
  _ @default true
  \*/
  mergeSections?: boolean | undefined;
  }
  /**
- Defines the pass-through method options.
- @template I Type of instance.
- @template PI Type of parent instance.
  _/
  interface PassThroughContext<I = unknown, PI = unknown> {
  /\*\*
  _ Defines instance.
  _/
  instance: I;
  /\*\*
  _ Defines parent options.
  _/
  parent: {
  instance: PI;
  };
  /\*\*
  _ Defines passthrough(pt) options in global config.
  _/
  global?: Record<PropertyKey, unknown> | undefined;
  }
  interface CommonPassThrough {
  /\*\*
  _ Used to manage all lifecycle hooks.
  \*/
  hooks?: LifecycleHooks;
  }
  type HTMLElementProps<T> = {
  [K in keyof T as T[K] extends Function ? never : K]?: T[K];
  };
  type OnGlobalEventHandlers = {
  [K in keyof GlobalEventHandlers as K extends `on${infer Rest}` ? `on${Rest}` : never]?: GlobalEventHandlers[K];
  };
  type PassThroughAttributes<E> = Omit<HTMLElementProps<E>, 'style'> & OnGlobalEventHandlers & {
  [key: string]: any;
  } & {
  style?: Partial<CSSStyleDeclaration> | undefined;
  };
  declare type PassThroughOption<E = HTMLElement, I = unknown, PI = unknown> = PassThroughAttributes<E> | ((options: PassThroughContext<I, PI>) => PassThroughAttributes<E> | string) | string | null | undefined;
  type AllPassThrough<O> = O & CommonPassThrough;
  declare type PassThrough<I = unknown, O = unknown> = AllPassThrough<O> | ((context: PassThroughContext<I>) => AllPassThrough<O>) | null | undefined;

declare class PrimeIcons {
static readonly ADDRESS_BOOK = "pi pi-address-book";
static readonly ALIGN_CENTER = "pi pi-align-center";
static readonly ALIGN_JUSTIFY = "pi pi-align-justify";
static readonly ALIGN_LEFT = "pi pi-align-left";
static readonly ALIGN_RIGHT = "pi pi-align-right";
static readonly AMAZON = "pi pi-amazon";
static readonly ANDROID = "pi pi-android";
static readonly ANGLE_DOUBLE_DOWN = "pi pi-angle-double-down";
static readonly ANGLE_DOUBLE_LEFT = "pi pi-angle-double-left";
static readonly ANGLE_DOUBLE_RIGHT = "pi pi-angle-double-right";
static readonly ANGLE_DOUBLE_UP = "pi pi-angle-double-up";
static readonly ANGLE_DOWN = "pi pi-angle-down";
static readonly ANGLE_LEFT = "pi pi-angle-left";
static readonly ANGLE_RIGHT = "pi pi-angle-right";
static readonly ANGLE_UP = "pi pi-angle-up";
static readonly APPLE = "pi pi-apple";
static readonly ARROWS_ALT = "pi pi-arrows-alt";
static readonly ARROW_CIRCLE_DOWN = "pi pi-arrow-circle-down";
static readonly ARROW_CIRCLE_LEFT = "pi pi-arrow-circle-left";
static readonly ARROW_CIRCLE_RIGHT = "pi pi-arrow-circle-right";
static readonly ARROW_CIRCLE_UP = "pi pi-arrow-circle-up";
static readonly ARROW_DOWN = "pi pi-arrow-down";
static readonly ARROW_DOWN_LEFT = "pi pi-arrow-down-left";
static readonly ARROW_DOWN_LEFT_AND_ARROW_UP_RIGHT_TO_CENTER = "pi pi-arrow-down-left-and-arrow-up-right-to-center";
static readonly ARROW_DOWN_RIGHT = "pi pi-arrow-down-right";
static readonly ARROW_LEFT = "pi pi-arrow-left";
static readonly ARROW_RIGHT_ARROW_LEFT = "pi pi-arrow-right-arrow-left";
static readonly ARROW_RIGHT = "pi pi-arrow-right";
static readonly ARROW_UP = "pi pi-arrow-up";
static readonly ARROW_UP_LEFT = "pi pi-arrow-up-left";
static readonly ARROW_UP_RIGHT = "pi pi-arrow-up-right";
static readonly ARROW_UP_RIGHT_AND_ARROW_DOWN_LEFT_FROM_CENTER = "pi pi-arrow-up-right-and-arrow-down-left-from-center";
static readonly ARROWS_H = "pi pi-arrows-h";
static readonly ARROWS_V = "pi pi-arrows-v";
static readonly ASTERISK = "pi pi-asterisk";
static readonly AT = "pi pi-at";
static readonly BACKWARD = "pi pi-backward";
static readonly BAN = "pi pi-ban";
static readonly BARCODE = "pi pi-barcode";
static readonly BARS = "pi pi-bars";
static readonly BELL = "pi pi-bell";
static readonly BELL_SLASH = "pi pi-bell-slash";
static readonly BITCOIN = "pi pi-bitcoin";
static readonly BOLT = "pi pi-bolt";
static readonly BOOK = "pi pi-book";
static readonly BOOKMARK = "pi pi-bookmark";
static readonly BOOKMARK_FILL = "pi pi-bookmark-fill";
static readonly BOX = "pi pi-box";
static readonly BRIEFCASE = "pi pi-briefcase";
static readonly BUILDING = "pi pi-building";
static readonly BUILDING_COLUMNS = "pi pi-building-columns";
static readonly BULLSEYE = "pi pi-bullseye";
static readonly CALCULATOR = "pi pi-calculator";
static readonly CALENDAR = "pi pi-calendar";
static readonly CALENDAR_CLOCK = "pi pi-calendar-clock";
static readonly CALENDAR_MINUS = "pi pi-calendar-minus";
static readonly CALENDAR_PLUS = "pi pi-calendar-plus";
static readonly CALENDAR_TIMES = "pi pi-calendar-times";
static readonly CAMERA = "pi pi-camera";
static readonly CAR = "pi pi-car";
static readonly CARET_DOWN = "pi pi-caret-down";
static readonly CARET_LEFT = "pi pi-caret-left";
static readonly CARET_RIGHT = "pi pi-caret-right";
static readonly CARET_UP = "pi pi-caret-up";
static readonly CART_ARROW_DOWN = "pi pi-cart-arrow-down";
static readonly CART_MINUS = "pi pi-cart-minus";
static readonly CART_PLUS = "pi pi-cart-plus";
static readonly CHART_BAR = "pi pi-chart-bar";
static readonly CHART_LINE = "pi pi-chart-line";
static readonly CHART_PIE = "pi pi-chart-pie";
static readonly CHART_SCATTER = "pi pi-chart-scatter";
static readonly CHECK = "pi pi-check";
static readonly CHECK_CIRCLE = "pi pi-check-circle";
static readonly CHECK_SQUARE = "pi pi-check-square";
static readonly CHEVRON_CIRCLE_DOWN = "pi pi-chevron-circle-down";
static readonly CHEVRON_CIRCLE_LEFT = "pi pi-chevron-circle-left";
static readonly CHEVRON_CIRCLE_RIGHT = "pi pi-chevron-circle-right";
static readonly CHEVRON_CIRCLE_UP = "pi pi-chevron-circle-up";
static readonly CHEVRON_DOWN = "pi pi-chevron-down";
static readonly CHEVRON_LEFT = "pi pi-chevron-left";
static readonly CHEVRON_RIGHT = "pi pi-chevron-right";
static readonly CHEVRON_UP = "pi pi-chevron-up";
static readonly CIRCLE = "pi pi-circle";
static readonly CIRCLE_FILL = "pi pi-circle-fill";
static readonly CLIPBOARD = "pi pi-clipboard";
static readonly CLOCK = "pi pi-clock";
static readonly CLONE = "pi pi-clone";
static readonly CLOUD = "pi pi-cloud";
static readonly CLOUD_DOWNLOAD = "pi pi-cloud-download";
static readonly CLOUD_UPLOAD = "pi pi-cloud-upload";
static readonly CODE = "pi pi-code";
static readonly COG = "pi pi-cog";
static readonly COMMENT = "pi pi-comment";
static readonly COMMENTS = "pi pi-comments";
static readonly COMPASS = "pi pi-compass";
static readonly COPY = "pi pi-copy";
static readonly CREDIT_CARD = "pi pi-credit-card";
static readonly CROWN = "pi pi-crown";
static readonly DATABASE = "pi pi-database";
static readonly DESKTOP = "pi pi-desktop";
static readonly DELETE_LEFT = "pi pi-delete-left";
static readonly DIRECTIONS = "pi pi-directions";
static readonly DIRECTIONS_ALT = "pi pi-directions-alt";
static readonly DISCORD = "pi pi-discord";
static readonly DOLLAR = "pi pi-dollar";
static readonly DOWNLOAD = "pi pi-download";
static readonly EJECT = "pi pi-eject";
static readonly ELLIPSIS_H = "pi pi-ellipsis-h";
static readonly ELLIPSIS_V = "pi pi-ellipsis-v";
static readonly ENVELOPE = "pi pi-envelope";
static readonly EQUALS = "pi pi-equals";
static readonly ERASER = "pi pi-eraser";
static readonly ETHEREUM = "pi pi-ethereum";
static readonly EURO = "pi pi-euro";
static readonly EXCLAMATION_CIRCLE = "pi pi-exclamation-circle";
static readonly EXCLAMATION_TRIANGLE = "pi pi-exclamation-triangle";
static readonly EXPAND = "pi pi-expand";
static readonly EXTERNAL_LINK = "pi pi-external-link";
static readonly EYE = "pi pi-eye";
static readonly EYE_SLASH = "pi pi-eye-slash";
static readonly FACE_SMILE = "pi pi-face-smile";
static readonly FACEBOOK = "pi pi-facebook";
static readonly FAST_BACKWARD = "pi pi-fast-backward";
static readonly FAST_FORWARD = "pi pi-fast-forward";
static readonly FILE = "pi pi-file";
static readonly FILE_ARROW_UP = "pi pi-file-arrow-up";
static readonly FILE_CHECK = "pi pi-file-check";
static readonly FILE_EDIT = "pi pi-file-edit";
static readonly FILE_IMPORT = "pi pi-file-import";
static readonly FILE_PDF = "pi pi-file-pdf";
static readonly FILE_PLUS = "pi pi-file-plus";
static readonly FILE_EXCEL = "pi pi-file-excel";
static readonly FILE_EXPORT = "pi pi-file-export";
static readonly FILE_WORD = "pi pi-file-word";
static readonly FILTER = "pi pi-filter";
static readonly FILTER_FILL = "pi pi-filter-fill";
static readonly FILTER_SLASH = "pi pi-filter-slash";
static readonly FLAG = "pi pi-flag";
static readonly FLAG_FILL = "pi pi-flag-fill";
static readonly FOLDER = "pi pi-folder";
static readonly FOLDER_OPEN = "pi pi-folder-open";
static readonly FOLDER_PLUS = "pi pi-folder-plus";
static readonly FORWARD = "pi pi-forward";
static readonly GAUGE = "pi pi-gauge";
static readonly GIFT = "pi pi-gift";
static readonly GITHUB = "pi pi-github";
static readonly GLOBE = "pi pi-globe";
static readonly GOOGLE = "pi pi-google";
static readonly GRADUATION_CAP = "pi pi-graduation-cap";
static readonly HAMMER = "pi pi-hammer";
static readonly HASHTAG = "pi pi-hashtag";
static readonly HEADPHONES = "pi pi-headphones";
static readonly HEART = "pi pi-heart";
static readonly HEART_FILL = "pi pi-heart-fill";
static readonly HISTORY = "pi pi-history";
static readonly HOME = "pi pi-home";
static readonly HOURGLASS = "pi pi-hourglass";
static readonly ID_CARD = "pi pi-id-card";
static readonly IMAGE = "pi pi-image";
static readonly IMAGES = "pi pi-images";
static readonly INBOX = "pi pi-inbox";
static readonly INDIAN_RUPEE = "pi pi-indian-rupee";
static readonly INFO = "pi pi-info";
static readonly INFO_CIRCLE = "pi pi-info-circle";
static readonly INSTAGRAM = "pi pi-instagram";
static readonly KEY = "pi pi-key";
static readonly LANGUAGE = "pi pi-language";
static readonly LIGHTBULB = "pi pi-lightbulb";
static readonly LINK = "pi pi-link";
static readonly LINKEDIN = "pi pi-linkedin";
static readonly LIST = "pi pi-list";
static readonly LIST_CHECK = "pi pi-list-check";
static readonly LOCK = "pi pi-lock";
static readonly LOCK_OPEN = "pi pi-lock-open";
static readonly MAP = "pi pi-map";
static readonly MAP_MARKER = "pi pi-map-marker";
static readonly MARS = "pi pi-mars";
static readonly MEGAPHONE = "pi pi-megaphone";
static readonly MICROCHIP = "pi pi-microchip";
static readonly MICROCHIP_AI = "pi pi-microchip-ai";
static readonly MICROPHONE = "pi pi-microphone";
static readonly MICROSOFT = "pi pi-microsoft";
static readonly MINUS = "pi pi-minus";
static readonly MINUS_CIRCLE = "pi pi-minus-circle";
static readonly MOBILE = "pi pi-mobile";
static readonly MONEY_BILL = "pi pi-money-bill";
static readonly MOON = "pi pi-moon";
static readonly OBJECTS_COLUMN = "pi pi-objects-column";
static readonly PALETTE = "pi pi-palette";
static readonly PAPERCLIP = "pi pi-paperclip";
static readonly PAUSE = "pi pi-pause";
static readonly PAUSE_CIRCLE = "pi pi-pause-circle";
static readonly PAYPAL = "pi pi-paypal";
static readonly PEN_TO_SQUARE = "pi pi-pen-to-square";
static readonly PENCIL = "pi pi-pencil";
static readonly PERCENTAGE = "pi pi-percentage";
static readonly PHONE = "pi pi-phone";
static readonly PINTEREST = "pi pi-pinterest";
static readonly PLAY = "pi pi-play";
static readonly PLAY_CIRCLE = "pi pi-play-circle";
static readonly PLUS = "pi pi-plus";
static readonly PLUS_CIRCLE = "pi pi-plus-circle";
static readonly POUND = "pi pi-pound";
static readonly POWER_OFF = "pi pi-power-off";
static readonly PRIME = "pi pi-prime";
static readonly PRINT = "pi pi-print";
static readonly QRCODE = "pi pi-qrcode";
static readonly QUESTION = "pi pi-question";
static readonly QUESTION_CIRCLE = "pi pi-question-circle";
static readonly RECEIPT = "pi pi-receipt";
static readonly REDDIT = "pi pi-reddit";
static readonly REFRESH = "pi pi-refresh";
static readonly REPLAY = "pi pi-replay";
static readonly REPLY = "pi pi-reply";
static readonly SAVE = "pi pi-save";
static readonly SEARCH = "pi pi-search";
static readonly SEARCH_MINUS = "pi pi-search-minus";
static readonly SEARCH_PLUS = "pi pi-search-plus";
static readonly SEND = "pi pi-send";
static readonly SERVER = "pi pi-server";
static readonly SHARE_ALT = "pi pi-share-alt";
static readonly SHIELD = "pi pi-shield";
static readonly SHOP = "pi pi-shop";
static readonly SHOPPING_BAG = "pi pi-shopping-bag";
static readonly SHOPPING_CART = "pi pi-shopping-cart";
static readonly SIGN_IN = "pi pi-sign-in";
static readonly SIGN_OUT = "pi pi-sign-out";
static readonly SITEMAP = "pi pi-sitemap";
static readonly SLACK = "pi pi-slack";
static readonly SLIDERS_H = "pi pi-sliders-h";
static readonly SLIDERS_V = "pi pi-sliders-v";
static readonly SORT = "pi pi-sort";
static readonly SORT_ALPHA_DOWN = "pi pi-sort-alpha-down";
static readonly SORT_ALPHA_DOWN_ALT = "pi pi-sort-alpha-down-alt";
static readonly SORT_ALPHA_UP = "pi pi-sort-alpha-up";
static readonly SORT_ALPHA_UP_ALT = "pi pi-sort-alpha-up-alt";
static readonly SORT_ALT = "pi pi-sort-alt";
static readonly SORT_ALT_SLASH = "pi pi-sort-alt-slash";
static readonly SORT_AMOUNT_DOWN = "pi pi-sort-amount-down";
static readonly SORT_AMOUNT_DOWN_ALT = "pi pi-sort-amount-down-alt";
static readonly SORT_AMOUNT_UP = "pi pi-sort-amount-up";
static readonly SORT_AMOUNT_UP_ALT = "pi pi-sort-amount-up-alt";
static readonly SORT_DOWN = "pi pi-sort-down";
static readonly SORT_DOWN_FILL = "pi pi-sort-down-fill";
static readonly SORT_NUMERIC_DOWN = "pi pi-sort-numeric-down";
static readonly SORT_NUMERIC_DOWN_ALT = "pi pi-sort-numeric-down-alt";
static readonly SORT_NUMERIC_UP = "pi pi-sort-numeric-up";
static readonly SORT_NUMERIC_UP_ALT = "pi pi-sort-numeric-up-alt";
static readonly SORT_UP = "pi pi-sort-up";
static readonly SORT_UP_FILL = "pi pi-sort-up-fill";
static readonly SPARKLES = "pi pi-sparkles";
static readonly SPINNER = "pi pi-spinner";
static readonly SPINNER_DOTTED = "pi pi-spinner-dotted";
static readonly STAR = "pi pi-star";
static readonly STAR_FILL = "pi pi-star-fill";
static readonly STAR_HALF = "pi pi-star-half";
static readonly STAR_HALF_FILL = "pi pi-star-half-fill";
static readonly STEP_BACKWARD = "pi pi-step-backward";
static readonly STEP_BACKWARD_ALT = "pi pi-step-backward-alt";
static readonly STEP_FORWARD = "pi pi-step-forward";
static readonly STEP_FORWARD_ALT = "pi pi-step-forward-alt";
static readonly STOP = "pi pi-stop";
static readonly STOP_CIRCLE = "pi pi-stop-circle";
static readonly STOPWATCH = "pi pi-stopwatch";
static readonly SUN = "pi pi-sun";
static readonly SYNC = "pi pi-sync";
static readonly TABLE = "pi pi-table";
static readonly TABLET = "pi pi-tablet";
static readonly TAG = "pi pi-tag";
static readonly TAGS = "pi pi-tags";
static readonly TELEGRAM = "pi pi-telegram";
static readonly TH_LARGE = "pi pi-th-large";
static readonly THUMBS_DOWN = "pi pi-thumbs-down";
static readonly THUMBS_DOWN_FILL = "pi pi-thumbs-down-fill";
static readonly THUMBS_UP = "pi pi-thumbs-up";
static readonly THUMBS_UP_FILL = "pi pi-thumbs-up-fill";
static readonly THUMBTACK = "pi pi-thumbtack";
static readonly TICKET = "pi pi-ticket";
static readonly TIKTOK = "pi pi-tiktok";
static readonly TIMES = "pi pi-times";
static readonly TIMES_CIRCLE = "pi pi-times-circle";
static readonly TRASH = "pi pi-trash";
static readonly TROPHY = "pi pi-trophy";
static readonly TRUCK = "pi pi-truck";
static readonly TURKISH_LIRA = "pi pi-turkish-lira";
static readonly TWITCH = "pi pi-twitch";
static readonly TWITTER = "pi pi-twitter";
static readonly UNDO = "pi pi-undo";
static readonly UNLOCK = "pi pi-unlock";
static readonly UPLOAD = "pi pi-upload";
static readonly USER = "pi pi-user";
static readonly USER_EDIT = "pi pi-user-edit";
static readonly USER_MINUS = "pi pi-user-minus";
static readonly USER_PLUS = "pi pi-user-plus";
static readonly USERS = "pi pi-users";
static readonly VENUS = "pi pi-venus";
static readonly VERIFIED = "pi pi-verified";
static readonly VIDEO = "pi pi-video";
static readonly VIMEO = "pi pi-vimeo";
static readonly VOLUME_DOWN = "pi pi-volume-down";
static readonly VOLUME_OFF = "pi pi-volume-off";
static readonly VOLUME_UP = "pi pi-volume-up";
static readonly WALLET = "pi pi-wallet";
static readonly WAREHOUSE = "pi pi-warehouse";
static readonly WAVE_PULSE = "pi pi-wave-pulse";
static readonly WHATSAPP = "pi pi-whatsapp";
static readonly WIFI = "pi pi-wifi";
static readonly WINDOW_MAXIMIZE = "pi pi-window-maximize";
static readonly WINDOW_MINIMIZE = "pi pi-window-minimize";
static readonly WRENCH = "pi pi-wrench";
static readonly YOUTUBE = "pi pi-youtube";
}

/\*\*

- Options for the scroller.
- @group Interface
  _/
  interface ScrollerOptions {
  /\*\*
  _ Unique identifier of the element.
  _/
  id?: string | undefined;
  /\*\*
  _ Inline style of the component.
  _/
  style?: {
  [klass: string]: any;
  } | null | undefined;
  /\*\*
  _ Style class of the element.
  _/
  styleClass?: string | undefined;
  /\*\*
  _ Inline style of the content.
  _/
  contentStyle?: {
  [klass: string]: any;
  } | null | undefined;
  /\*\*
  _ Style class of the content.
  _/
  contentStyleClass?: string | undefined;
  /\*\*
  _ Index of the element in tabbing order.
  _/
  tabindex?: number | undefined;
  /\*\*
  _ An array of objects to display.
  _/
  items?: any[];
  /\*\*
  _ The height/width of item according to orientation.
  _/
  itemSize?: any;
  /\*\*
  _ Height of the scroll viewport.
  _/
  scrollHeight?: string | undefined;
  /\*\*
  _ Width of the scroll viewport.
  _/
  scrollWidth?: string | undefined;
  /\*\*
  _ The orientation of scrollbar.
  _/
  orientation?: 'vertical' | 'horizontal' | 'both';
  /\*\*
  _ Used to specify how many items to load in each load method in lazy mode.
  _/
  step?: number | undefined;
  /\*\*
  _ Delay in scroll before new data is loaded.
  _/
  delay?: number | undefined;
  /\*\*
  _ Delay after window's resize finishes.
  _/
  resizeDelay?: number | undefined;
  /\*\*
  _ Used to append each loaded item to top without removing any items from the DOM. Using very large data may cause the browser to crash.
  _/
  appendOnly?: boolean;
  /\*\*
  _ Specifies whether the scroller should be displayed inline or not.
  _/
  inline?: boolean;
  /\*\*
  _ Defines if data is loaded and interacted with in lazy manner.
  _/
  lazy?: boolean;
  /\*\*
  _ If disabled, the scroller feature is eliminated and the content is displayed directly.
  _/
  disabled?: boolean;
  /\*\*
  _ Used to implement a custom loader instead of using the loader feature in the scroller.
  _/
  loaderDisabled?: boolean;
  /\*\*
  _ Columns to display.
  _/
  columns?: any[] | undefined;
  /\*\*
  _ Used to implement a custom spacer instead of using the spacer feature in the scroller.
  _/
  showSpacer?: boolean;
  /\*\*
  _ Defines whether to show loader.
  _/
  showLoader?: boolean;
  /\*\*
  _ Determines how many additional elements to add to the DOM outside of the view. According to the scrolls made up and down, extra items are added in a certain algorithm in the form of multiples of this number. Default value is half the number of items shown in the view.
  _/
  numToleratedItems?: any;
  /\*\*
  _ Defines whether the data is loaded.
  _/
  loading?: boolean;
  /\*\*
  _ Defines whether to dynamically change the height or width of scrollable container.
  _/
  autoSize?: boolean;
  /\*\*
  _ Function to optimize the dom operations by delegating to ngForTrackBy, default algoritm checks for object identity.
  _/
  trackBy?: Function;
  /\*\*
  _ Callback to invoke in lazy mode to load new data.
  _/
  onLazyLoad?: Function | undefined;
  /\*\*
  _ Callback to invoke when scroll position changes.
  _/
  onScroll?: Function | undefined;
  /\*\*
  _ Callback to invoke when scroll position and item's range in view changes.
  \*/
  onScrollIndexChange?: Function | undefined;
  }

/\*\*

- Represents an option item.
- @group Interface
  \*/
  interface SelectItem<T = any> {
  label?: string;
  value: T;
  styleClass?: string;
  icon?: string;
  title?: string;
  disabled?: boolean;
  }

/\*\*

- Represents a group of select items.
- @group Interface
  \*/
  interface SelectItemGroup<T = any> {
  label: string;
  value?: any;
  items: SelectItem<T>[];
  }

/\*\*

- @deprecated Use ng-template #header instead.
  _/
  declare class Header {
  static ɵfac: i0.ɵɵFactoryDeclaration<Header, never>;
  static ɵcmp: i0.ɵɵComponentDeclaration<Header, "p-header", never, {}, {}, never, ["_"], false, never>;
  }
  /\*\*
- @deprecated Use ng-template #footer instead.
  _/
  declare class Footer {
  static ɵfac: i0.ɵɵFactoryDeclaration<Footer, never>;
  static ɵcmp: i0.ɵɵComponentDeclaration<Footer, "p-footer", never, {}, {}, never, ["_"], false, never>;
  }
  /\*\*
- @deprecated Use ng-template #templateName instead.
  \*/
  declare class PrimeTemplate {
  template: TemplateRef<any>;
  type: string | undefined;
  name: string | undefined;
  constructor(template: TemplateRef<any>);
  getType(): string;
  static ɵfac: i0.ɵɵFactoryDeclaration<PrimeTemplate, never>;
  static ɵdir: i0.ɵɵDirectiveDeclaration<PrimeTemplate, "[pTemplate]", never, { "type": { "alias": "type"; "required": false; }; "name": { "alias": "pTemplate"; "required": false; }; }, {}, never, never, true, never>;
  }
  declare class SharedModule {
  static ɵfac: i0.ɵɵFactoryDeclaration<SharedModule, never>;
  static ɵmod: i0.ɵɵNgModuleDeclaration<SharedModule, [typeof Header, typeof Footer], [typeof i1.CommonModule, typeof PrimeTemplate], [typeof Header, typeof Footer, typeof PrimeTemplate]>;
  static ɵinj: i0.ɵɵInjectorDeclaration<SharedModule>;
  }

/\*\*

- Represents an event triggered when sorting is applied.
- @group Interface
  \*/
  interface SortEvent {
  data?: any[];
  mode?: string;
  field?: string;
  order?: number;
  multiSortMeta?: SortMeta[];
  }

/\*\*

- Represents the state of a table component.
- @group Interface
  _/
  interface TableState {
  /\*\*
  _ The index of the first row to be displayed.
  _/
  first?: number;
  /\*\*
  _ The number of rows to be displayed per page.
  _/
  rows?: number;
  /\*\*
  _ The field used for sorting.
  _/
  sortField?: string;
  /\*\*
  _ The sort order.
  _/
  sortOrder?: number;
  /\*\*
  _ An array of sort metadata when multiple sorting is applied.
  _/
  multiSortMeta?: SortMeta[];
  /\*\*
  _ The filters to be applied to the table.
  _/
  filters?: {
  [s: string]: FilterMetadata | FilterMetadata[];
  };
  /\*\*
  _ The column widths for the table.
  _/
  columnWidths?: string;
  /\*\*
  _ The width of the table.
  _/
  tableWidth?: string;
  /\*\*
  _ The width of the wrapper element containing the table.
  _/
  wrapperWidth?: string;
  /\*\*
  _ The selected item(s) in the table.
  _/
  selection?: any;
  /\*\*
  _ The order of the columns in the table.
  _/
  columnOrder?: string[];
  /\*\*
  _ The keys of the expanded rows in the table.
  \*/
  expandedRowKeys?: {
  [s: string]: boolean;
  };
  }

/\*\*

- Represents a set of translated strings used in a component or application.
- @group Interface
  \*/
  interface Translation {
  startsWith?: string;
  contains?: string;
  notContains?: string;
  endsWith?: string;
  equals?: string;
  completed?: string;
  notEquals?: string;
  noFilter?: string;
  lt?: string;
  lte?: string;
  gt?: string;
  gte?: string;
  is?: string;
  isNot?: string;
  before?: string;
  after?: string;
  dateIs?: string;
  dateIsNot?: string;
  dateBefore?: string;
  dateAfter?: string;
  clear?: string;
  apply?: string;
  matchAll?: string;
  matchAny?: string;
  addRule?: string;
  removeRule?: string;
  accept?: string;
  reject?: string;
  choose?: string;
  upload?: string;
  cancel?: string;
  fileSizeTypes?: string[];
  dayNames?: string[];
  dayNamesShort?: string[];
  dayNamesMin?: string[];
  monthNames?: string[];
  monthNamesShort?: string[];
  dateFormat?: string;
  firstDayOfWeek?: number;
  today?: string;
  weekHeader?: string;
  weak?: string;
  medium?: string;
  strong?: string;
  passwordPrompt?: string;
  emptyMessage?: string;
  emptyFilterMessage?: string;
  fileChosenMessage?: string;
  noFileChosenMessage?: string;
  pending?: string;
  chooseYear?: string;
  chooseMonth?: string;
  chooseDate?: string;
  prevDecade?: string;
  nextDecade?: string;
  prevYear?: string;
  nextYear?: string;
  prevMonth?: string;
  nextMonth?: string;
  prevHour?: string;
  nextHour?: string;
  prevMinute?: string;
  nextMinute?: string;
  prevSecond?: string;
  nextSecond?: string;
  am?: string;
  pm?: string;
  searchMessage?: string;
  selectionMessage?: string;
  emptySelectionMessage?: string;
  emptySearchMessage?: string;
  aria?: Aria;
  }
  /\*\*
- Represents a set of translated HTML attributes used in a component or application.
- @group Interface
  \*/
  interface Aria {
  trueLabel?: string;
  falseLabel?: string;
  nullLabel?: string;
  star?: string;
  stars?: string;
  selectAll?: string;
  unselectAll?: string;
  close?: string;
  previous?: string;
  next?: string;
  navigation?: string;
  scrollTop?: string;
  moveTop?: string;
  moveUp?: string;
  moveDown?: string;
  moveBottom?: string;
  moveToTarget?: string;
  moveToSource?: string;
  moveAllToTarget?: string;
  moveAllToSource?: string;
  pageLabel?: string;
  firstPageLabel?: string;
  lastPageLabel?: string;
  nextPageLabel?: string;
  prevPageLabel?: string;
  rowsPerPageLabel?: string;
  previousPageLabel?: string;
  jumpToPageDropdownLabel?: string;
  jumpToPageInputLabel?: string;
  selectRow?: string;
  unselectRow?: string;
  expandRow?: string;
  collapseRow?: string;
  expand?: string;
  collapse?: string;
  showFilterMenu?: string;
  hideFilterMenu?: string;
  filterOperator?: string;
  filterConstraint?: string;
  editRow?: string;
  saveEdit?: string;
  cancelEdit?: string;
  listView?: string;
  gridView?: string;
  slide?: string;
  slideNumber?: string;
  zoomImage?: string;
  zoomIn?: string;
  zoomOut?: string;
  rotateRight?: string;
  rotateLeft?: string;
  listLabel?: string;
  selectColor?: string;
  removeLabel?: string;
  browseFiles?: string;
  maximizeLabel?: string;
  minimizeLabel?: string;
  }

declare class TranslationKeys {
static readonly STARTS_WITH = "startsWith";
static readonly CONTAINS = "contains";
static readonly NOT_CONTAINS = "notContains";
static readonly ENDS_WITH = "endsWith";
static readonly EQUALS = "equals";
static readonly NOT_EQUALS = "notEquals";
static readonly NO_FILTER = "noFilter";
static readonly LT = "lt";
static readonly LTE = "lte";
static readonly GT = "gt";
static readonly GTE = "gte";
static readonly IS = "is";
static readonly IS_NOT = "isNot";
static readonly BEFORE = "before";
static readonly AFTER = "after";
static readonly CLEAR = "clear";
static readonly APPLY = "apply";
static readonly MATCH_ALL = "matchAll";
static readonly MATCH_ANY = "matchAny";
static readonly ADD_RULE = "addRule";
static readonly REMOVE_RULE = "removeRule";
static readonly ACCEPT = "accept";
static readonly REJECT = "reject";
static readonly CHOOSE = "choose";
static readonly UPLOAD = "upload";
static readonly CANCEL = "cancel";
static readonly PENDING = "pending";
static readonly FILE_SIZE_TYPES = "fileSizeTypes";
static readonly DAY_NAMES = "dayNames";
static readonly DAY_NAMES_SHORT = "dayNamesShort";
static readonly DAY_NAMES_MIN = "dayNamesMin";
static readonly MONTH_NAMES = "monthNames";
static readonly MONTH_NAMES_SHORT = "monthNamesShort";
static readonly FIRST_DAY_OF_WEEK = "firstDayOfWeek";
static readonly TODAY = "today";
static readonly WEEK_HEADER = "weekHeader";
static readonly WEAK = "weak";
static readonly MEDIUM = "medium";
static readonly STRONG = "strong";
static readonly PASSWORD_PROMPT = "passwordPrompt";
static readonly EMPTY_MESSAGE = "emptyMessage";
static readonly EMPTY_FILTER_MESSAGE = "emptyFilterMessage";
static readonly SHOW_FILTER_MENU = "showFilterMenu";
static readonly HIDE_FILTER_MENU = "hideFilterMenu";
static readonly SELECTION_MESSAGE = "selectionMessage";
static readonly ARIA = "aria";
static readonly SELECT_COLOR = "selectColor";
static readonly BROWSE_FILES = "browseFiles";
}

/\*\*

- Represents a node in a tree data structure.
- @group Interface
  _/
  interface TreeNode<T = any> {
  checked?: boolean;
  /\*\*
  _ Label of the node.
  _/
  label?: string;
  /\*\*
  _ Data represented by the node.
  _/
  data?: T;
  /\*\*
  _ Icon of the node to display next to content.
  _/
  icon?: string;
  /\*\*
  _ Icon to use in expanded state.
  _/
  expandedIcon?: string;
  /\*\*
  _ Icon to use in collapsed state.
  _/
  collapsedIcon?: string;
  /\*\*
  _ An array of treenodes as children.
  _/
  children?: TreeNode<T>[];
  /\*\*
  _ Specifies if the node has children. Used in lazy loading.
  _ @defaultValue false
  _/
  leaf?: boolean;
  /**
  _ Expanded state of the node.
  _ @defaultValue false
  \*/
  expanded?: boolean;
  /**
  _ Type of the node to match a template.
  _/
  type?: string;
  /**
  _ Parent of the node.
  _/
  parent?: TreeNode<T>;
  /**
  _ Defines if value is partially selected.
  _/
  partialSelected?: boolean;
  /**
  _ Inline style of the node.
  _/
  style?: any;
  /**
  _ Style class of the node.
  _/
  styleClass?: string;
  /**
  _ Defines if the node is draggable.
  _/
  draggable?: boolean;
  /**
  _ Defines if the node is droppable.
  _/
  droppable?: boolean;
  /**
  _ Whether the node is selectable when selection mode is enabled.
  _ @defaultValue false
  \*/
  selectable?: boolean;
  /**
  _ Mandatory unique key of the node.
  _/
  key?: string;
  /\*\*
  _ Whether the node is loading. Used in lazy loading.
  _/
  loading?: boolean;
  }

/\*\*

- Represents the event data for a tree node drag operation.
- @group Interface
  _/
  interface TreeNodeDragEvent {
  /\*\*
  _ Tree instance.
  _/
  tree?: any;
  /\*\*
  _ Node to be dragged.
  _/
  node?: TreeNode<any>;
  /\*\*
  _ Child nodes of dragged node.
  _/
  subNodes?: TreeNode<any>[];
  /\*\*
  _ Index of dragged node.
  _/
  index?: number;
  /\*\*
  _ Scope of dragged node.
  \*/
  scope?: any;
  }

declare class TreeDragDropService {
private dragStartSource;
private dragStopSource;
dragStart$: rxjs.Observable<TreeNodeDragEvent>;
    dragStop$: rxjs.Observable<TreeNodeDragEvent>;
startDrag(event: TreeNodeDragEvent): void;
stopDrag(event: TreeNodeDragEvent): void;
static ɵfac: i0.ɵɵFactoryDeclaration<TreeDragDropService, never>;
static ɵprov: i0.ɵɵInjectableDeclaration<TreeDragDropService>;
}

/\*\*

- Tree table node element.
- @extends {TreeNode}
- @group Interface
  _/
  interface TreeTableNode<T = any> extends TreeNode {
  /\*\*
  _ Browser event.
  _/
  originalEvent?: Event;
  /\*\*
  _ Row of the node.
  _/
  rowNode?: any;
  /\*\*
  _ Node instance.
  _/
  node?: TreeNode<T>;
  /\*\*
  _ Selection type.
  _/
  type?: string;
  /\*\*
  _ Node index.
  _/
  index?: number;
  /\*\*
  _ Node level.
  _/
  level?: number;
  /\*\*
  _ Boolean value indicates if node is in viewport.
  \*/
  visible?: boolean;
  }

export { ConfirmEventType, ConfirmationService, ContextMenuService, FilterMatchMode, FilterOperator, FilterService, Footer, Header, MessageService, OverlayService, PrimeIcons, PrimeTemplate, SharedModule, TranslationKeys, TreeDragDropService };
export type { Aria, BlockableUI, CommonPassThrough, Confirmation, FilterMatchModeType, FilterMetadata, LazyLoadEvent, LazyLoadMeta, Lifecycle, LifecycleHooks, MegaMenuItem, MenuItem, MenuItemCommandEvent, OverlayListenerOptions, OverlayModeType, OverlayOnBeforeHideEvent, OverlayOnBeforeShowEvent, OverlayOnHideEvent, OverlayOnShowEvent, OverlayOptions, PassThrough, PassThroughContext, PassThroughOption, PassThroughOptions, ResponsiveOverlayDirectionType, ResponsiveOverlayOptions, ScrollerOptions, SelectItem, SelectItemGroup, SortEvent, SortMeta, TableState, ToastMessageOptions, TooltipOptions, Translation, TreeNode, TreeNodeDragEvent, TreeTableNode };
```
