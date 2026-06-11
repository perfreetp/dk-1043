import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Overview from './pages/Overview';
import CertificateLibrary from './pages/CertificateLibrary';
import Reminder from './pages/Reminder';
import Records from './pages/Records';
import Statistics from './pages/Statistics';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/certificates" element={<CertificateLibrary />} />
        <Route path="/reminders" element={<Reminder />} />
        <Route path="/records" element={<Records />} />
        <Route path="/statistics" element={<Statistics />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
