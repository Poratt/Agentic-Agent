import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { WeatherCurrentCardComponent } from '../blocks/weather-current-card/weather-current-card.component';
import { CurrencyCardComponent } from '../blocks/currency-card/currency-card.component';
import { DeleteConfirmCardComponent } from '../blocks/delete-confirm-card/delete-confirm-card.component';
import { SessionCreatedCardComponent } from '../blocks/session-created-card/session-created-card.component';
import { RoleChangeCardComponent } from '../blocks/role-change-card/role-change-card.component';
import { UsersTableComponent } from '../blocks/users-table/users-table.component';
import { AnalyticsChartComponent } from '../blocks/analytics-chart/analytics-chart.component';
import { ChatSessionsListComponent } from '../blocks/chat-sessions-list/chat-sessions-list.component';
import { UserProfileCardComponent } from '../blocks/user-profile-card/user-profile-card.component';
import { LlmTestResultsComponent } from '../blocks/llm-test-results/llm-test-results.component';
import { WeatherForecastComponent } from '../blocks/weather-forecast/weather-forecast.component';
import { TranscriptTimelineComponent } from '../blocks/transcript-timeline/transcript-timeline.component';
import { SystemStatusDashboardComponent } from '../blocks/system-status-dashboard/system-status-dashboard.component';
import { DatabaseStorageMonitorComponent } from '../blocks/database-storage-monitor/database-storage-monitor.component';
import { RegisterFormComponent } from '../blocks/register-form/register-form.component';
import { AgnesImageCardComponent } from '../blocks/agnes-image-card/agnes-image-card.component';
import { AgnesVideoCardComponent } from '../blocks/agnes-video-card/agnes-video-card.component';
import { WeatherSummaryCardComponent } from '../blocks/weather-summary-card/weather-summary-card.component';

@Component({
    selector: 'app-render-host',
    standalone: true,
    imports: [WeatherCurrentCardComponent, CurrencyCardComponent, DeleteConfirmCardComponent, SessionCreatedCardComponent, RoleChangeCardComponent, UsersTableComponent, AnalyticsChartComponent, ChatSessionsListComponent, UserProfileCardComponent, LlmTestResultsComponent, WeatherForecastComponent, TranscriptTimelineComponent, SystemStatusDashboardComponent, DatabaseStorageMonitorComponent, RegisterFormComponent, AgnesImageCardComponent, AgnesVideoCardComponent, WeatherSummaryCardComponent],
    template: `
        <div class="render-host-root">
            @switch (componentType()) {
                @case ('weather-current') {
                    <app-weather-current-card [data]="renderData()" />
                }
                @case ('currency') {
                    <app-currency-card [data]="renderData()" />
                }
                @case ('delete-confirm') {
                    <app-delete-confirm-card [data]="renderData()" />
                }
                @case ('session-created') {
                    <app-session-created-card [data]="renderData()" />
                }
                @case ('role-change') {
                    <app-role-change-card [data]="renderData()" />
                }
                @case ('users-table') {
                    <app-users-table [data]="renderData()" />
                }
                @case ('analytics-chart') {
                    <app-analytics-chart [data]="renderData()" />
                }
                @case ('chat-sessions-list') {
                    <app-chat-sessions-list [data]="renderData()" />
                }
                @case ('user-profile') {
                    <app-user-profile-card [data]="renderData()" />
                }
                @case ('llm-test-results') {
                    <app-llm-test-results [data]="renderData()" />
                }
                @case ('weather-forecast') {
                    <app-weather-forecast [data]="renderData()" />
                }
                @case ('transcript-timeline') {
                    <app-transcript-timeline [data]="renderData()" />
                }
                @case ('system-status') {
                    <app-system-status-dashboard [data]="renderData()" />
                }
                @case ('database-storage-monitor') {
                    <app-database-storage-monitor [data]="renderData()" />
                }
                @case ('register-form') {
                    <app-register-form [data]="renderData()" />
                }
                @case ('agnes-image') {
                    <app-agnes-image-card [data]="renderData()" />
                }
                @case ('agnes-video') {
                    <app-agnes-video-card [data]="renderData()" />
                }
                @case ('weather-summary') {
                    <app-weather-summary-card [data]="renderData()" />
                }
                @default {
                    <div class="render-placeholder">Component not available</div>
                }
            }
        </div>
    `,
    styleUrl: './render-host.component.css',
    changeDetection: ChangeDetectionStrategy.Eager,
})
export class RenderHostComponent {
    componentType = input.required<string>();
    renderData = input.required<Record<string, unknown>>();
}
