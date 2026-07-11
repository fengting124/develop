import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ToastProvider } from '@/components/primitives/Toast/Toast';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Home } from '@/pages/Home';

const DetectChoice = lazy(() => import('@/pages/DetectChoice').then((module) => ({ default: module.DetectChoice })));
const DetectImage = lazy(() => import('@/pages/DetectImage').then((module) => ({ default: module.DetectImage })));
const DetectVideo = lazy(() => import('@/pages/DetectVideo').then((module) => ({ default: module.DetectVideo })));
const Report = lazy(() => import('@/pages/Report').then((module) => ({ default: module.Report })));
const AdminOverview = lazy(() => import('@/pages/AdminOverview').then((module) => ({ default: module.AdminOverview })));
const AdminDetections = lazy(() => import('@/pages/AdminDetections').then((module) => ({ default: module.AdminDetections })));
const AdminEvaluations = lazy(() => import('@/pages/AdminEvaluations').then((module) => ({ default: module.AdminEvaluations })));
const AdminModels = lazy(() => import('@/pages/AdminModels').then((module) => ({ default: module.AdminModels })));
const AdminReview = lazy(() => import('@/pages/AdminReview').then((module) => ({ default: module.AdminReview })));
const ImageShowcase = lazy(() => import('@/pages/AdminPipeline/ImageShowcase').then((module) => ({ default: module.ImageShowcase })));
const Dev = lazy(() => import('@/pages/Dev').then((module) => ({ default: module.Dev })));
const NotFound = lazy(() => import('@/pages/NotFound/NotFound').then((module) => ({ default: module.NotFound })));

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <Suspense fallback={null}>
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/detect" element={<DetectChoice />} />
            <Route path="/detect/image" element={<DetectImage />} />
            <Route path="/detect/video" element={<Navigate to="/detect" replace />} />
            <Route path="/detect/report/:id" element={<Report />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminOverview />} />
              <Route path="detections" element={<AdminDetections />} />
              <Route path="evaluations" element={<AdminEvaluations />} />
              <Route path="models" element={<AdminModels />} />
              <Route path="review" element={<AdminReview />} />
              <Route path="pipeline" element={<Navigate to="/admin/detections" replace />} />
              <Route path="experts" element={<Navigate to="/admin/models" replace />} />
              <Route path="anomaly" element={<Navigate to="/admin/review" replace />} />
            </Route>
            <Route path="/dev" element={<Dev />} />
            <Route path="/dev/showcase/video-detection" element={<DetectVideo />} />
            <Route path="/dev/showcase/image-pipeline" element={<ImageShowcase />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <ToastProvider>
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </ToastProvider>
  );
}
