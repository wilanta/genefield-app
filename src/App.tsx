import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import AppShell from "@/components/layout/AppShell";
import Overview from "@/pages/Overview/Overview";
import LineExplorer from "@/pages/LineExplorer/LineExplorer";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Overview />} />
          <Route path="lines" element={<LineExplorer />} />
          <Route path="*" element={<Overview />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
