import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from '@/components/primitives/Toast/Toast';
import { Home } from '@/pages/Home';
import { DetectChoice } from '@/pages/DetectChoice';
import { DetectImage } from '@/pages/DetectImage';
import { DetectVideo } from '@/pages/DetectVideo';
import { Report } from '@/pages/Report';
import { AdminOverview } from '@/pages/AdminOverview';
import { AdminPipeline } from '@/pages/AdminPipeline';
import { AdminExperts } from '@/pages/AdminExperts';
import { AdminAnomaly } from '@/pages/AdminAnomaly';
import { Dev } from '@/pages/Dev';

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/detect" element={<DetectChoice />} />
          <Route path="/detect/image" element={<DetectImage />} />
          <Route path="/detect/video" element={<DetectVideo />} />
          <Route path="/detect/report/:id" element={<Report />} />
          <Route path="/admin" element={<AdminOverview />} />
          <Route path="/admin/pipeline" element={<AdminPipeline />} />
          <Route path="/admin/experts" element={<AdminExperts />} />
          <Route path="/admin/anomaly" element={<AdminAnomaly />} />
          <Route path="/dev" element={<Dev />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
