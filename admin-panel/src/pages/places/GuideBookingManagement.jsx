import { useCallback, useEffect, useState } from 'react'
import api from '../../api/axios'
import Toast from '../../../components/Toast'

export default function GuideBookingManagement() {
  const [bookings, setBookings] = useState([])
  const [toast, setToast] = useState(null)

  const notify = (message, type = 'success') => setToast({ message, type })

  const load = useCallback(async () => {
    const { data } = await api.get('/guide-bookings')
    setBookings(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => {
    load().catch(() => notify('Failed to load bookings', 'error'))
  }, [load])

  const setStatus = async (id, status) => {
    try {
      await api.put(`/guide-bookings/${id}/status`, { status })
      load()
      notify(`Booking marked as ${status}`)
    } catch (err) {
      notify(err.response?.data?.message || 'Status update failed', 'error')
    }
  }

  const remove = async id => {
    if (!confirm('Delete this booking?')) return
    try {
      await api.delete(`/guide-bookings/${id}`)
      load()
      notify('Booking deleted')
    } catch (err) {
      notify(err.response?.data?.message || 'Delete failed', 'error')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Guide Booking Management</div>
        <div className="page-sub">Approve, reject, or delete guide bookings</div>
      </div>

      <div className="table-card">
        <div className="table-header">
          <span className="table-title">All Guide Bookings</span>
          <span className="count-badge">{bookings.length} total</span>
        </div>
        {bookings.length === 0 ? (
          <div className="empty-state">No bookings found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ minWidth: 1380 }}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Contact</th>
                  <th>Place</th>
                  <th>Guide</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b._id}>
                    <td>{b.userId?.name || '-'}</td>
                    <td>
                      <div>{b.contactName || '-'}</div>
                      <div style={{ opacity: 0.8 }}>{b.contactPhone || '-'}</div>
                      <div style={{ opacity: 0.8 }}>{b.contactEmail || '-'}</div>
                    </td>
                    <td>{b.placeId?.name || '-'}</td>
                    <td>{b.guideId?.name || '-'}</td>
                    <td>{new Date(b.date).toLocaleDateString()}</td>
                    <td>LKR {Number(b.amount || b.guideId?.pricePerDay || 0)}</td>
                    <td>{b.paymentMethod || 'cash'} ({b.paymentStatus || 'pending'})</td>
                    <td>{b.status}</td>
                    <td>
                      <div className="actions" style={{ flexWrap: 'wrap' }}>
                        <button className="btn btn-primary" onClick={() => setStatus(b._id, 'approved')}>Approve</button>
                        <button className="btn btn-danger" onClick={() => setStatus(b._id, 'rejected')}>Reject</button>
                        <button className="btn btn-ghost" onClick={() => setStatus(b._id, 'pending')}>Pending</button>
                        <button className="btn btn-danger" onClick={() => remove(b._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
