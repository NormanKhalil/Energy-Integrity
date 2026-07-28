import React from "react";

const MetricCard = ({ title, value, sub, icon: Icon }) => (
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

export default MetricCard;
