import { useEffect, useState, useCallback } from 'react'
import api from '../../api/axios'
import Toast from '../../../components/Toast'

const DAY_MS = 24 * 60 * 60 * 1000

const nightsBetween = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0
  const inDate = new Date(checkIn)
  const outDate = new Date(checkOut)
  const diff = Math.round((outDate - inDate) / DAY_MS)
  return diff > 0 ? diff : 0
}

const bookingAmount = booking => {
  const price = Number(booking?.roomId?.price || 0)
  const nights = nightsBetween(booking.checkIn, booking.checkOut)
  return price * nights
}

export default function BookingManagement() {
  const [bookings, setBookings] = useState([])
  const [filter, setFilter] = useState('all')
  const [toast, setToast] = useState(null)
  const [detailBooking, setDetailBooking] = useState(null)

  const notify = (message, type = 'success') => setToast({ message, type })

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/bookings')
      setBookings(Array.isArray(data) ? data : [])
    } catch {
      notify('Failed to load bookings', 'error')
    }
  }, [])

  useEffect(() => { load() }, [load])

  const ownerAction = async (id, action) => {
    try {
      await api.post(`/bookings/${id}/owner-action`, { action })
      await load()
      notify(`Booking ${action}d`)
    } catch (err) {
      notify(err.response?.data?.message || 'Update failed', 'error')
    }
  }

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter)

  const counts = {
    all: bookings.length,
    saved: bookings.filter(b => b.status === 'saved').length,
    paid: bookings.filter(b => b.status === 'paid').length,
    approved: bookings.filter(b => b.status === 'approved').length,
    refunded: bookings.filter(b => b.status === 'refunded').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  }

  const totalBooked = bookings.filter(b => b.status !== 'cancelled').length
  const totalBalance = bookings
    .filter(b => ['paid', 'approved'].includes(b.status))
    .reduce((sum, b) => sum + bookingAmount(b), 0)

  const statusBadge = s => {
    const map = { saved: 'badge-blue', paid: 'badge-yellow', approved: 'badge-green', refunded: 'badge-purple', cancelled: 'badge-red' }
    return <span className={`badge ${map[s] || 'badge-blue'}`}>{s}</span>
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Bookings</div>
        <div className="page-sub">Full booking details for your properties</div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Total Bookings</div>
          <div className="stat-value blue">{counts.all}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Booked (Not Cancelled)</div>
          <div className="stat-value purple">{totalBooked}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Balance</div>
          <div className="stat-value green">LKR {totalBalance.toLocaleString()}</div>
        </div>
      </div>

      <div className="table-card">
        <div className="table-header">
          <span className="table-title">Reservations</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {['all', 'saved', 'paid', 'approved', 'refunded', 'cancelled'].map(f => (
              <button
                key={f}
                className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '5px 12px', fontSize: 12 }}
                onClick={() => setFilter(f)}
              >
                {f} ({counts[f]})
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">No {filter !== 'all' ? filter : ''} bookings found.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Guest</th>
                <th>Hotel</th>
                <th>Room</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Nights</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => {
                const nights = nightsBetween(b.checkIn, b.checkOut)
                const amount = bookingAmount(b)
                return (
                  <tr key={b._id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <strong>{b.fullName || b.userId?.name || 'User'}</strong>
                        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{b.email || b.userId?.email || '-'}</span>
                        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{b.phone || '-'}</span>
                      </div>
                    </td>
                    <td>{b.hotelId?.name || '-'}</td>
                    <td><span className="badge badge-blue">{b.roomId?.type || '-'}</span></td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{new Date(b.checkIn).toLocaleDateString()}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{new Date(b.checkOut).toLocaleDateString()}</td>
                    <td>{nights}</td>
                    <td style={{ fontWeight: 700 }}>LKR {amount.toLocaleString()}</td>
                    <td>{statusBadge(b.status)}</td>
                    <td>
                      <div className="actions">
                        <button
                          className="btn btn-ghost"
                          style={{ fontSize: 12, padding: '5px 10px' }}
                          onClick={() => setDetailBooking(b)}
                        >
                          View Details
                        </button>
                        {b.status === 'paid' && (
                          <button
                            className="btn btn-success"
                            style={{ fontSize: 12, padding: '5px 10px' }}
                            onClick={() => ownerAction(b._id, 'approve')}
                          >
                            Approve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {detailBooking && (
        <div className="modal-overlay" onClick={() => setDetailBooking(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Guest & Booking Details</h3>
            <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
              <div><strong>Full Name:</strong> {detailBooking.fullName || detailBooking.userId?.name || '-'}</div>
              <div><strong>Email:</strong> {detailBooking.email || detailBooking.userId?.email || '-'}</div>
              <div><strong>Phone:</strong> {detailBooking.phone || '-'}</div>
              <div><strong>Nationality:</strong> {detailBooking.nationality || '-'}</div>
              <div><strong>Passport/ID:</strong> {detailBooking.passportNumber || '-'}</div>
              <div><strong>Address:</strong> {detailBooking.address || '-'}</div>
              <div><strong>Gender:</strong> {detailBooking.gender || '-'}</div>
              <div><strong>Rooms:</strong> {detailBooking.numberOfRooms ?? '-'}</div>
              <div><strong>Room Type:</strong> {detailBooking.roomType || detailBooking.roomId?.type || '-'}</div>
              <div><strong>Bed Preference:</strong> {detailBooking.bedPreference || '-'}</div>
              <div><strong>Smoking Preference:</strong> {detailBooking.smokingPreference || '-'}</div>
              <div><strong>Arrival Time:</strong> {detailBooking.arrivalTime || '-'}</div>
              <div><strong>Promo Code:</strong> {detailBooking.promoCode || '-'}</div>
              <div><strong>Special Notes:</strong> {detailBooking.specialNotes || '-'}</div>
              <div><strong>Payment Method:</strong> {detailBooking.payment?.method || '-'}</div>
              <div><strong>Payment Status:</strong> {detailBooking.payment?.status || '-'}</div>
              <div><strong>Booking Status:</strong> {detailBooking.status || '-'}</div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setDetailBooking(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
