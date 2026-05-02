import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../../api/axios'

const DAY_MS = 24 * 60 * 60 * 1000

const nightsBetween = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0
  const inDate = new Date(checkIn)
  const outDate = new Date(checkOut)
  const diff = Math.round((outDate - inDate) / DAY_MS)
  return diff > 0 ? diff : 0
}

export default function OwnerDashboard() {
  const [hotels, setHotels] = useState([])
  const [rooms, setRooms] = useState([])
  const [bookings, setBookings] = useState([])
  const [discounts, setDiscounts] = useState([])

  const load = useCallback(async () => {
    const [hRes, rRes, bRes, dRes] = await Promise.all([
      api.get('/hotels/mine'),
      api.get('/rooms/mine'),
      api.get('/bookings'),
      api.get('/discounts/mine'),
    ])
    setHotels(Array.isArray(hRes.data) ? hRes.data : [])
    setRooms(Array.isArray(rRes.data) ? rRes.data : [])
    setBookings(Array.isArray(bRes.data) ? bRes.data : [])
    setDiscounts(Array.isArray(dRes.data) ? dRes.data : [])
  }, [])

  useEffect(() => {
    load().catch(() => {})
  }, [load])

  const stats = useMemo(() => {
    const activeBookings = bookings.filter(b => ['paid', 'approved'].includes(b.status))
    const revenue = activeBookings.reduce((sum, b) => {
      const roomPrice = Number(b?.roomId?.price || 0)
      return sum + roomPrice * nightsBetween(b.checkIn, b.checkOut)
    }, 0)

    return {
      hotels: hotels.length,
      rooms: rooms.length,
      activeBookings: activeBookings.length,
      activeDiscounts: discounts.filter(d => {
        const now = new Date()
        const startOk = !d.startDate || new Date(d.startDate) <= now
        const endOk = !d.endDate || new Date(d.endDate) >= now
        return startOk && endOk
      }).length,
      revenue,
    }
  }, [hotels, rooms, bookings, discounts])

  const recent = bookings.slice(0, 5)

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Dashboard</div>
        <div className="page-sub">Welcome. Here is your owner account summary.</div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Hotels</div>
          <div className="stat-value blue">{stats.hotels}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Rooms</div>
          <div className="stat-value purple">{stats.rooms}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Bookings</div>
          <div className="stat-value green">{stats.activeBookings}</div>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Active Discounts</div>
          <div className="stat-value blue">{stats.activeDiscounts}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Current Revenue</div>
          <div className="stat-value green">LKR {stats.revenue.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Recent Bookings</div>
          <div className="stat-value purple">{recent.length}</div>
        </div>
      </div>

      <div className="table-card">
        <div className="table-header">
          <span className="table-title">Recent Bookings</span>
          <span className="count-badge">{recent.length} shown</span>
        </div>
        {recent.length === 0 ? (
          <div className="empty-state">No bookings yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Guest</th>
                <th>Hotel</th>
                <th>Room</th>
                <th>Status</th>
                <th>Dates</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(b => (
                <tr key={b._id}>
                  <td>{b.fullName || b.userId?.name || '-'}</td>
                  <td>{b.hotelId?.name || '-'}</td>
                  <td>{b.roomId?.type || '-'}</td>
                  <td>{b.status || '-'}</td>
                  <td>{new Date(b.checkIn).toLocaleDateString()} - {new Date(b.checkOut).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
