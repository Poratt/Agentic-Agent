import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

const WEATHER_EMOJI_MAP: Record<string, string> = {
    'clear sky': '☀️',
    'clear': '☀️',
    'mainly clear': '🌤️',
    'partly cloudy': '⛅',
    'cloudy': '☁️',
    'overcast': '☁️',
    'light rain': '🌦️',
    'moderate rain': '🌧️',
    'heavy rain': '🌧️',
    'rain': '🌧️',
    'light snow': '🌨️',
    'moderate snow': '🌨️',
    'heavy snow': '❄️',
    'snow': '❄️',
    'thunderstorm': '⛈️',
    'drizzle': '🌦️',
    'fog': '🌫️',
    'foggy': '🌫️',
    'mist': '🌫️',
    'haze': '🌫️',
    'hazy': '🌫️',
    'windy': '💨',
    'hot': '🔥',
    'cold': '🥶',
    'humid': '💧',
    'dry': '🏜️',
    'mistral': '💨',
    'thunder': '⛈️',
    'storm': '⛈️',
    'blizzard': '❄️',
    'sleet': '🌨️',
    'hail': '🌨️',
    'tornado': '🌪️',
    'frost': '🥶',
    'freezing': '🥶',
};

export interface WeatherSummaryRenderData {
    location?: string;
    current?: {
        weatherDesc?: string;
        weatherEmoji?: string;
        tempC?: number;
        feelsLikeC?: number;
        humidity?: number;
        windSpeedKmph?: number;
        windDirection?: string;
        cloudCover?: number;
        pressure?: number;
        observationTime?: string;
    };
    forecast?: Array<{
        date?: string;
        dayName?: string;
        maxTempC?: number;
        minTempC?: number;
        humidity?: number;
        weatherDesc?: string;
        weatherEmoji?: string;
    }>;
    alerts?: Array<{
        event?: string;
        severity?: string;
        headline?: string;
    }>;
}

@Component({
    selector: 'app-weather-summary-card',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './weather-summary-card.component.html',
    styleUrl: './weather-summary-card.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeatherSummaryCardComponent {
    data = input<WeatherSummaryRenderData>({});

    cleanLocation = computed(() => {
        const loc = this.data().location;
        if (!loc) return '';
        return loc.replace(/\s*\([\d.\s,]+\)\s*$/, '').trim();
    });

    hasCurrent = computed(() => {
        const c = this.data().current;
        return c && (c.tempC !== undefined || c.weatherDesc);
    });

    hasForecast = computed(() => {
        const f = this.data().forecast;
        return f && f.length > 0;
    });

    hasAlerts = computed(() => {
        const a = this.data().alerts;
        return a && a.length > 0;
    });

    heroEmoji = computed(() => {
        const explicit = this.data().current?.weatherEmoji;
        if (explicit) return explicit;
        const desc = this.data().current?.weatherDesc;
        if (!desc) return '🌤️';
        return WEATHER_EMOJI_MAP[desc.toLowerCase()] ?? '🌤️';
    });

    forecastEmojis = computed(() => {
        return (this.data().forecast ?? []).map((day) => {
            if (day.weatherEmoji) return day.weatherEmoji;
            if (!day.weatherDesc) return '🌤️';
            return WEATHER_EMOJI_MAP[day.weatherDesc.toLowerCase()] ?? '🌤️';
        });
    });

    hasAnyDetail(): boolean {
        const c = this.data().current;
        if (!c) return false;
        return (
            c.humidity !== undefined && c.humidity !== null ||
            c.windSpeedKmph !== undefined && c.windSpeedKmph !== null ||
            c.cloudCover !== undefined && c.cloudCover !== null ||
            c.pressure !== undefined && c.pressure !== null
        );
    }

    severityClass(severity?: string): string {
        if (!severity) return 'severity-unknown';
        const s = severity.toLowerCase();
        if (s.includes('extreme') || s.includes('severe')) return 'severity-extreme';
        if (s.includes('moderate')) return 'severity-moderate';
        if (s.includes('minor') || s.includes('low')) return 'severity-minor';
        return 'severity-unknown';
    }
}
