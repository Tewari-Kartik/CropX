import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import FarmerOnboarding from "./pages/FarmerOnboarding";
import FarmerDashboard from "./pages/FarmerDashboard";
import AdvisoryView from "./pages/AdvisoryView";
import OfficerDashboard from "./pages/OfficerDashboard";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/farmer/onboard" element={<FarmerOnboarding />} />
      <Route path="/farmer/dashboard" element={<FarmerDashboard />} />
      <Route path="/farmer/advisory" element={<AdvisoryView />} />
      <Route path="/officer/dashboard" element={<OfficerDashboard />} />
    </Routes>
  );
}
