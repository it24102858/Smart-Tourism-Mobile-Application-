import { useMemo, useState } from 'react'
import api from './api/axios'
import OwnerDashboard from './pages/hotel/OwnerDashboard'
import HotelManagement from './pages/hotel/HotelManagement'
import RoomManagement from './pages/hotel/Roommanagement'
import HotelBookingManagement from './pages/hotel/BookingManagement'
import DiscountManagement from './pages/hotel/DiscountManagement'
import TransportDashboard from './pages/transport/TransportDashboard'
import TransportVehicleManagement from './pages/transport/VehicleManagement'
import TransportBookingManagement from './pages/transport/BookingManagement'
import PlacesDashboard from './pages/places/PlacesDashboard'
import PlaceManagement from './pages/places/PlaceManagement'
import GuideManagement from './pages/places/GuideManagement'
import GuideBookingManagement from './pages/places/GuideBookingManagement'
import ReviewManagement from './pages/places/ReviewManagement'
import SystemDashboard from './pages/system/SystemDashboard'
import UserControl from './pages/system/UserControl'
import ReviewModeration from './pages/system/ReviewModeration'
import './App.css'

const COMPONENTS = [
  { value: 'hotel_villa_booking', label: 'Hotel / Villa Booking' },
  { value: 'transport_booking', label: 'Transport Booking' },
  { value: 'tourist_places_explorer', label: 'Tourist Guide Company' },
  { value: 'system_administrator', label: 'System Administrator' },
]

const NAV_BY_COMPONENT = {
  hotel_villa_booking: [
    { id: 'dashboard', label: 'Dashboard', icon: 'DB' },
    { id: 'hotels', label: 'Hotels', icon: 'H' },
    { id: 'rooms', label: 'Rooms', icon: 'R' },
    { id: 'bookings', label: 'Bookings', icon: 'B' },
    { id: 'discounts', label: 'Discounts', icon: 'D' },
  ],
  transport_booking: [
    { id: 'dashboard', label: 'Dashboard', icon: 'DB' },
    { id: 'vehicles', label: 'Vehicles', icon: 'V' },
    { id: 'bookings', label: 'Bookings', icon: 'B' },
  ],
  tourist_places_explorer: [
    { id: 'dashboard', label: 'Dashboard', icon: 'DB' },
    { id: 'places', label: 'Places', icon: 'P' },
    { id: 'guides', label: 'Guides', icon: 'G' },
    { id: 'guideBookings', label: 'Guide Bookings', icon: 'GB' },
    { id: 'reviews', label: 'Reviews', icon: 'RV' },
  ],
  system_administrator: [
    { id: 'dashboard', label: 'Dashboard', icon: 'DB' },
    { id: 'users', label: 'Users/Admins', icon: 'U' },
    { id: 'moderation', label: 'Review Moderation', icon: 'RM' },
  ],
}

const PAGES_BY_COMPONENT = {
  hotel_villa_booking: {
    dashboard: <OwnerDashboard />,
    hotels: <HotelManagement />,
    rooms: <RoomManagement />,
    bookings: <HotelBookingManagement />,
    discounts: <DiscountManagement />,
  },
  transport_booking: {
    dashboard: <TransportDashboard />,
    vehicles: <TransportVehicleManagement />,
    bookings: <TransportBookingManagement />,
  },
  tourist_places_explorer: {
    dashboard: <PlacesDashboard />,
    places: <PlaceManagement />,
    guides: <GuideManagement />,
    guideBookings: <GuideBookingManagement />,
    reviews: <ReviewManagement />,
  },
  system_administrator: {
    dashboard: <SystemDashboard />,
    users: <UserControl />,
    moderation: <ReviewModeration />,
  },
}

const COMPONENT_TITLE = {
  hotel_villa_booking: 'Hotel / Villa Booking',
  transport_booking: 'Transport Booking',
  tourist_places_explorer: 'Tourist Places Explorer',
  system_administrator: 'System Administrator',
}

