import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../../api/axios'

export default function TransportDashboard() {
  const [vehicles, setVehicles] = useState([])
  const [bookings, setBookings] = useState([])

  const load = useCallback(async () => {
    const [vRes, bRes] = await Promise.all([
      api.get('/transport'),
      api.get('/transport-bookings'),
    ])
    setVehicles(Array.isArray(vRes.data) ? vRes.data : [])
    setBookings(Array.isArray(bRes.data) ? bRes.data : [])
  }, [])

  
  useEffect(() => {
    load().catch(() => {})
  }, [load])

  const stats = useMemo(() => ({
    totalVehicles: vehicles.length,
    availableVehicles: vehicles.filter(v => v.availability && !v.isBooked).length,
    bookedVehicles: vehicles.filter(v => v.isBooked).length,
    pendingBookings: bookings.filter(b => b.status === 'pending').length,
    confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
  }), [vehicles, bookings])

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Transport Dashboard</div>
        <div className="page-sub">Quick overview of vehicles and bookings</div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Total Vehicles</div>
          <div className="stat-value blue">{stats.totalVehicles}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Available</div>
          <div className="stat-value green">{stats.availableVehicles}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Booked Vehicles</div>
          <div className="stat-value purple">{stats.bookedVehicles}</div>
        </div>
      </div>

      <div className="table-card">
        <div className="table-header">
          <span className="table-title">Vehicle Status</span>
          <span className="count-badge">{vehicles.length} total</span>
        </div>
        {vehicles.length === 0 ? (
          <div className="empty-state">No vehicles yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Type</th>
                <th>Availability</th>
                <th>Booking</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(v => (
                <tr key={v._id}>
                  <td>{v.name}</td>
                  <td>{v.type}</td>
                  <td>{v.availability ? 'Enabled' : 'Disabled'}</td>
                  <td>{v.isBooked ? 'Booked' : 'Available'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="table-card">
        <div className="table-header">
          <span className="table-title">Recent Bookings</span>
          <span className="count-badge">{bookings.length} total</span>
        </div>
        {bookings.length === 0 ? (
          <div className="empty-state">No transport bookings yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>User</th>
                <th>Date Range</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.slice(0, 8).map(b => (
                <tr key={b._id}>
                  <td>{b.vehicleId?.name || '-'}</td>
                  <td>{b.userId?.name || '-'}</td>
                  <td>{new Date(b.startDate).toLocaleDateString()} - {new Date(b.endDate).toLocaleDateString()}</td>
                  <td>{b.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
