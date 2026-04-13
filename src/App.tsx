import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'

import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import Layout from '@/components/layout/Layout'
import { useAuth } from '@/hooks/useAuth'

// Auth
import Login from '@/pages/auth/Login'
import ResetPassword from '@/pages/auth/ResetPassword'

// Print
import BonCommande from '@/pages/print/BonCommande'
import FicheDotation from '@/pages/print/FicheDotation'

// Salarié
import Catalogue from '@/pages/salarie/Catalogue'
import { Commande, Historique } from '@/pages/salarie/index'

// Admin
import {
  Dashboard,
  Stocks,
  CatalogueAdmin,
  Salaries,
  Commandes,
  Documents,
} from '@/pages/admin/index'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,      // 2 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function AppRoutes() {
  useAuth() // initialise la session Supabase et l'écoute des changements d'auth
  return (
    <Routes>

      {/* ── Public ─────────────────────────────────────────── */}
      <Route path="/login"          element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* ── Espace salarié ──────────────────────────────────── */}
      <Route element={<ProtectedRoute allowedRoles={['salarie', 'admin_filiale', 'admin_groupe']} />}>
        <Route element={<Layout />}>
          <Route path="/catalogue" element={<Catalogue />} />
          <Route path="/commande"  element={<Commande />} />
          <Route path="/historique" element={<Historique />} />
        </Route>
      </Route>

      {/* ── Administration ──────────────────────────────────── */}
      <Route element={<ProtectedRoute allowedRoles={['admin_filiale', 'admin_groupe']} />}>
        <Route element={<Layout />}>
          <Route path="/admin/dashboard"  element={<Dashboard />} />
          <Route path="/admin/stocks"     element={<Stocks />} />
          <Route path="/admin/catalogue"  element={<CatalogueAdmin />} />
          <Route path="/admin/salaries"   element={<Salaries />} />
          <Route path="/admin/commandes"  element={<Commandes />} />
          <Route path="/admin/documents"  element={<Documents />} />
        </Route>
      </Route>

      {/* ── Impression (protégé, sans Layout) ──────────────── */}
      <Route element={<ProtectedRoute allowedRoles={['admin_filiale', 'admin_groupe']} />}>
        <Route path="/print/commande/:commandeId" element={<BonCommande />} />
        <Route path="/print/dotation/:profilId"   element={<FicheDotation />} />
      </Route>

      {/* ── Redirections ────────────────────────────────────── */}
      <Route path="/"   element={<Navigate to="/catalogue" replace />} />
      <Route path="*"   element={<Navigate to="/catalogue" replace />} />

    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppRoutes />
      </BrowserRouter>

      {/* Notifications toast */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#fff',
            color: '#111827',
            border: '1px solid #E5E7EB',
            borderRadius: '10px',
            fontSize: '14px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          },
          success: {
            iconTheme: { primary: '#0F6E56', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#DC2626', secondary: '#fff' },
          },
        }}
      />

      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
