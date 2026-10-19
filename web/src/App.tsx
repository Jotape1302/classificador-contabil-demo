import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { LoginScreen } from "./components/auth/LoginScreen";
import { Dashboard } from "./components/classifier/Dashboard";
import { RulesManager } from "./components/classifier/RulesManager";
import { CookieBanner } from "./components/common/CookieBanner";
import { HelpSupportView } from "./components/help/HelpSupportView";
import { ImpactView } from "./components/impact/ImpactView";
import { SettingsScreen } from "./components/settings/SettingsScreen";
import { Skeleton } from "./components/ui/skeleton";
import { AcademyPlayer } from "./features/academy/AcademyPlayer";
import { CertificateViewer } from "./features/certificates/CertificateViewer";
import { CertificatesPage } from "./features/certificates/CertificatesPage";
import { PublicCertificatePage } from "./features/certificates/PublicCertificatePage";
import { useCurrentUser } from "./hooks/use-auth";
import { TermsPage } from "./pages/legal/TermsPage";
import { PrivacyPage } from "./pages/legal/PrivacyPage";

const DemoBanner = import.meta.env.VITE_DEMO === "true"
  ? lazy(() => import("./demo/DemoBanner").then((m) => ({ default: m.DemoBanner })))
  : null;

function AuthenticatedApp() {
  const currentUser = useCurrentUser();
  if (currentUser.isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="w-72 space-y-3">
          <Skeleton className="mx-auto size-14 rounded-xl" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </main>
    );
  }
  if (currentUser.isError) return <LoginScreen />;
  return (
    <Routes>
      <Route path="/" element={<Dashboard user={currentUser.data.user} />} />
      <Route path="/history" element={<Dashboard user={currentUser.data.user} />} />
      <Route path="/operation" element={<Dashboard user={currentUser.data.user} />} />
      <Route path="/operation/history" element={<Dashboard user={currentUser.data.user} />} />
      <Route path="/batches/:batchId" element={<Dashboard user={currentUser.data.user} />} />
      <Route path="/operation/batches/:batchId" element={<Dashboard user={currentUser.data.user} />} />
      <Route path="/impact" element={<ImpactView user={currentUser.data.user} />} />
      <Route path="/rules" element={<RulesManager user={currentUser.data.user} />} />
      <Route path="/help" element={<HelpSupportView user={currentUser.data.user} />} />
      <Route path="/settings" element={<SettingsScreen user={currentUser.data.user} />} />
      <Route path="/academy" element={<AcademyPlayer />} />
      <Route path="/academy/lessons/:lessonKey" element={<AcademyPlayer />} />
      <Route path="/academy/final" element={<AcademyPlayer final />} />
      <Route path="/certificates" element={<CertificatesPage />} />
      <Route path="/certificates/:certificateId" element={<CertificateViewer />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const location = useLocation();
  const publicCode = new URLSearchParams(location.search).get("certificado")?.trim() ?? "";

  return (
    <>
      <Routes>
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route
          path="/*"
          element={
            publicCode ? (
              <PublicCertificatePage code={publicCode} />
            ) : (
              <AuthenticatedApp />
            )
          }
        />
      </Routes>
      <CookieBanner />
      {DemoBanner && (
        <Suspense fallback={null}>
          <DemoBanner />
        </Suspense>
      )}
    </>
  );
}

