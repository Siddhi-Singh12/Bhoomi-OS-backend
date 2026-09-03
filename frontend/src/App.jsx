import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AddFarm from './pages/AddFarm';
import FarmDetail from './pages/FarmDetail';


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/add-farm" element={<AddFarm />} />
        <Route path="/farm/:id" element={<FarmDetail />} />


      </Routes>
    </BrowserRouter>
  );
}