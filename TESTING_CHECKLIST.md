# Hospital Resource Intelligence Platform — Testing Checklist

> **Generated:** 2026-02-15
> **Scope:** Backend API, Forecasting Logic, Staffing Optimization, Surge Alerts, Frontend UI, Error Handling, Edge Cases

---

## Table of Contents

1. [Backend API Routes](#1-backend-api-routes)
2. [Forecasting Logic](#2-forecasting-logic)
3. [Staffing Optimization](#3-staffing-optimization)
4. [Surge Alerts](#4-surge-alerts)
5. [Bed Occupancy](#5-bed-occupancy)
6. [Frontend UI](#6-frontend-ui)
7. [Error Handling](#7-error-handling)
8. [Edge Cases & Boundary Conditions](#8-edge-cases--boundary-conditions)
9. [Integration & End-to-End](#9-integration--end-to-end)
10. [Performance & Reliability](#10-performance--reliability)

---

## 1. Backend API Routes

### 1.1 `GET /` — API Overview

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 1.1.1 | Send GET request to `/` | Returns 200 with `{ name, version, endpoints }` | ☐ |
| 1.1.2 | Verify all listed endpoints match actual routes | Every endpoint in the response array is reachable | ☐ |
| 1.1.3 | Confirm response Content-Type is `application/json` | Header is `application/json` | ☐ |

### 1.2 `GET /health` — Health Check

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 1.2.1 | Send GET request to `/health` | Returns 200 with `{ status: "ok", uptime, timestamp }` | ☐ |
| 1.2.2 | Verify `uptime` is a positive number | `uptime > 0` | ☐ |
| 1.2.3 | Verify `timestamp` is a valid ISO 8601 string | Parses without error | ☐ |
| 1.2.4 | Call twice with a delay, verify uptime increases | Second uptime > first uptime | ☐ |

### 1.3 `GET /forecast` — Default Admission Forecast

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 1.3.1 | Send GET `/forecast` without query params | Returns 200 with `{ success: true, data: [...] }` for all 6 departments | ☐ |
| 1.3.2 | Verify default forecast horizon is 7 days | Each department's `forecast` array has 7 entries | ☐ |
| 1.3.3 | Send `GET /forecast?days=3` | Each department's `forecast` array has 3 entries | ☐ |
| 1.3.4 | Send `GET /forecast?days=14` | Each department's `forecast` array has 14 entries | ☐ |
| 1.3.5 | Verify `historical` array has 14 entries per department | Array length = 14 | ☐ |
| 1.3.6 | Verify each forecast entry has `date`, `predicted`, `lower`, `upper`, `confidence` | All fields present and numeric | ☐ |
| 1.3.7 | Verify `lower <= predicted <= upper` for every forecast entry | Bounds hold for all entries | ☐ |
| 1.3.8 | Verify `confidence` is between 0 and 1 | `0 < confidence <= 1` | ☐ |
| 1.3.9 | Verify `trend` is one of `"increasing"`, `"decreasing"`, `"stable"` | Valid enum value | ☐ |
| 1.3.10 | Verify `recentAvg` and `forecastAvg` are positive numbers | Both > 0 | ☐ |

### 1.4 `POST /forecast` — Custom Forecast

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 1.4.1 | POST with `{ horizon: 10 }` (no department filter) | Returns forecast for all 6 departments, 10 days each | ☐ |
| 1.4.2 | POST with `{ horizon: 5, departments: ["er", "icu"] }` | Returns forecast for only ER and ICU, 5 days each | ☐ |
| 1.4.3 | POST with `{ departments: ["er"] }` (no horizon) | Uses default horizon of 7 days | ☐ |
| 1.4.4 | POST with empty body `{}` | Returns all departments, 7-day horizon (defaults) | ☐ |
| 1.4.5 | POST with `{ departments: ["invalid_dept"] }` | Returns empty data array or ignores invalid department | ☐ |
| 1.4.6 | POST with `{ horizon: 0 }` | Forecast array is empty or handled gracefully | ☐ |
| 1.4.7 | POST with `{ horizon: -5 }` | No crash; returns empty forecast or error | ☐ |
| 1.4.8 | POST with `{ horizon: 1000 }` | Handles large horizons without timeout or crash | ☐ |
| 1.4.9 | POST with non-JSON Content-Type | Returns appropriate error or default response | ☐ |

### 1.5 `GET /admissions` — Current Admissions

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 1.5.1 | Send GET `/admissions` | Returns 200 with data for all 6 departments | ☐ |
| 1.5.2 | Verify each entry has `departmentId`, `department`, `hourlyAdmissions`, `waitingPatients`, `avgWaitMinutes`, `timestamp` | All fields present | ☐ |
| 1.5.3 | Verify `hourlyAdmissions >= 0` | Non-negative | ☐ |
| 1.5.4 | Verify `waitingPatients >= 0` | Non-negative | ☐ |
| 1.5.5 | Verify `avgWaitMinutes >= 0` | Non-negative | ☐ |
| 1.5.6 | Verify ER wait times are in range 15–120 min | Within bounds | ☐ |
| 1.5.7 | Verify non-ER wait times are in range 5–45 min | Within bounds | ☐ |

### 1.6 `GET /beds` — Bed Occupancy

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 1.6.1 | Send GET `/beds` | Returns 200 with data for all 6 departments | ☐ |
| 1.6.2 | Verify `occupied + available == totalBeds` for each department | Math is consistent | ☐ |
| 1.6.3 | Verify `occupancyPct == round(occupied / totalBeds * 100)` | Percentage is accurate | ☐ |
| 1.6.4 | Verify `totalBeds` matches hardcoded department config (ER=40, ICU=20, GEN=80, PED=25, MAT=15, SUR=30) | Matches config | ☐ |
| 1.6.5 | Verify `occupied >= 0` and `occupied <= totalBeds` | Within valid range | ☐ |
| 1.6.6 | Verify `pendingDischarges >= 0` and `pendingAdmissions >= 0` | Non-negative | ☐ |

### 1.7 `GET /beds/predictions` — Bed Occupancy Forecast

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 1.7.1 | Send GET `/beds/predictions` without params | Returns 24-hour predictions (default) | ☐ |
| 1.7.2 | Send `GET /beds/predictions?hours=12` | Returns 12-hour predictions | ☐ |
| 1.7.3 | Verify each department has `predictions` array of correct length | Length matches requested hours | ☐ |
| 1.7.4 | Verify `peakOccupancyPct` equals max of predictions array | Matches `Math.max()` of all `occupancyPct` values | ☐ |
| 1.7.5 | Verify `risk` is `"critical"` when peak > 90%, `"warning"` when > 80%, else `"normal"` | Correct risk level | ☐ |
| 1.7.6 | Verify all `occupancyPct` values are between 10% and 99% | Clamped to bounds | ☐ |
| 1.7.7 | Verify `occupied + available == totalBeds` for each prediction entry | Math is consistent | ☐ |

### 1.8 `GET /staffing` — Staffing Recommendations

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 1.8.1 | Send GET `/staffing` | Returns 200 with data for all 6 departments | ☐ |
| 1.8.2 | Verify each department has 3 shifts (morning, afternoon, night) | 3 shifts per department | ☐ |
| 1.8.3 | Verify each shift has roles: `doctor`, `nurse`, `technician`, `support` | All 4 roles present per shift | ☐ |
| 1.8.4 | Verify `gap == optimal - present` for each role | Math is correct | ☐ |
| 1.8.5 | Verify `optimal >= 1` for all roles | Minimum 1 staff recommended | ☐ |
| 1.8.6 | Verify `present >= 0` for all roles | Non-negative | ☐ |
| 1.8.7 | Verify `urgency` is `"critical"` when totalGap >= 4, `"attention"` when >= 2, else `"adequate"` | Correct urgency mapping | ☐ |
| 1.8.8 | Verify `recommendation` string is non-empty for understaffed shifts | Has actionable text | ☐ |
| 1.8.9 | Verify `overallUrgency` reflects worst urgency across shifts | Correct rollup | ☐ |

### 1.9 `GET /alerts` — Surge Alerts

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 1.9.1 | Send GET `/alerts` | Returns 200 with `{ success, alerts, summary, generatedAt }` | ☐ |
| 1.9.2 | Verify `summary.total == summary.critical + summary.warning` | Math is consistent | ☐ |
| 1.9.3 | Verify alerts are sorted by severity (critical first) | Critical alerts appear before warning alerts | ☐ |
| 1.9.4 | Verify each alert has `id`, `type`, `severity`, `department`, `title`, `message`, `action`, `timestamp` | All fields present | ☐ |
| 1.9.5 | Verify `type` is one of `"bed_occupancy"`, `"er_wait"`, `"patient_surge"` | Valid type | ☐ |
| 1.9.6 | Verify `severity` is one of `"critical"`, `"warning"` | Valid severity | ☐ |
| 1.9.7 | Verify `generatedAt` is a valid ISO timestamp | Parses correctly | ☐ |

---

## 2. Forecasting Logic

### 2.1 Moving Average Algorithm (`movingAvgForecast`)

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 2.1.1 | Verify 7-day moving average is calculated correctly from historical data | Average matches manual calculation | ☐ |
| 2.1.2 | Verify standard deviation calculation is correct | Matches manual calculation | ☐ |
| 2.1.3 | Verify linear slope calculation uses correct window | Slope reflects recent trend | ☐ |
| 2.1.4 | Verify weekend factor is 0.88 for Saturday and Sunday | Weekend predictions are lower | ☐ |
| 2.1.5 | Verify weekday factor is 1.0 | No modification on weekdays | ☐ |
| 2.1.6 | Verify confidence interval = ±1.5 × standard deviation | Bounds are correct | ☐ |
| 2.1.7 | Verify confidence decreases over horizon (0.85 − i × 0.03) | Day 1 = 0.85, Day 7 = 0.67 | ☐ |
| 2.1.8 | Verify `predicted` values are non-negative | `Math.max(0, ...)` applied | ☐ |
| 2.1.9 | Verify `lower` bound is non-negative | `Math.max(0, ...)` applied | ☐ |

### 2.2 Trend Detection

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 2.2.1 | When forecastAvg > recentAvg × 1.10, trend = `"increasing"` | Correct classification | ☐ |
| 2.2.2 | When forecastAvg < recentAvg × 0.90, trend = `"decreasing"` | Correct classification | ☐ |
| 2.2.3 | When forecastAvg is within ±10% of recentAvg, trend = `"stable"` | Correct classification | ☐ |
| 2.2.4 | Verify trend at the 10% boundary (exact threshold) | Boundary is handled consistently | ☐ |

### 2.3 Historical Data Generation

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 2.3.1 | Verify 14 historical data points are generated | Array length = 14 | ☐ |
| 2.3.2 | Verify historical dates are consecutive days going backward | Dates are sequential | ☐ |
| 2.3.3 | Verify seasonal factors are applied per month (0.85–1.25 range) | Seasonal variation visible | ☐ |
| 2.3.4 | Verify weekend factor is applied to historical data | Saturday/Sunday values are lower | ☐ |
| 2.3.5 | Verify all historical `admissions` values are non-negative | No negative values | ☐ |

---

## 3. Staffing Optimization

### 3.1 Patient-to-Staff Ratios

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 3.1.1 | ER staffing uses 8:1 doctor, 4:1 nurse ratio | Optimal counts match these ratios | ☐ |
| 3.1.2 | ICU staffing uses 4:1 doctor, 2:1 nurse ratio | Optimal counts are higher per patient | ☐ |
| 3.1.3 | General Ward uses 12:1 doctor, 6:1 nurse ratio | Optimal counts match | ☐ |
| 3.1.4 | Pediatrics uses 8:1 doctor, 4:1 nurse ratio | Optimal counts match | ☐ |
| 3.1.5 | Maternity uses 6:1 doctor, 4:1 nurse ratio | Optimal counts match | ☐ |
| 3.1.6 | Surgery uses 5:1 doctor, 3:1 nurse ratio | Optimal counts match | ☐ |
| 3.1.7 | Technician uses 15:1 ratio across all departments | Optimal counts match | ☐ |
| 3.1.8 | Support uses 20:1 ratio across all departments | Optimal counts match | ☐ |
| 3.1.9 | Verify `optimal = Math.ceil(patients / ratio)` (always rounds up) | Never rounds down | ☐ |

### 3.2 Gap Analysis

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 3.2.1 | When present < optimal, gap is positive (understaffed) | `gap = optimal - present > 0` | ☐ |
| 3.2.2 | When present > optimal, gap is negative (overstaffed) | `gap = optimal - present < 0` | ☐ |
| 3.2.3 | When present == optimal, gap is 0 | `gap = 0` | ☐ |
| 3.2.4 | `totalGap` is sum of all positive gaps across roles in a shift | Math is correct | ☐ |
| 3.2.5 | Status is `"understaffed"` when gap > 0, `"overstaffed"` when gap < 0, `"adequate"` when 0 | Correct mapping | ☐ |

### 3.3 Scheduled Staff Simulation

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 3.3.1 | Verify base staff count is scaled by department bed count | Larger departments have more base staff | ☐ |
| 3.3.2 | Verify absence factor is 0–15% randomly applied | `present` is 85–100% of scheduled | ☐ |
| 3.3.3 | Verify `present` is always >= 0 | Non-negative after absence deduction | ☐ |
| 3.3.4 | Verify night shift has fewer scheduled staff than day shifts | Night multiplier is lower | ☐ |

---

## 4. Surge Alerts

### 4.1 Bed Occupancy Alerts

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 4.1.1 | When bed occupancy >= 90%, generate critical alert | Alert type = `"bed_occupancy"`, severity = `"critical"` | ☐ |
| 4.1.2 | When bed occupancy 80–89%, generate warning alert | Alert type = `"bed_occupancy"`, severity = `"warning"` | ☐ |
| 4.1.3 | When bed occupancy < 80%, no bed occupancy alert generated | No alert of this type | ☐ |
| 4.1.4 | Verify alert message includes occupancy percentage | Message contains the actual % | ☐ |
| 4.1.5 | Verify alert action suggests discharge review or overflow planning | Action text is actionable | ☐ |

### 4.2 ER Wait Time Alerts

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 4.2.1 | When ER avgWaitMinutes >= 90, generate critical alert | Severity = `"critical"` | ☐ |
| 4.2.2 | When ER avgWaitMinutes 45–89, generate warning alert | Severity = `"warning"` | ☐ |
| 4.2.3 | When ER avgWaitMinutes < 45, no ER wait alert | No alert of this type | ☐ |
| 4.2.4 | Verify only ER department triggers wait time alerts | Non-ER departments don't generate this alert type | ☐ |

### 4.3 Patient Surge Alerts

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 4.3.1 | When waitingPatients > 20, generate critical surge alert | Severity = `"critical"` | ☐ |
| 4.3.2 | When waitingPatients 11–20, generate warning surge alert | Severity = `"warning"` | ☐ |
| 4.3.3 | When waitingPatients <= 10, no surge alert | No alert of this type | ☐ |
| 4.3.4 | Verify surge alerts include the waiting count in the message | Message has patient number | ☐ |

### 4.4 Alert Summary & Sorting

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 4.4.1 | Verify `summary.total` matches `alerts.length` | Counts are consistent | ☐ |
| 4.4.2 | Verify critical alerts appear before warning alerts in array | Sorted by severity | ☐ |
| 4.4.3 | Verify each alert has a unique `id` | No duplicates | ☐ |
| 4.4.4 | Verify `generatedAt` is close to current server time | Within a few seconds | ☐ |

---

## 5. Bed Occupancy

### 5.1 Current Bed Status (`simulateBedOccupancy`)

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 5.1.1 | Verify occupancy rate is 50–95% base range | Within bounds | ☐ |
| 5.1.2 | Verify occupied is a whole number | Integer value | ☐ |
| 5.1.3 | Verify `available = totalBeds - occupied` | Math is correct | ☐ |
| 5.1.4 | Verify pending discharges are within reasonable range | 0 to ~20% of occupied | ☐ |
| 5.1.5 | Verify pending admissions are within reasonable range | 0 to ~10% of available | ☐ |

### 5.2 Prediction Model (`bedOccupancyPrediction`)

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 5.2.1 | Verify delta pattern: 8AM–12PM = +2% per hour | Occupancy increases in morning | ☐ |
| 5.2.2 | Verify delta pattern: 12PM–6PM = +1% per hour | Occupancy increases slowly in afternoon | ☐ |
| 5.2.3 | Verify delta pattern: 6PM–10PM = −0.5% per hour | Occupancy decreases slightly in evening | ☐ |
| 5.2.4 | Verify delta pattern: 10PM–8AM = −1.5% per hour | Occupancy decreases overnight | ☐ |
| 5.2.5 | Verify random noise is within ±1% | Variation is bounded | ☐ |
| 5.2.6 | Verify occupancy is clamped to 10% minimum | Never drops below 10% | ☐ |
| 5.2.7 | Verify occupancy is clamped to 99% maximum | Never exceeds 99% | ☐ |
| 5.2.8 | Verify peak occupancy matches maximum prediction | `peakOccupancyPct == max(predictions)` | ☐ |

---

## 6. Frontend UI

### 6.1 Initial Load & Layout

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 6.1.1 | Open app at `http://localhost:5173` | Dashboard renders without errors | ☐ |
| 6.1.2 | Verify loading spinner appears on initial load | Spinner visible before data arrives | ☐ |
| 6.1.3 | Verify header displays "Hospital Resource Intelligence" | Title is correct | ☐ |
| 6.1.4 | Verify "Live" indicator is visible | Green pulsing dot present | ☐ |
| 6.1.5 | Verify "Last updated" timestamp is displayed | Shows current timestamp | ☐ |
| 6.1.6 | Verify refresh button is functional | Clicking triggers data reload | ☐ |

### 6.2 Summary Cards

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 6.2.1 | Verify 5 summary cards are displayed | ER Wait, Total Waiting, Bed Occupancy, Active Alerts, Hourly Admissions | ☐ |
| 6.2.2 | Verify ER Wait Time card shows minutes value | Numeric value + "min" | ☐ |
| 6.2.3 | Verify Total Waiting card shows patient count | Numeric value | ☐ |
| 6.2.4 | Verify Bed Occupancy card shows percentage | Numeric value + "%" | ☐ |
| 6.2.5 | Verify Active Alerts card shows count with critical/warning breakdown | "X critical, Y warning" | ☐ |
| 6.2.6 | Verify Hourly Admissions card shows current estimate | Numeric value | ☐ |

### 6.3 Forecast Panel

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 6.3.1 | Verify 6 department tabs are displayed (ER, ICU, GEN, PED, MAT, SUR) | All tabs present | ☐ |
| 6.3.2 | Click each department tab, verify chart updates | Area chart re-renders with correct data | ☐ |
| 6.3.3 | Verify historical data shown as one series, forecast as another | Two distinct visual areas | ☐ |
| 6.3.4 | Verify confidence bands are visible in forecast region | Shaded area around forecast line | ☐ |
| 6.3.5 | Verify trend badge shows "Trending Up", "Trending Down", or "Stable" | Badge present with correct label | ☐ |
| 6.3.6 | Verify legend shows Historical avg, Forecast avg, and Confidence band | Legend labels are correct | ☐ |

### 6.4 Custom Forecast Panel

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 6.4.1 | Enter horizon = 10, leave departments empty, submit | Returns all departments, 10-day forecast | ☐ |
| 6.4.2 | Enter horizon = 5, departments = "er,icu", submit | Returns only ER and ICU forecasts | ☐ |
| 6.4.3 | Verify result cards show trend, averages, and daily predictions | All fields displayed | ☐ |
| 6.4.4 | Submit with horizon = 0 | Handles gracefully (no crash, shows empty or error) | ☐ |
| 6.4.5 | Submit with horizon > 30 | Handles gracefully | ☐ |
| 6.4.6 | Verify loading state during API call | Spinner or "Loading..." text appears | ☐ |

### 6.5 Bed Occupancy Panel

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 6.5.1 | Verify "Current" view shows grid of department cards | 6 department cards visible | ☐ |
| 6.5.2 | Verify each card has occupancy %, progress bar, occupied/available/total | All elements present | ☐ |
| 6.5.3 | Verify progress bar color: green < 70%, yellow 70–89%, red >= 90% | Colors match thresholds | ☐ |
| 6.5.4 | Switch to "24h Forecast" view | Line chart appears | ☐ |
| 6.5.5 | Verify critical (90%) and warning (80%) reference lines on chart | Horizontal lines visible | ☐ |
| 6.5.6 | Verify department selector changes displayed data | Chart updates on selection | ☐ |
| 6.5.7 | Verify peak occupancy and risk level are displayed | Values shown below chart | ☐ |

### 6.6 Staffing Panel

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 6.6.1 | Verify department tabs are present | 6 tabs for each department | ☐ |
| 6.6.2 | Verify 3 shift sections per department (Morning, Afternoon, Night) | All shifts shown | ☐ |
| 6.6.3 | Verify each shift shows Doctor, Nurse, Technician, Support roles | 4 role rows per shift | ☐ |
| 6.6.4 | Verify Present/Optimal/Gap values are displayed per role | All values visible | ☐ |
| 6.6.5 | Verify urgency badges: Critical (red), Attention (yellow), Adequate (green) | Correct colors | ☐ |
| 6.6.6 | Verify "Over by X" display when present > optimal | Negative gap shows overstaffed | ☐ |
| 6.6.7 | Verify recommendation text is displayed for understaffed shifts | Text present and readable | ☐ |

### 6.7 Alerts Panel

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 6.7.1 | Verify alerts panel spans full width | Panel is full-width | ☐ |
| 6.7.2 | Verify severity badges: Critical (red), Warning (yellow) | Correct styling | ☐ |
| 6.7.3 | Verify each alert card shows title, department, message, action | All fields rendered | ☐ |
| 6.7.4 | When no alerts exist, verify "All Clear" message appears | Empty state is user-friendly | ☐ |
| 6.7.5 | Verify alert count in summary cards matches alerts panel | Counts are consistent | ☐ |

### 6.8 Auto-Refresh

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 6.8.1 | Wait 30 seconds without interaction | Data refreshes automatically | ☐ |
| 6.8.2 | Verify "Last updated" timestamp changes after auto-refresh | Timestamp updates | ☐ |
| 6.8.3 | Verify "Refreshing..." indicator appears during refresh | Visual feedback shown | ☐ |
| 6.8.4 | Verify no full-page reload during auto-refresh | Only data updates, not the page | ☐ |

---

## 7. Error Handling

### 7.1 Backend Error Handling

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 7.1.1 | Access non-existent route (e.g. `GET /nonexistent`) | Returns 404 or default Express error | ☐ |
| 7.1.2 | Send POST to GET-only route (e.g. `POST /beds`) | Returns 404 or method not allowed | ☐ |
| 7.1.3 | Send malformed JSON body to `POST /forecast` | Returns 400 or 500 with error message | ☐ |
| 7.1.4 | Verify all 500 errors return `{ success: false, error: message }` | Consistent error format | ☐ |
| 7.1.5 | Verify errors are logged to console with `[Server Error]` prefix | Console output present | ☐ |
| 7.1.6 | Verify global error handler catches unhandled exceptions | No server crash on unexpected error | ☐ |

### 7.2 Frontend Error Handling

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 7.2.1 | Start frontend without backend running | Error message displayed with retry button | ☐ |
| 7.2.2 | Stop backend while frontend is running | Error state shown on next refresh cycle | ☐ |
| 7.2.3 | Click retry button after error | Reattempts data fetch | ☐ |
| 7.2.4 | Verify `res.ok` check catches non-200 responses | Error state triggered for 4xx/5xx | ☐ |
| 7.2.5 | Verify API returning non-JSON does not crash the frontend | Error handled gracefully | ☐ |

### 7.3 Network & Proxy Errors

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 7.3.1 | Verify Vite proxy forwards `/api/*` to `localhost:4000` | API calls reach backend | ☐ |
| 7.3.2 | Verify proxy strips `/api` prefix | Backend receives correct path | ☐ |
| 7.3.3 | Backend on wrong port | Frontend shows connection error | ☐ |

---

## 8. Edge Cases & Boundary Conditions

### 8.1 Query Parameter Edge Cases

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 8.1.1 | `GET /forecast?days=abc` (non-numeric) | Uses default (7) or returns error; no crash | ☐ |
| 8.1.2 | `GET /forecast?days=` (empty value) | Uses default (7); no crash | ☐ |
| 8.1.3 | `GET /forecast?days=0` | Handles zero horizon gracefully | ☐ |
| 8.1.4 | `GET /forecast?days=-1` | Handles negative horizon gracefully | ☐ |
| 8.1.5 | `GET /beds/predictions?hours=abc` | Uses default (24); no crash | ☐ |
| 8.1.6 | `GET /beds/predictions?hours=0` | Returns empty predictions or error | ☐ |
| 8.1.7 | `GET /beds/predictions?hours=1000` | Handles large values without timeout | ☐ |

### 8.2 Data Boundary Conditions

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 8.2.1 | Verify Gaussian function never returns negative admissions | `Math.max(0, ...)` enforced | ☐ |
| 8.2.2 | Verify bed occupancy never exceeds 99% in predictions | Capped at 99% | ☐ |
| 8.2.3 | Verify bed occupancy never drops below 10% in predictions | Floor at 10% | ☐ |
| 8.2.4 | Verify forecast confidence never drops below 0 | Minimum confidence check | ☐ |
| 8.2.5 | Verify forecast `lower` bound is never negative | `Math.max(0, ...)` applied | ☐ |
| 8.2.6 | Division by zero: Empty forecast array when computing `forecastAvg` | `(fc.length \|\| 1)` prevents crash | ☐ |
| 8.2.7 | Verify all timestamps are valid ISO 8601 strings | Parseable by `new Date()` | ☐ |

### 8.3 POST `/forecast` Body Edge Cases

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 8.3.1 | Body: `{ horizon: "ten" }` (string instead of number) | Handles gracefully | ☐ |
| 8.3.2 | Body: `{ departments: "er" }` (string instead of array) | Handles gracefully or returns error | ☐ |
| 8.3.3 | Body: `{ departments: [] }` (empty array) | Returns all departments or empty result | ☐ |
| 8.3.4 | Body: `{ horizon: 1.5 }` (float) | Rounds or handles partial days | ☐ |
| 8.3.5 | Body: `{ extraField: "test" }` (unexpected fields) | Extra fields ignored | ☐ |
| 8.3.6 | Very large body (e.g., 10MB payload) | No memory exhaustion or crash | ☐ |

### 8.4 Temporal Edge Cases

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 8.4.1 | Call API at midnight (hour = 0) — time-of-day factor | Night factor (0.6) applied correctly | ☐ |
| 8.4.2 | Call API at noon (hour = 12) — peak time | Peak factor (1.4 or 1.2) applied | ☐ |
| 8.4.3 | Call API on Saturday — weekend factor | Weekend factor (0.85/0.88) applied | ☐ |
| 8.4.4 | Call API on January 1 — seasonal factor | January factor applied | ☐ |
| 8.4.5 | Verify month-boundary seasonal transitions | No discontinuity between months | ☐ |
| 8.4.6 | Verify weekend factor inconsistency (0.85 vs 0.88 in different functions) | Document or fix discrepancy | ☐ |

### 8.5 Concurrency & State

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 8.5.1 | Call all endpoints simultaneously | All return valid responses | ☐ |
| 8.5.2 | Rapid consecutive calls to same endpoint | Each returns independently valid data | ☐ |
| 8.5.3 | Frontend: rapid-click refresh button multiple times | No race conditions or stale data | ☐ |
| 8.5.4 | Frontend: auto-refresh during manual refresh | No duplicate state updates | ☐ |

---

## 9. Integration & End-to-End

### 9.1 Full Workflow Tests

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 9.1.1 | Start backend (`npm start`), verify it runs on port 4000 | Server logs "listening on port 4000" | ☐ |
| 9.1.2 | Start frontend (`npm run dev`), verify it runs on port 5173 | Vite dev server starts | ☐ |
| 9.1.3 | Open dashboard, verify all panels load with data | No empty panels or errors | ☐ |
| 9.1.4 | Verify summary cards data matches API response data | Frontend displays what API returns | ☐ |
| 9.1.5 | Verify forecast chart data matches `/forecast` API response | Chart points match API data | ☐ |
| 9.1.6 | Verify bed panel data matches `/beds` API response | Occupancy values match | ☐ |
| 9.1.7 | Verify staffing panel data matches `/staffing` API response | Staff counts match | ☐ |
| 9.1.8 | Verify alerts panel data matches `/alerts` API response | Alert list matches | ☐ |

### 9.2 Cross-Component Consistency

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 9.2.1 | Bed Occupancy % in summary card matches Bed Panel | Same percentage | ☐ |
| 9.2.2 | Alert count in summary card matches Alerts Panel | Same count | ☐ |
| 9.2.3 | ER Wait Time in summary card matches Admissions data for ER | Same value | ☐ |
| 9.2.4 | Total Waiting in summary card matches sum of all department waiting patients | Sum is correct | ☐ |

---

## 10. Performance & Reliability

### 10.1 Response Times

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 10.1.1 | `GET /health` responds within 50ms | < 50ms | ☐ |
| 10.1.2 | `GET /forecast` responds within 500ms | < 500ms | ☐ |
| 10.1.3 | `POST /forecast` with horizon=30 responds within 1s | < 1000ms | ☐ |
| 10.1.4 | `GET /beds/predictions?hours=48` responds within 500ms | < 500ms | ☐ |
| 10.1.5 | `GET /staffing` responds within 500ms | < 500ms | ☐ |
| 10.1.6 | `GET /alerts` responds within 500ms | < 500ms | ☐ |
| 10.1.7 | Full dashboard initial load completes within 3s | < 3000ms | ☐ |

### 10.2 Reliability

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 10.2.1 | Backend runs for 1 hour without memory leak or crash | Stable uptime | ☐ |
| 10.2.2 | Frontend auto-refreshes 100 times (50 min) without memory growth | Stable memory | ☐ |
| 10.2.3 | 50 concurrent API requests | All return valid responses | ☐ |
| 10.2.4 | CORS headers present in API responses | `Access-Control-Allow-Origin` set | ☐ |

### 10.3 Security Considerations

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 10.3.1 | No authentication on any endpoint (document as known limitation) | All endpoints publicly accessible | ☐ |
| 10.3.2 | No rate limiting (document as known limitation) | No throttling on repeated calls | ☐ |
| 10.3.3 | POST body size is unbounded (document as known limitation) | Large payloads accepted | ☐ |
| 10.3.4 | No input sanitization on department filter (document as known limitation) | Arbitrary strings accepted | ☐ |

---

## Summary

| Section | Total Tests |
|---------|-------------|
| 1. Backend API Routes | 47 |
| 2. Forecasting Logic | 18 |
| 3. Staffing Optimization | 17 |
| 4. Surge Alerts | 18 |
| 5. Bed Occupancy | 13 |
| 6. Frontend UI | 35 |
| 7. Error Handling | 14 |
| 8. Edge Cases & Boundary Conditions | 27 |
| 9. Integration & End-to-End | 12 |
| 10. Performance & Reliability | 15 |
| **Total** | **216** |

---

> **Note:** This platform uses in-memory simulated data (no database). All data is generated fresh on each request. Tests should account for the stochastic nature of the simulation — use ranges and bounds rather than exact values where appropriate.
