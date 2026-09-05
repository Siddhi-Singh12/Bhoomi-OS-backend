import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AddFarm from './pages/AddFarm';
import FarmDetail from './pages/FarmDetail';
import Alerts from './pages/Alerts';
import { LanguageProvider } from './context/LanguageContext';

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/add-farm" element={<AddFarm />} />
          <Route path="/farm/:id" element={<FarmDetail />} />
          <Route path="/alerts" element={<Alerts />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
}