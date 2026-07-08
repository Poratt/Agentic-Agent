```html
<div _ngcontent-ng-c2197171489="">
  <style>
    .forecast-container {
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      max-width: 800px;
      margin: 1rem auto;
      padding: 1.5rem;
      background: #f8f9fa;
      border-radius: 24px;
      direction: rtl;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
    }
    .forecast-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 1.5rem;
      color: #2d3436;
    }
    .forecast-header h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
    }
    .forecast-grid {
      display: flex;
      gap: 12px;
      overflow-x: auto;
      padding-bottom: 10px;
      scrollbar-width: thin;
    }
    .forecast-card {
      flex: 1;
      min-width: 120px;
      background: white;
      border: 2px solid transparent;
      border-radius: 20px;
      padding: 1.25rem 1rem;
      text-align: center;
      transition: all 0.3s ease;
      cursor: default;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.02);
    }
    .forecast-card:hover {
      border-color: #3498db;
      transform: translateY(-5px);
      box-shadow: 0 8px 15px rgba(52, 152, 219, 0.15);
    }
    .day-name {
      font-weight: 600;
      color: #636e72;
      font-size: 0.95rem;
      margin-bottom: 0.5rem;
    }
    .weather-emoji {
      font-size: 2.5rem;
      margin: 0.75rem 0;
      display: block;
    }
    .temp-range {
      font-size: 1.1rem;
      font-weight: 700;
      color: #2d3436;
      margin-bottom: 0.5rem;
    }
    .temp-max {
      color: #e67e22;
    }
    .temp-min {
      color: #3498db;
    }
    .humidity-tag {
      font-size: 0.8rem;
      color: #b2bec3;
      background: #f1f2f6;
      padding: 4px 8px;
      border-radius: 10px;
      display: inline-block;
    }
    .weather-desc {
      font-size: 0.85rem;
      color: #636e72;
      margin-bottom: 0.5rem;
      display: block;
    }
  </style>
  <div class="forecast-container">
    <div class="forecast-header">
      <span>📅</span>
      <h2>תחזית ל-5 ימים עבור נהריה</h2>
    </div>

    <div class="forecast-grid">
      <div class="forecast-card">
        <div class="day-name">רביעי</div>
        <span class="weather-emoji">🌤️</span>
        <span class="weather-desc">מעונן חלקית</span>
        <div class="temp-range">
          <span class="temp-max">27°</span>
          /
          <span class="temp-min">19°</span>
        </div>
        <div class="humidity-tag">לחות: 60%</div>
      </div>

      <div class="forecast-card">
        <div class="day-name">חמישי</div>
        <span class="weather-emoji">🌧️</span>
        <span class="weather-desc">גשם מקומי</span>
        <div class="temp-range">
          <span class="temp-max">32°</span>
          /
          <span class="temp-min">26°</span>
        </div>
        <div class="humidity-tag">לחות: 74%</div>
      </div>

      <div class="forecast-card">
        <div class="day-name">שישי</div>
        <span class="weather-emoji">⛈️</span>
        <span class="weather-desc">גשום וסוער</span>
        <div class="temp-range">
          <span class="temp-max">32°</span>
          /
          <span class="temp-min">25°</span>
        </div>
        <div class="humidity-tag">לחות: 49%</div>
      </div>

      <div class="forecast-card">
        <div class="day-name">שבת</div>
        <span class="weather-emoji">☀️</span>
        <span class="weather-desc">בהיר</span>
        <div class="temp-range">
          <span class="temp-max">28°</span>
          /
          <span class="temp-min">22°</span>
        </div>
        <div class="humidity-tag">לחות: 56%</div>
      </div>

      <div class="forecast-card">
        <div class="day-name">ראשון</div>
        <span class="weather-emoji">🌤️</span>
        <span class="weather-desc">מעונן חלקית</span>
        <div class="temp-range">
          <span class="temp-max">26°</span>
          /
          <span class="temp-min">19°</span>
        </div>
        <div class="humidity-tag">לחות: 75%</div>
      </div>
    </div>
  </div>
</div>
```
