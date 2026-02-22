const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5001;


// ===== Security =====
app.use(helmet());
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// ===== Departments =====
const DEPARTMENTS = [
  { id: "er", name: "Emergency Room", beds: 40, base: 58 },
  { id: "icu", name: "ICU", beds: 20, base: 14 },
  { id: "gen", name: "General Ward", beds: 80, base: 38 },
  { id: "ped", name: "Pediatrics", beds: 25, base: 20 },
];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ===== Admissions =====
app.get("/admissions", (req, res) => {
  const data = DEPARTMENTS.map((d) => ({
    departmentId: d.id,
    department: d.name,
    hourlyAdmissions: rand(5, 15),
    waitingPatients: rand(0, 25),
    avgWaitMinutes: rand(10, 90),
  }));
  res.json({ success: true, data });
});

// ===== Beds =====
app.get("/beds", (req, res) => {
  const data = DEPARTMENTS.map((d) => {
    const occupied = rand(10, d.beds);
    return {
      departmentId: d.id,
      department: d.name,
      totalBeds: d.beds,
      occupied,
      available: d.beds - occupied,
      occupancyPct: Math.round((occupied / d.beds) * 100),
    };
  });
  res.json({ success: true, data });
});

// ===== Bed Predictions =====
app.get("/beds/predictions", (req, res) => {
  const data = DEPARTMENTS.map((d) => ({
    departmentId: d.id,
    department: d.name,
    totalBeds: d.beds,
    currentOccupancyPct: rand(60, 95),
    peakOccupancyPct: rand(70, 100),
    risk: "normal",
    predictions: Array.from({ length: 24 }).map((_, i) => ({
      hour: i,
      time: new Date().toISOString(),
      occupancyPct: rand(60, 95),
      occupied: rand(10, d.beds),
      available: rand(0, 10),
    })),
  }));
  res.json({ success: true, data });
});

// ===== Staffing =====
app.get("/staffing", (req, res) => {
  const data = DEPARTMENTS.map((d) => ({
    departmentId: d.id,
    department: d.name,
    patients: rand(10, 50),
    totalBeds: d.beds,
    overallUrgency: "adequate",
    shifts: [],
  }));
  res.json({ success: true, data });
});

// ===== Alerts =====
app.get("/alerts", (req, res) => {
  res.json({
    success: true,
    alerts: [],
    summary: { total: 0, critical: 0, warning: 0 },
  });
});

// ===== Forecast =====
function generateForecast() {
  return DEPARTMENTS.map((d) => {
    const historical = Array.from({ length: 14 }).map((_, i) => ({
      date: `Day-${i}`,
      admissions: rand(30, 70),
    }));

    const forecast = Array.from({ length: 7 }).map((_, i) => ({
      date: `Future-${i}`,
      predicted: rand(30, 70),
      lower: rand(20, 40),
      upper: rand(60, 80),
      confidence: 0.9,
    }));

    return {
      departmentId: d.id,
      department: d.name,
      historical,
      forecast,
      trend: "stable",
      recentAvg: 50,
      forecastAvg: 55,
    };
  });
}

app.get("/forecast", (req, res) => {
  res.json({ success: true, data: generateForecast() });
});

app.post("/forecast", (req, res) => {
  res.json({ success: true, data: generateForecast() });
});

// ===== Root API =====
app.get("/api", (req, res) => {
  res.json({ name: "Hospital Resource Intelligence API" });
});

// ===== Serve Frontend =====
const publicPath = path.join(__dirname, "public");
app.use(express.static(publicPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

// ===== 404 =====
app.use((req, res) => {
  res.status(404).json({ success: false, error: "Route not found." });
});

// ===== Start =====
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
