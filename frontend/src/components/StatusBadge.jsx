import React from "react";

const StatusBadge = ({ level }) => {
  const colors = { High: "bg-red-500", Medium: "bg-yellow-500", Low: "bg-green-500" };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${colors[level] ?? "bg-slate-600"}`}>
      {level}
    </span>
  );
};

export default StatusBadge;
