import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './ctx/auth'
import Login from './pages/Login'
import AdminDashboard   from './pages/admin/Dashboard'
import AdminCustomers   from './pages/admin/Customers'
import AdminUsers       from './pages/admin/Users'
import AdminSources     from './pages/admin/Sources'
import AdminPlans       from './pages/admin/Plans'
import ManagerDashboard from './pages/manager/Dashboard'
import ManagerUsers     from './pages/manager/Users'
import ManagerSources   from './pages/manager/Sources'
import ManagerPlans     from './pages/manager/Plans'
import ManagerCall      from './pages/manager/Call'
import MemberSources    from './pages/member/Sources'
import MemberCall       from './pages/member/Call'
import MemberPlans      from './pages/member/Plans'
import Viewer           from './pages/Viewer'
import Shell            from './components/Shell'
import Usage            from './pages/shared/Usage'
import TestBench        from './pages/shared/TestBench'

// Wrapper: passes the current user's own ID to the Usage component
function UsageSelf() {
  const { user } = useAuth()
  if (!user) return null
  return <Usage userId={user.userId} />
}

// Wrapper for Admin/Manager: adds user selector
function UsageSelectable() {
  const { user } = useAuth()
  if (!user) return null
  return <Usage userId={user.userId} selectable />
}

function RequireAuth({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={home(user.role)} replace /> : <Login />} />

      {/* Admin */}
      <Route path="/admin" element={<RequireAuth roles={['Admin']}><Shell /></RequireAuth>}>
        <Route path="dashboard"  element={<AdminDashboard />} />
        <Route path="customers"  element={<AdminCustomers />} />
        <Route path="users"      element={<AdminUsers />} />
        <Route path="sources"    element={<AdminSources />} />
        <Route path="plans"      element={<AdminPlans />} />
        <Route path="testbench"  element={<TestBench />} />
        <Route path="usage"      element={<UsageSelectable />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Manager */}
      <Route path="/manager" element={<RequireAuth roles={['Manager']}><Shell /></RequireAuth>}>
        <Route path="dashboard"  element={<ManagerDashboard />} />
        <Route path="users"      element={<ManagerUsers />} />
        <Route path="sources"    element={<ManagerSources />} />
        <Route path="plans"      element={<ManagerPlans />} />
        <Route path="testbench"  element={<TestBench />} />
        <Route path="call"       element={<ManagerCall />} />
        <Route path="usage"      element={<UsageSelectable />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Member */}
      <Route path="/member" element={<RequireAuth roles={['Member']}><Shell /></RequireAuth>}>
        <Route path="sources"    element={<MemberSources />} />
        <Route path="call"       element={<MemberCall />} />
        <Route path="plans"      element={<MemberPlans />} />
        <Route path="usage"      element={<UsageSelf />} />
        <Route index element={<Navigate to="sources" replace />} />
      </Route>

      {/* Viewer */}
      <Route path="/viewer" element={<RequireAuth roles={['Viewer']}><Shell /></RequireAuth>}>
        <Route index element={<Viewer />} />
        <Route path="usage" element={<UsageSelf />} />
      </Route>

      {/* Default */}
      <Route path="*" element={<Navigate to={user ? home(user.role) : '/login'} replace />} />
    </Routes>
  )
}

function home(role: string) {
  switch (role) {
    case 'Admin':   return '/admin/dashboard'
    case 'Manager': return '/manager/dashboard'
    case 'Member':  return '/member/sources'
    case 'Viewer':  return '/viewer'
    default:        return '/login'
  }
}