export default function App() {
  const [mode, setMode] = useState('login')
  const [page, setPage] = useState('dashboard')
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    adminComponent: 'hotel_villa_booking',
    adminRegisterKey: '',
  })
  const [session, setSession] = useState(() => {
    const token = localStorage.getItem('token')
    const userRaw = localStorage.getItem('user')
    if (!token || !userRaw) return null
    const user = JSON.parse(userRaw)
    const valid = (user?.role === 'admin' || user?.role === 'system_admin') && Object.keys(NAV_BY_COMPONENT).includes(user?.adminComponent)
    if (!valid) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      return null
    }
    return { token, user }
  })

  const onChange = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const login = async e => {
    e.preventDefault()
    setError('')
    try {
      const loginPayload = {
        email: form.email.trim().toLowerCase(),
        password: form.password.trim(),
      }
      let data
      if (form.adminComponent === 'system_administrator') {
        const res = await api.post('/auth/system-admin-login', loginPayload)
        data = res.data
      } else {
        const res = await api.post('/auth/login', loginPayload)
        data = res.data
      }
      if (data?.user?.role !== 'admin' && data?.user?.role !== 'system_admin') {
        setError('This panel is only for admin accounts.')
        return
      }
      if (!Object.keys(NAV_BY_COMPONENT).includes(data?.user?.adminComponent)) {
        setError('This admin component dashboard is not available yet.')
        return
      }
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      setSession(data)
      setPage('dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    }
  }

  const register = async e => {
    e.preventDefault()
    setError('')
    if (form.adminComponent === 'system_administrator') {
      setError('System Administrator uses default login only. Registration is disabled.')
      return
    }
    try {
      await api.post('/auth/register', {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password.trim(),
        role: 'admin',
        adminComponent: form.adminComponent,
        adminRegisterKey: form.adminRegisterKey.trim(),
      })
      const { data } = await api.post('/auth/login', {
        email: form.email.trim().toLowerCase(),
        password: form.password.trim(),
      })
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      setSession(data)
      setPage('dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed')
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setSession(null)
    setMode('login')
    setPage('dashboard')
  }

  const component = session?.user?.adminComponent
  const nav = useMemo(() => NAV_BY_COMPONENT[component] || [], [component])
  const pages = useMemo(() => PAGES_BY_COMPONENT[component] || {}, [component])
  const brandSub = `${COMPONENT_TITLE[component] || 'Admin'} Panel`

  if (!session) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <h1>{mode === 'login' ? 'Admin Login' : 'Admin Register'}</h1>
          <p>Register as component admin or use default System Administrator login</p>
          <form className="auth-form" onSubmit={mode === 'login' ? login : register}>
            {mode === 'login' && (
              <select
                value={form.adminComponent}
                onChange={e => onChange('adminComponent', e.target.value)}
              >
                {COMPONENTS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            )}
            {mode === 'register' && (
              <>
                <input
                  placeholder="Full name"
                  value={form.name}
                  onChange={e => onChange('name', e.target.value)}
                />
                <select
                  value={form.adminComponent}
                  onChange={e => onChange('adminComponent', e.target.value)}
                >
                  {COMPONENTS.filter(c => c.value !== 'system_administrator').map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <input
                  placeholder="Admin registration key"
                  type="password"
                  value={form.adminRegisterKey}
                  onChange={e => onChange('adminRegisterKey', e.target.value)}
                />
              </>
            )}
            <input
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={e => onChange('email', e.target.value)}
            />
            <input
              placeholder="Password"
              type="password"
              value={form.password}
              onChange={e => onChange('password', e.target.value)}
            />
            {error && <div className="auth-error">{error}</div>}
            <button className="btn btn-primary" type="submit">
              {mode === 'login' ? 'Login' : 'Register'}
            </button>
            <button
              className="btn btn-ghost auth-switch"
              type="button"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? 'Create Admin Account' : 'Back to Login'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  const user = session.user

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">S</span>
          <div>
            <div className="brand-name">SmartStay</div>
            <div className="brand-sub">{brandSub}</div>
          </div>
        </div>
        <nav className="nav">
          {nav.map(item => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => setPage(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="avatar">{(user?.name || 'A').slice(0, 1).toUpperCase()}</div>
          <div>
            <div className="footer-name">{user?.name || 'Admin'}</div>
            <div className="footer-role">{COMPONENT_TITLE[user?.adminComponent] || 'Admin'}</div>
          </div>
          <button className="btn btn-ghost" type="button" onClick={logout}>Logout</button>
        </div>
      </aside>
      <main className="main">
        <div className="main-inner">{pages[page] || pages.dashboard || <div>Page not found</div>}</div>
      </main>
    </div>
  )
}
