import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Navbar({ onSearch }) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-xl font-bold text-blue-600">AshuCloud</span>
      </div>
      <div className="flex-1 max-w-md mx-6">
        <input
          type="search"
          placeholder="Search files..."
          onChange={(e) => onSearch(e.target.value)}
          className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>
      <button
        onClick={handleLogout}
        className="text-sm text-gray-600 hover:text-gray-900"
      >
        Sign out
      </button>
    </header>
  )
}
