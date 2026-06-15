import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import PrivateRoute from './components/PrivateRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CreateTestPage from './pages/CreateTestPage';
import AddQuestionsPage from './pages/AddQuestionsPage';
import PreviewPublishPage from './pages/PreviewPublishPage';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { fontSize: '14px', borderRadius: '10px' },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<PrivateRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/tests/create" element={<CreateTestPage />} />
          <Route path="/tests/:id/edit" element={<CreateTestPage />} />
          <Route path="/tests/:id/questions" element={<AddQuestionsPage />} />
          <Route path="/tests/:id/preview" element={<PreviewPublishPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
