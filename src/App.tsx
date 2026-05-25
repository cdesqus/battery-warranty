import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MasterData from './pages/MasterData';
import WarrantyCenter from './pages/WarrantyCenter';
import Reporting from './pages/Reporting';
import Settings from './pages/Settings';
import { DataProvider } from './context/DataContext';

function App() {
  return (
    <DataProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="master-data" element={<MasterData />} />
            <Route path="warranty" element={<WarrantyCenter />} />
            <Route path="reporting" element={<Reporting />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DataProvider>
  );
}

export default App;
