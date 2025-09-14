import React from "react";
import { createRoot } from "react-dom/client";
import MortgageBonusCalculator from "./MortgageBonusCalculator";
import "./index.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("No se encontró el elemento #root en index.html");
}

createRoot(container).render(
  <React.StrictMode>
    <MortgageBonusCalculator />
  </React.StrictMode>
);


