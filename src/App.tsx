import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import AppShell from "@/components/layout/AppShell";
import Overview from "@/pages/Overview/Overview";
import LineExplorer from "@/pages/LineExplorer/LineExplorer";
import PedigreeExplorer from "@/pages/PedigreeExplorer/PedigreeExplorer";
import CrossLab from "@/pages/CrossLab/CrossLab";
import BreedDesigner from "@/pages/BreedDesigner/BreedDesigner";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Overview />} />
          <Route path="lines" element={<LineExplorer />} />
          <Route path="pedigree" element={<PedigreeExplorer />} />
          <Route path="cross-lab" element={<CrossLab />} />
          <Route path="breed-designer" element={<BreedDesigner />} />
          <Route path="*" element={<Overview />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
