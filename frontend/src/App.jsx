import React, { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ComposedChart, Cell,
} from "recharts";
import { Zap, AlertTriangle, CheckCircle, ShieldAlert, Loader } from "lucide-react";

const API = "http://localhost:5000/api";

function useFetch(url) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!url) return;
    setData(null);
    fetch(url)
      .then((r) => r.json())
      .then(setData)
      .catch(setError);
  }, [url]);

  return { data, error };
}

const Spinner = () => (
  <div className="flex items-center justify-center h-full">
    <Loader className="w-8 h-8 text-cyan-400 animate-spin" />
  </div>
);

const KpiCard = ({ title, value, sub, icon: Icon }) => (
  <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg flex items-center justify-between transition-all hover:border-slate-600">
    <div>
      <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-white">{value ?? "—"}</h3>
      {sub && <p className="text-sm mt-2 text-rose-400">{sub}</p>}
    </div>
    <div className="bg-slate-700 p-4 rounded-full">
      <Icon className="w-8 h-8 text-cyan-400" />
    </div>
  </div>
);

const RiskBadge = ({ level }) => {
  const colors = { High: "bg-red-500", Medium: "bg-yellow-500", Low: "bg-green-500" };
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-bold text-white ${colors[level] ?? "bg-slate-600"}`}
    >
      {level}
    </span>
  );
};

export default function Dashboard() {
  const [year, setYear] = useState("all");
  const [selectedArea, setSelectedArea] = useState("all");

  const areas = [
    { value: "all", label: "🌍 All Areas" },
    { value: "Society Colony", label: "🏢 Society Colony" },
    { value: "Farsi Bagh", label: "🌳 Farsi Bagh" },
    { value: "Gareebabad", label: "🏡 Gareebabad" },
    { value: "Manwabad", label: "🌇 Manwabad" },
    { value: "University Colony", label: "🎓 Uni Colony" },
    { value: "Isharpura", label: "🌾 Isharpura" }
  ];

  const { data: years } = useFetch(`${API}/dashboard/years`);
  const { data: kpis } = useFetch(`${API}/dashboard/kpis?year=${year}&area=${selectedArea}`);
  const { data: areaStats } = useFetch(`${API}/dashboard/area_stats?year=${year}`);
  const { data: billing } = useFetch(`${API}/dashboard/billing_breakdown?year=${year}&area=${selectedArea}`);
  const { data: theft } = useFetch(`${API}/dashboard/theft_summary?year=${year}`);
  const { data: forecast } = useFetch(`${API}/predict/forecast_timeseries?area=${selectedArea}`);
  const { data: theftRisk } = useFetch(`${API}/predict/theft_risk`);
  const { data: lsPrediction } = useFetch(`${API}/predict/loadshedding?month=7&year=2026`);

  const areaChartData = areaStats
    ? areaStats.map((a) => {
      const pred = lsPrediction?.predictions?.find((p) => p.name === a.name);
      return { ...a, predicted: pred?.predicted ?? null };
    })
    : null;

  const handleExport = () => {
    window.location.href = `${API}/dashboard/export?year=${year}&area=${selectedArea}`;
  };

  // Helper to determine if an item is currently selected (for visual highlighting)
  const isMatch = (name) => {
    if (selectedArea === "all") return true;
    return name.toLowerCase().includes(selectedArea.split(" ")[0].toLowerCase());
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Energy Integrity</h1>
          <p className="text-slate-400 mt-1">
            Loadshedding · Billing Compliance · Electricity Theft — Powered by ML
          </p>
          <p className="text-cyan-400/90 text-xs font-semibold mt-1">
            Emphasizes maintaining honesty and fairness in energy consumption
          </p>
        </div>
        <div className="flex gap-3">
          <select
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500 outline-none"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            <option value="all">All Years</option>
            {years?.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            onClick={handleExport}
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Export Report
          </button>
        </div>
      </header>

      {/* Option Buttons Area Filter */}
      <div className="mb-8">
        <p className="text-slate-400 text-sm font-semibold mb-2">FILTER BY GRID AREA:</p>
        <div className="flex flex-wrap gap-2 bg-slate-800/40 p-2 rounded-xl border border-slate-700/60">
          {areas.map((a) => (
            <button
              key={a.value}
              onClick={() => setSelectedArea(a.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedArea === a.value
                ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 font-bold"
                : "text-slate-400 hover:bg-slate-700/50 hover:text-white"
                }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard
          title={selectedArea === "all" ? "Total Loadshedding Hrs" : `Loadshedding Hrs (${selectedArea})`}
          value={kpis ? `${kpis.total_loadshedding_hrs} hrs` : null}
          sub={selectedArea === "all" ? "All areas combined" : `Selected grid segment`}
          icon={Zap}
        />
        <KpiCard
          title={selectedArea === "all" ? "Worst Affected Area" : "Average Loadshedding"}
          value={selectedArea === "all" ? kpis?.worst_area : (kpis ? `${kpis.worst_area_avg_hrs} hrs` : null)}
          sub={kpis ? `${kpis.worst_area_avg_hrs} hrs avg/day` : null}
          icon={AlertTriangle}
        />
        <KpiCard
          title={selectedArea === "all" ? "Billing Compliance" : "Billing Compliance"}
          value={kpis ? `${kpis.billing_compliance_pct}%` : null}
          sub="Bills paid on time"
          icon={CheckCircle}
        />
        <KpiCard
          title={selectedArea === "all" ? "Highest Theft Area" : "Electricity Theft"}
          value={selectedArea === "all" ? kpis?.highest_theft_area : (kpis ? `${kpis.overall_theft_pct}%` : null)}
          sub={kpis ? `${kpis.overall_theft_pct}% theft cases` : null}
          icon={ShieldAlert}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold mb-1">Actual vs ML Predicted Loadshedding</h3>
          <p className="text-xs text-slate-400 mb-4">
            Avg hrs/day per area · Prediction: July 2026 {selectedArea !== "all" && `(Highlighted: ${selectedArea})`}
          </p>
          <div className="h-72">
            {areaChartData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={areaChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tick={{ fill: "#94a3b8" }} />
                  <YAxis stroke="#94a3b8" fontSize={11} tick={{ fill: "#94a3b8" }} />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#fff" }} />
                  <Legend />
                  <Bar dataKey="loadshedding" name="Avg Hours/Day" radius={[4, 4, 0, 0]}>
                    {areaChartData.map((entry, idx) => (
                      <Cell
                        key={`cell-ls-${idx}`}
                        fill={isMatch(entry.name) ? "#06b6d4" : "#1e293b"}
                        stroke={isMatch(entry.name) ? "#22d3ee" : "#334155"}
                        fillOpacity={isMatch(entry.name) ? 1.0 : 0.2}
                      />
                    ))}
                  </Bar>
                  <Bar dataKey="predicted" name="ML Predicted (Jul 2026)" radius={[4, 4, 0, 0]}>
                    {areaChartData.map((entry, idx) => (
                      <Cell
                        key={`cell-pred-${idx}`}
                        fill={isMatch(entry.name) ? "#818cf8" : "#1e293b"}
                        stroke={isMatch(entry.name) ? "#a5b4fc" : "#334155"}
                        fillOpacity={isMatch(entry.name) ? 1.0 : 0.2}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Spinner />
            )}
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold mb-1">
            Loadshedding Forecast {selectedArea !== "all" && `— ${selectedArea}`}
          </h3>
          <p className="text-xs text-slate-400 mb-4">Random Forest model — 2023–2025 historical + 2026 forecast</p>
          <div className="h-72">
            {forecast ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecast} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={9} tick={{ fill: "#94a3b8" }} />
                  <YAxis stroke="#94a3b8" fontSize={11} tick={{ fill: "#94a3b8" }} />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155" }} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="historical"
                    name="Actual History"
                    stroke="#06b6d4"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    name="ML Prediction"
                    stroke="#f43f5e"
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    dot={{ r: 3 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Spinner />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold mb-4">Area Billing Compliance</h3>
          <div className="h-72">
            {areaStats ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={areaStats} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tick={{ fill: "#94a3b8" }} />
                  <YAxis stroke="#94a3b8" fontSize={11} tick={{ fill: "#94a3b8" }} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#fff" }}
                    formatter={(v) => `${v}%`}
                  />
                  <Legend />
                  <Bar dataKey="billingPaid" name="Paid %" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]}>
                    {areaStats.map((entry, idx) => (
                      <Cell key={`pay-${idx}`} fillOpacity={isMatch(entry.name) ? 1.0 : 0.25} />
                    ))}
                  </Bar>
                  <Bar dataKey="billingPartial" name="Partial %" stackId="a" fill="#f59e0b">
                    {areaStats.map((entry, idx) => (
                      <Cell key={`part-${idx}`} fillOpacity={isMatch(entry.name) ? 1.0 : 0.25} />
                    ))}
                  </Bar>
                  <Bar dataKey="billingUnpaid" name="Unpaid %" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]}>
                    {areaStats.map((entry, idx) => (
                      <Cell key={`unpay-${idx}`} fillOpacity={isMatch(entry.name) ? 1.0 : 0.25} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Spinner />
            )}
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold mb-4">Electricity Theft Analysis</h3>
          {theft ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700">
                  <th className="text-left pb-2">Area</th>
                  <th className="text-right pb-2">Cases</th>
                  <th className="text-right pb-2">Theft %</th>
                  <th className="text-right pb-2">Avg Unit Diff</th>
                  <th className="text-right pb-2">ML Risk</th>
                </tr>
              </thead>
              <tbody>
                {theft.map((row) => {
                  const risk = theftRisk?.find((r) => r.name === row.name);
                  const isHighlighted = !isMatch(row.name);
                  return (
                    <tr
                      key={row.name}
                      className={`border-b border-slate-700/50 transition-all ${selectedArea !== "all" && isMatch(row.name)
                        ? "bg-cyan-500/10 border-l-[3px] border-l-cyan-400 text-white font-medium"
                        : isHighlighted
                          ? "opacity-40 hover:opacity-80 hover:bg-slate-700/30"
                          : "hover:bg-slate-700/30"
                        }`}
                    >
                      <td className="py-2.5 pl-2 text-white font-medium">{row.name}</td>
                      <td className="py-2.5 text-right text-cyan-400">{row.theftCases}</td>
                      <td className="py-2.5 text-right text-rose-400">{row.theftRate}%</td>
                      <td className="py-2.5 text-right text-yellow-400">+{row.avgUnitDiff_kWh} kWh</td>
                      <td className="py-2.5 text-right pr-2">
                        {risk ? <RiskBadge level={risk.riskLevel} /> : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <Spinner />
          )}
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-lg font-bold mb-4">Billing Compliance vs Theft Rate — All Areas</h3>
        <div className="h-80">
          {areaStats ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={areaStats} margin={{ top: 5, right: 30, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tick={{ fill: "#94a3b8" }} />
                <YAxis yAxisId="left" stroke="#94a3b8" fontSize={11} tick={{ fill: "#94a3b8" }} unit="%" />
                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={11} tick={{ fill: "#94a3b8" }} unit="%" />
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#fff" }} formatter={(v) => `${v}%`} />
                <Legend />
                <Bar yAxisId="left" dataKey="billingPaid" name="Bills Paid %" stackId="a" radius={[0, 0, 4, 4]}>
                  {areaStats.map((entry, idx) => (
                    <Cell key={`comp-paid-${idx}`} fill="#10b981" fillOpacity={isMatch(entry.name) ? 1.0 : 0.2} />
                  ))}
                </Bar>
                <Bar yAxisId="left" dataKey="billingUnpaid" name="Bills Unpaid %" stackId="a" radius={[4, 4, 0, 0]}>
                  {areaStats.map((entry, idx) => (
                    <Cell key={`comp-unpaid-${idx}`} fill="#334155" fillOpacity={isMatch(entry.name) ? 1.0 : 0.2} />
                  ))}
                </Bar>
                <Line yAxisId="right" type="monotone" dataKey="theftRate" name="Theft Rate %" stroke="#ef4444" strokeWidth={3} dot={{ r: 6, fill: "#ef4444" }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <Spinner />
          )}
        </div>
      </div>

      <footer className="mt-8 text-center text-slate-500 text-xs flex flex-col gap-1.5 items-center">
        <span className="font-semibold text-slate-400">
          "Emphasizes maintaining honesty and fairness in energy consumption"
        </span>
        <span>
          Data: Nawabshah 6-Area Loadshedding Dataset (2023–2025) · ML: Random Forest (scikit-learn)
        </span>
      </footer>
    </div>
  );
}
