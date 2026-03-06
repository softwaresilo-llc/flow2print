import React from "react";
import ReactDOM from "react-dom/client";

import { DesignerApp } from "./DesignerApp";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DesignerApp />
  </React.StrictMode>
);
