import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface WeatherForecastRenderData {
    location?: string;
    forecast?: {
        date?: string;
        dayName?: string;
        maxTempC?: number;
        minTempC?: number;
        humidity?: number;
        weatherDesc?: string;
        weatherEmoji?: string;
    }[];
}

@Component({
    selector: 'app-weather-forecast',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './weather-forecast.component.html',
    styleUrl: './weather-forecast.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeatherForecastComponent {
    data = input<WeatherForecastRenderData>({});
}
