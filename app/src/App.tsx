import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { homeFor, useAuth } from "./lib/auth";
import { Spinner } from "./components/ui";
import Landing from "./pages/Landing";
import type { Role } from "../shared/types";

const ElderApp = lazy(() => import("./pages/elder/ElderApp"));
const FamilyApp = lazy(() => import("./pages/family/FamilyApp"));
const HospitalApp = lazy(() => import("./pages/hospital/HospitalApp"));
const DoctorShare = lazy(() => import("./pages/vault/DoctorShare"));

const Loading = () => <div className="grid h-full place-items-center"><Spinner className="h-8 w-8" /></div>;

function Guard({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/" replace />;
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/elder/*" element={<Guard roles={["elder"]}><ElderApp /></Guard>} />
        <Route path="/family/*" element={<Guard roles={["guardian"]}><FamilyApp /></Guard>} />
        <Route path="/hospital/*" element={<Guard roles={["hospital"]}><HospitalApp /></Guard>} />
        <Route path="/share/:token" element={<DoctorShare />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
