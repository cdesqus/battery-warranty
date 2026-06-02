import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MasterData from './pages/MasterData';
import WarrantyCenter from './pages/WarrantyCenter';
import Reporting from './pages/Reporting';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Logistics from './pages/Logistics';
import { DataProvider, useData } from './context/DataContext';

function AppRoutes() {
  const { currentUser } = useData();

  return (
    <BrowserRouter>
      <Routes>
        {!currentUser ? (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="master-data" element={<MasterData />} />
              {currentUser.role !== 'Viewer' && (
                <Route path="warranty" element={<WarrantyCenter />} />
              )}
              {currentUser.role === 'Super Admin' && (
                <Route path="settings" element={<Settings />} />
              )}
              <Route path="reporting" element={<Reporting />} />
              <Route path="logistics" element={<Logistics />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <DataProvider>
      <AppRoutes />
    </DataProvider>
  );
}

export default App;
