import { useCallback, useEffect, useState } from 'react'
import api from '../../api/axios'
import Toast from '../../../components/Toast'

const toSafeUrl = raw => {
  const value = String(raw || '').trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  return `https://${value}`
}

export default function BookingManagement() {
  const [bookings, setBookings] = useState([])
  const [toast, setToast] = useState(null)

  const notify = (message, type = 'success') => setToast({ message, type })

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/transport-bookings')
      setBookings(Array.isArray(data) ? data : [])
    } catch {
      notify('Failed to load bookings', 'error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const setStatus = async (id, status) => {
    try {
      await api.put(`/transport-bookings/${id}/status`, { status })
      load()
      notify(`Booking marked as ${status}`)
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to update status', 'error')
    }
  }

  const remove = async id => {
    if (!confirm('Delete this booking?')) return
    try {
      await api.delete(`/transport-bookings/${id}`)
      load()
      notify('Booking deleted')
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to delete booking', 'error')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Transport Bookings</div>
        <div className="page-sub">Review and manage all transport bookings</div>
      </div>

      <div className="table-card">
        <div className="table-header">
          <span className="table-title">All Bookings</span>
          <span className="count-badge">{bookings.length} total</span>
        </div>
        {bookings.length === 0 ? (
          <div className="empty-state">No bookings found.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Vehicle</th>
                <th>Start</th>
                <th>End</th>
                <th>Pickup Location</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b._id}>
                  <td>{b.userId?.name || '-'} ({b.userId?.email || '-'})</td>
                  <td>{b.vehicleId?.name || '-'}</td>
                  <td>{new Date(b.startDate).toLocaleDateString()}</td>
                  <td>{new Date(b.endDate).toLocaleDateString()}</td>
                  <td style={{ maxWidth: 260 }}>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {b.pickupLocation || '-'}
                    </div>
                    {b.pickupMapLink ? (
                      <a
                        href={toSafeUrl(b.pickupMapLink)}
                        target="_blank"
                        rel="noreferrer noopener"
                        style={{ color: '#1d4ed8', fontWeight: 700, textDecoration: 'underline' }}
                      >
                        Open Map
                      </a>
                    ) : (
                      <span style={{ color: '#6b7280' }}>No map link</span>
                    )}
                  </td>
                  <td>{b.status}</td>
                  <td>
                    <div className="actions">
                      <button className="btn btn-ghost" onClick={() => setStatus(b._id, 'pending')}>Pending</button>
                      <button className="btn btn-primary" onClick={() => setStatus(b._id, 'confirmed')}>Confirm</button>
                      <button className="btn btn-danger" onClick={() => setStatus(b._id, 'cancelled')}>Cancel</button>
                      <button className="btn btn-danger" onClick={() => remove(b._id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
