# Hospital Resource Intelligence Platform

A predictive hospital operations dashboard that simulates patient admission data, forecasts patient inflow trends, predicts bed occupancy, recommends staffing adjustments, and displays operational alerts — all in real time.

---

## Project Structure

```
hospital-resource-intelligence/
├── backend/
│   ├── package.json          # Express + cors dependencies
│   └── server.js             # Single-file API with all routes & simulation logic
├── frontend/
│   ├── package.json          # React + Vite + Recharts dependencies
│   ├── vite.config.js        # Dev server with API proxy
│   ├── index.html            # HTML entry point
│   └── src/
│       ├── main.jsx          # React DOM mount
│       └── App.jsx           # Full dashboard UI (panels, charts, styles)
└── README.md
```

## Features

| Feature | Description |
|---|---|
| **Dashboard** | Real-time KPI cards (ER wait, bed occupancy, alerts, hourly admissions) |
| **Admission Forecast** | Moving-average time-series forecast with confidence bands per department |
| **Custom Forecast** | Interactive POST /forecast panel with configurable horizon & department filter |
| **Bed Occupancy** | Current utilisation per department + 24-hour prediction chart |
| **Staffing Recommendations** | Per-shift, per-role gap analysis with urgency levels |
| **Operational Alerts** | Severity-ranked alerts for surges, ER waits, and bed capacity |
| **Auto-Refresh** | Dashboard reloads data every 30 seconds |
| **Error Handling** | Loading spinners, error boundaries, retry buttons |

## AI / Simulation Layer

| Component | Method |
|---|---|
| Patient admissions | Gaussian random + seasonal & time-of-day multipliers |
| Admission forecast | Moving-average with linear trend, weekend adjustment, confidence intervals |
| Bed occupancy prediction | Hourly occupancy delta model with time-of-day admission/discharge patterns |
| Staffing optimisation | Patient-to-staff ratio analysis per role and department |
| Alert engine | Threshold-based detection for capacity, wait times, patient surges |

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | API overview with all endpoint paths |
| GET | `/health` | Liveness check with uptime |
| GET | `/forecast?days=7` | 7-day admission forecast (all departments) |
| POST | `/forecast` | Custom forecast — body: `{ horizon, departments }` |
| GET | `/admissions` | Current hourly admission snapshot |
| GET | `/beds` | Current bed occupancy per department |
| GET | `/beds/predictions?hours=24` | 24-hour bed occupancy forecast |
| GET | `/staffing` | Staffing recommendations with gap analysis |
| GET | `/alerts` | Active operational alerts |

## Prerequisites

- **Node.js** 18 or newer (tested with 20+)
- **npm** 9+

## Running Locally

Open **two terminal windows** from the project root.

### Terminal 1 — Start the backend (port 4000)

```bash
cd backend
npm install
npm run dev
```

### Terminal 2 — Start the frontend (port 5173)

```bash
cd frontend
npm install
npm run dev
```

### Open the dashboard

Navigate to **http://localhost:5173** in your browser.

> The Vite dev server proxies all `/api/*` requests to the Express backend on port 4000, so everything works from a single browser tab.

## Technology Stack

- **Frontend:** React 19, Vite 6, Recharts 2
- **Backend:** Node.js, Express 4
- **Data:** Simulated in-memory (no database required)
