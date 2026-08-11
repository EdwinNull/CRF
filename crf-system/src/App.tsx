/**
 * 路由定义 + 全局布局 (plan.md §2, §4)
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layout/AppLayout';
import Login from './pages/Login';
import PatientList from './pages/PatientList';
import PatientDetail from './pages/PatientDetail';
import VisitV1 from './pages/PatientDetail/VisitV1';
import VisitV2 from './pages/PatientDetail/VisitV2';
import VisitV3 from './pages/PatientDetail/VisitV3';
import VisitV4 from './pages/PatientDetail/VisitV4';
import VisitV5 from './pages/PatientDetail/VisitV5';
import VisitV6 from './pages/PatientDetail/VisitV6';
import AdverseEvents from './pages/PatientDetail/AdverseEvents';
import ConcomitantMed from './pages/PatientDetail/ConcomitantMed';
import NonDrugTherapy from './pages/PatientDetail/NonDrugTherapy';
import Completion from './pages/PatientDetail/Completion';
import ExportPage from './pages/Export';
import { useCurrentUser } from './store/PatientContext';

function Protected({ children }: { children: React.ReactNode }) {
  const user = useCurrentUser();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <Protected>
              <AppLayout />
            </Protected>
          }
        >
          <Route index element={<PatientList />} />
          <Route path="patient/:id" element={<PatientDetail />}>
            <Route index element={<Navigate to="v1" replace />} />
            <Route path="v1" element={<VisitV1 />} />
            <Route path="v2" element={<VisitV2 />} />
            <Route path="v3" element={<VisitV3 />} />
            <Route path="v4" element={<VisitV4 />} />
            <Route path="v5" element={<VisitV5 />} />
            <Route path="v6" element={<VisitV6 />} />
            <Route path="adverse-events" element={<AdverseEvents />} />
            <Route path="concomitant-med" element={<ConcomitantMed />} />
            <Route path="non-drug-therapy" element={<NonDrugTherapy />} />
            <Route path="completion" element={<Completion />} />
          </Route>
          <Route path="export" element={<ExportPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
