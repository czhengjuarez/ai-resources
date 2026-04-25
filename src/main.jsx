import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import App from './App';
import SubmitPage from './pages/SubmitPage';
import CourseBuilderPage from './pages/CourseBuilderPage';
import './styles/tokens.css';
import '@ops-forward/keel/styles.css';
import './styles/app.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/submit" element={<SubmitPage />} />
        <Route path="/course-builder" element={<CourseBuilderPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
