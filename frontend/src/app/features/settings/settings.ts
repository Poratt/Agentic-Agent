import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { LlmProvidersManagement } from "../llm-providers-management/llm-providers-management";
import { StrainHunterSettings } from "./strain-hunter-settings/strain-hunter-settings";
import { DatabaseMonitorSettings } from "./database-monitor-settings/database-monitor-settings";
import { DesignSystem } from "../design-system/design-system";

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [CommonModule, Tabs, TabList, Tab, TabPanels, TabPanel, LlmProvidersManagement, StrainHunterSettings, DatabaseMonitorSettings, DesignSystem],
    templateUrl: './settings.html',
    changeDetection: ChangeDetectionStrategy.Eager,
})
export class Settings { }


