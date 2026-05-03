import { useCallback, useEffect, useState } from 'react'
import api from '../../api/axios'
import Toast from '../../../components/Toast'

export default function ReviewManagement() {
  const [reviews, setReviews] = useState([])
  const [toast, setToast] = useState(null)

  const notify = (message, type = 'success') => setToast({ message, type })

  const load = useCallback(async () => {
    const { data } = await api.get('/reviews')
    setReviews(Array.isArray(data) ? data : [])
  }, [])
  

  useEffect(() => {
    load().catch(() => notify('Failed to load reviews', 'error'))
  }, [load])

  const remove = async id => {
    if (!confirm('Delete this review?')) return
    try {
      await api.delete(`/reviews/${id}`)
      load()
      notify('Review deleted')
    } catch (err) {
      notify(err.response?.data?.message || 'Delete failed', 'error')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Review Management</div>
        <div className="page-sub">Monitor and moderate place reviews</div>
      </div>

      <div className="table-card">
        <div className="table-header">
          <span className="table-title">All Reviews</span>
          <span className="count-badge">{reviews.length} total</span>
        </div>
        {reviews.length === 0 ? (
          <div className="empty-state">No reviews found.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Place</th>
                <th>Rating</th>
                <th>Comment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map(r => (
                <tr key={r._id}>
                  <td>{r.userId?.name || '-'}</td>
                  <td>{r.placeId?.name || '-'}</td>
                  <td>{r.rating}/5</td>
                  <td style={{ maxWidth: 320, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.comment || '-'}</td>
                  <td>
                    <button className="btn btn-danger" onClick={() => remove(r._id)}>Delete</button>
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
