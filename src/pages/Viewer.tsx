import { useNavigate } from 'react-router-dom'
import { useAuth } from '../ctx/auth'

export default function Viewer() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="lock-wrap">
      <div className="lock-icon">👁️</div>
      <h2>Viewer Access</h2>
      <p>
        Your account has read-only viewer access. You do not have permission
        to access any features of this platform. Please contact your manager
        to request additional permissions.
      </p>
      <button className="btn btn-outline" onClick={handleLogout}>Sign out</button>
    </div>
  )
}
