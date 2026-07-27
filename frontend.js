import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart
} from 'recharts';
import { Zap, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

const parseCsv = (text) => {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  const pushField = () => {
    currentRow.push(currentField);
    currentField = '';
  };

  const pushRow = () => {
    if (currentRow.some((value) => value.trim())) {
      rows.push(currentRow);
    }
    currentRow = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          currentField += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      pushField();
    } else if (char === '\n') {
      pushField();
      pushRow();
    } else if (char !== '\r') {
      currentField += char;
    }
  }

  if (currentField || currentRow.length) {
    pushField();
    pushRow();
  }

  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] ?? '']))
  );
};

const formatMonthLabel = (value) => {
  if (!value) return 'Month';
  const [year, month] = value.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const KpiCard = ({ title, value, icon: Icon, trend }) => (
  <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg flex items-center justify-between">
    <div>
      <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-white">{value}</h3>
      {trend && <p className="text-sm mt-2 text-rose-400">{trend}</p>}
    </div>
    <div className="bg-slate-700 p-4 rounded-full">
      <Icon className="w-8 h-8 text-cyan-400" />
    </div>
  </div>
);

export default function Dashboard() {
  const [timeframe, setTimeframe] = useState('Last 7 Days');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadCsv = async () => {
      try {
        const candidates = ['/nawabshah_loadshedding_full_data.csv', './nawabshah_loadshedding_full_data.csv'];
        let response = null;

        for (const url of candidates) {
          response = await fetch(url);
          if (response.ok) break;
        }

        if (!response || !response.ok) {
          throw new Error('Unable to load the CSV file.');
        }

        const text = await response.text();
        const parsedRows = parseCsv(text);

        if (!parsedRows.length) {
          throw new Error('The CSV file is empty.');
        }

        setRows(parsedRows);
      } catch (err) {
        setError(err.message || 'Unable to load data.');
      } finally {
        setLoading(false);
      }
    };

    loadCsv();
  }, []);

  const areaData = useMemo(() => {
    if (!rows.length) {
      return [];
    }

    const grouped = new Map();

    rows.forEach((record) => {
      const area = record.Area?.trim() || 'Unknown Area';
      const current = Number(record.Loadshedding_Hours_Per_Day || 0);
      const paymentStatus = (record.Bill_Payment_Status || '').trim().toLowerCase();
      const theftFlag = (record.Electricity_Theft_Suspected || '').trim().toLowerCase() === 'yes';

      if (!grouped.has(area)) {
        grouped.set(area, {
          name: area,
          totalHours: 0,
          count: 0,
          theftCount: 0,
          paidCount: 0,
          unpaidCount: 0,
          partialCount: 0
        });
      }

      const entry = grouped.get(area);
      entry.totalHours += current;
      entry.count += 1;
      if (theftFlag) entry.theftCount += 1;
      if (paymentStatus === 'paid') entry.paidCount += 1;
      else if (paymentStatus === 'unpaid') entry.unpaidCount += 1;
      else if (paymentStatus === 'partially paid') entry.partialCount += 1;
    });

    return Array.from(grouped.values())
      .map((entry) => {
        const avgLoadshedding = entry.totalHours / entry.count;
        const theftRate = Math.round((entry.theftCount / entry.count) * 100);
        const billingPaid = Math.round((entry.paidCount / entry.count) * 100);
        const billingUnpaid = Math.round((entry.unpaidCount / entry.count) * 100);
        const predicted = Math.max(1, Math.round(avgLoadshedding + (theftRate > 0 ? 1.2 : 0.4) + (billingUnpaid > 0 ? 0.8 : 0)));

        return {
          name: entry.name,
          loadshedding: Number(avgLoadshedding.toFixed(1)),
          predicted,
          theftRate,
          billingPaid,
          billingUnpaid
        };
      })
      .sort((a, b) => b.loadshedding - a.loadshedding);
  }, [rows]);

  const timeSeriesData = useMemo(() => {
    if (!rows.length) {
      return [];
    }

    const monthMap = new Map();

    rows.forEach((record) => {
      const month = record.Billing_Month?.trim();
      if (!month) return;

      if (!monthMap.has(month)) {
        monthMap.set(month, { month, totalHours: 0, count: 0 });
      }

      const entry = monthMap.get(month);
      entry.totalHours += Number(record.Loadshedding_Hours_Per_Day || 0);
      entry.count += 1;
    });

    const sortedMonths = Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));
    const recentMonths = sortedMonths.slice(-6);

    if (!recentMonths.length) {
      return [];
    }

    const historicalValues = recentMonths.map((month) => month.totalHours / month.count);
    const lastValue = historicalValues[historicalValues.length - 1] || 0;
    const trend = historicalValues.length > 1 ? (lastValue - historicalValues[0]) / Math.max(1, historicalValues.length - 1) : 0;

    return recentMonths.map((month, index) => {
      const avg = month.totalHours / month.count;
      const predictedValue = index >= recentMonths.length - 2 ? Number((lastValue + trend * (index - recentMonths.length + 2)).toFixed(1)) : null;

      return {
        month: formatMonthLabel(month.month),
        historical: index < recentMonths.length - 2 ? Number(avg.toFixed(1)) : null,
        predicted: predictedValue
      };
    });
  }, [rows]);

  const totalLoadsheddingHours = useMemo(() => {
    return rows.reduce((sum, row) => sum + Number(row.Loadshedding_Hours_Per_Day || 0), 0);
  }, [rows]);

  const avgBillingCompliance = useMemo(() => {
    if (!rows.length) return 0;
    const paidCount = rows.filter((row) => (row.Bill_Payment_Status || '').trim().toLowerCase() === 'paid').length;
    return (paidCount / rows.length) * 100;
  }, [rows]);

  const highestOutageArea = areaData[0]?.name || 'N/A';
  const theftAlertArea = areaData.reduce((highest, current) => {
    if (!highest) return current;
    return current.theftRate > highest.theftRate ? current : highest;
  }, null)?.name || 'N/A';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-8 font-sans flex items-center justify-center">
        <p className="text-slate-300">Loading CSV dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-8 font-sans flex items-center justify-center">
        <p className="text-rose-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 font-sans">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Grid Analytics & ML Predictor</h1>
          <p className="text-slate-400 mt-1">Monitoring loadshedding, theft, and billing compliance using the supplied CSV data</p>
        </div>
        <div className="flex gap-4">
          <select
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500 outline-none"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
          >
            <option>Last 7 Days</option>
            <option>Last Month</option>
            <option>Year to Date</option>
          </select>
          <button className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg font-medium transition-colors">
            Export Report
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard title="Total Loadshedding" value={`${totalLoadsheddingHours.toFixed(1)} hrs`} trend="Derived from CSV" icon={Zap} />
        <KpiCard title="Highest Outage Area" value={highestOutageArea} trend="Highest average outage" icon={AlertTriangle} />
        <KpiCard title="Avg. Billing Compliance" value={`${avgBillingCompliance.toFixed(0)}%`} trend="Based on paid bills" icon={CheckCircle} />
        <KpiCard title="High Theft Alert" value={theftAlertArea} trend="Highest theft signal" icon={ShieldAlert} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold mb-4">Current vs Predicted Loadshedding (Hours)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={areaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tick={{ fill: '#94a3b8' }} />
                <YAxis stroke="#94a3b8" fontSize={12} tick={{ fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} />
                <Legend />
                <Bar dataKey="loadshedding" name="Current Hours" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="predicted" name="Predicted Hours" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold mb-1">Loadshedding Forecast</h3>
          <p className="text-xs text-slate-400 mb-4">Trends derived from the billing months in the uploaded dataset.</p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
                <Legend />
                <Line type="monotone" dataKey="historical" name="Actual History" stroke="#06b6d4" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="predicted" name="Forecast" stroke="#f43f5e" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 lg:col-span-2">
          <h3 className="text-lg font-bold mb-4">Area Breakdown: Billing Compliance vs Estimated Theft</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={areaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
                <Legend />
                <Bar yAxisId="left" dataKey="billingPaid" name="% Bills Paid" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                <Bar yAxisId="left" dataKey="billingUnpaid" name="% Bills Unpaid" stackId="a" fill="#334155" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="theftRate" name="Estimated Theft (%)" stroke="#ef4444" strokeWidth={3} dot={{ r: 6, fill: '#ef4444' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}