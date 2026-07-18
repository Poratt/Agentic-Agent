import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface WeatherCurrentRenderData {
    location?: string;
    tempC?: number;
    feelsLikeC?: number;
    tempF?: number;
    feelsLikeF?: number;
    humidity?: number;
    windSpeedKmph?: number;
    windDirection?: string;
    uvIndex?: number;
    cloudCover?: number;
    precipitationMm?: number;
    pressure?: number;
    visibility?: number;
    weatherDesc?: string;
    weatherEmoji?: string;
    observationTime?: string;
    requestLocalTime?: string;
}

@Component({
    selector: 'app-weather-current-card',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './weather-current-card.component.html',
    styleUrl: './weather-current-card.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeatherCurrentCardComponent {
    data = input<WeatherCurrentRenderData>({});

    cleanLocation = computed(() => {
        const loc = this.data().location;
        if (!loc) return '';
        return loc.replace(/\s*\([\d.\s,]+\)\s*$/, '').trim();
    });

    hasAnyDetail(): boolean {
        const d = this.data();
        return (
            d.humidity !== undefined && d.humidity !== null ||
            d.windSpeedKmph !== undefined && d.windSpeedKmph !== null ||
            d.uvIndex !== undefined && d.uvIndex !== null ||
            d.cloudCover !== undefined && d.cloudCover !== null ||
            d.precipitationMm !== undefined && d.precipitationMm !== null ||
            d.pressure !== undefined && d.pressure !== null ||
            d.visibility !== undefined && d.visibility !== null
        );
    }
}
