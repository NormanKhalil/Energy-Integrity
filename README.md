# Nawabshah Grid Analytics — Full Stack Project

## Folder Structure
```
nawabshah_project/
├── backend/
│   ├── app.py              ← Flask entry point (run this)
│   ├── data_loader.py      ← CSV loader + date parsing
│   ├── data.csv            ← Your Nawabshah dataset
│   ├── requirements.txt    ← Python packages
│   └── routes/
│       ├── dashboard.py    ← KPIs, area stats, billing, theft APIs
│       └── predict.py      ← ML prediction endpoints (Random Forest)
└── frontend/
    └── src/
        └── App.jsx         ← React dashboard (connect to backend)
```

---

## Step 1 — Backend Setup (Python/Flask)

Open terminal in VS Code, go to backend folder:

```bash
cd backend
```

Create virtual environment:
```bash
python -m venv venv
```

Activate it:
- Windows:  `venv\Scripts\activate`
- Mac/Linux: `source venv/bin/activate`

Install packages:
```bash
pip install -r requirements.txt
```

Run Flask server:
```bash
python app.py
```

Backend will run at: **http://localhost:5000**

---

## Step 2 — Frontend Setup (React)

Make sure you have Node.js installed. Open a NEW terminal in VS Code:

```bash
# Create a new React + Vite project
npm create vite@latest frontend -- --template react
cd frontend
npm install

# Install required chart/icon libraries
npm install recharts lucide-react
```

Then **replace** the contents of `src/App.jsx` with the `App.jsx` file provided.

Also replace `src/index.css` with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Install Tailwind:
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

In `tailwind.config.js` set:
```js
content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"]
```

Run frontend:
```bash
npm run dev
```

Frontend will run at: **http://localhost:5173**

---

## API Endpoints

| Endpoint | Description |
|---|---|
| GET /api/dashboard/kpis?year=2023 | KPI summary cards |
| GET /api/dashboard/area_stats | Per-area loadshedding, billing, theft stats |
| GET /api/dashboard/timeseries | Monthly average loadshedding |
| GET /api/dashboard/billing_breakdown | Paid/Unpaid/Partial counts |
| GET /api/dashboard/theft_summary | Theft cases per area |
| GET /api/dashboard/years | Available years in dataset |
| GET /api/predict/loadshedding?month=7&year=2026 | ML prediction per area |
| GET /api/predict/theft_risk | Theft risk level (High/Medium/Low) per area |
| GET /api/predict/forecast_timeseries | Historical + 6-month forecast |

All endpoints accept optional `?year=2023` filter (or omit for all years).
