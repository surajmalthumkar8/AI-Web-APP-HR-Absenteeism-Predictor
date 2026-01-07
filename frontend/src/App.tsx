/**
 * Main Application Component.
 *
 * Sets up routing and the main layout structure.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Predictions from './pages/Predictions';
import Employees from './pages/Employees';
import Analytics from './pages/Analytics';
import NLPQuery from './pages/NLPQuery';

function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/predictions" element={<Predictions />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/query" element={<NLPQuery />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;
