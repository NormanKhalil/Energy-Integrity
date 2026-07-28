import React from "react";
import { Loader } from "lucide-react";

const Spinner = () => (
  <div className="flex items-center justify-center h-full">
    <Loader className="w-8 h-8 text-cyan-400 animate-spin" />
  </div>
);

export default Spinner;
