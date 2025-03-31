import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import { App } from "./window/ipdata/App";
import { ActiveWindow } from "./window/ActiveWindow/ActiveWindow";
import "./index.scss";

ReactDOM.createRoot(document.getElementById("root")).render(
  <HashRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route
        path="/command"
        element={<ActiveWindow title="Command Execution" />}
      />
    </Routes>
  </HashRouter>
);
