import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SettingsProvider } from '@/hooks/useSettings';
import Index from '@/pages/Index';
import LoginPage from '@/pages/LoginPage';
import NotFound from '@/pages/NotFound';

function Protected({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-2xl dora-gradient animate-pulse-soft shadow-lg" />
        <p className="text-sm text-muted-foreground">Loading MiniDora…</p>
      </div>
    </div>
  );
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <SettingsProvider>
          <BrowserRouter>
            <Toaster richColors position="top-center" closeButton />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<Protected><Index /></Protected>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
