import { HashRouter, Route, Routes } from 'react-router-dom';
import Broker from './pages/Broker';
import Check from './pages/Check';
import Confirm from './pages/Confirm';
import Landing from './pages/Landing';
import Report from './pages/Report';

// Hash routing keeps deep links working on any static host (GitHub Pages has no SPA rewrites).
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/check" element={<Check />} />
        <Route path="/report" element={<Report />} />
        <Route path="/broker" element={<Broker />} />
        <Route path="/confirm" element={<Confirm />} />
        <Route path="*" element={<Landing />} />
      </Routes>
    </HashRouter>
  );
}
