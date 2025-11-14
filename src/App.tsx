import React from 'react';
import { Routes, Route } from 'react-router-dom';
import JobsList from './pages/JobsList';
import JobDetail from './pages/JobDetail';
import AdminPanel from './pages/AdminPanel';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<JobsList />} />
      <Route path="/jobs/:slug" element={<JobDetail />} />
      <Route path="/admin" element={<AdminPanel />} />
      <Route path="*" element={<JobsList />} />
    </Routes>
  );
}