import { useEffect, useState } from 'react'
import api from '../../api/axios'


export default function ReviewModeration() {
  const [reviews, setReviews] = useState([])
  const [reports, setReports] = useState([])

  const load = async () => {
    const [reviewsRes, reportsRes] = await Promise.all([
      api.get('/system-admin/reviews'),
      api.get('/system-admin/reports'),
    ])
    setReviews(Array.isArray(reviewsRes.data) ? reviewsRes.data : [])
    setReports(Array.isArray(reportsRes.data) ? reportsRes.data : [])
  }
  


  useEffect(() => {
    load().catch(() => {})
  }, [])

  const moderate = async (id, status) => {
    await api.patch(`/system-admin/reviews/${id}/moderate`, { status })
    load()
  }

  const remove = async id => {
    if (!confirm('Delete this review?')) return
    await api.delete(`/system-admin/reviews/${id}`)
    load()
  }

  const resolveReport = async (reviewId, reportId) => {
    await api.patch(`/system-admin/reports/${reviewId}/${reportId}/resolve`)
    load()
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Review Moderation</div>
        <div className="page-sub">Approve/reject/delete reviews and handle reports</div>
      </div>

      <div className="table-card">
        <div className="table-header">
          <span className="table-title">All Reviews</span>
          <span className="count-badge">{reviews.length} total</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: 1200 }}>
            <thead>
              <tr>
                <th>User</th>
                <th>Module</th>
                <th>Entity</th>
                <th>Rating</th>
                <th>Comment</th>
                <th>Helpful</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map(r => (
                <tr key={r._id}>
                  <td>{r.userId?.name || '-'}</td>
                  <td>{r.moduleType || 'place'}</td>
                  <td>{String(r.entityId || r.placeId || '-')}</td>
                  <td>{'★'.repeat(Number(r.rating || 0))}</td>
                  <td style={{ maxWidth: 260 }}>{r.comment || '-'}</td>
                  <td>{r.helpfulCount || 0} / {r.notHelpfulCount || 0}</td>
                  <td>{r.moderationStatus}</td>
                  <td>
                    <div className="actions" style={{ flexWrap: 'wrap' }}>
                      <button className="btn btn-primary" onClick={() => moderate(r._id, 'approved')}>Approve</button>
                      <button className="btn btn-danger" onClick={() => moderate(r._id, 'rejected')}>Reject</button>
                      <button className="btn btn-danger" onClick={() => remove(r._id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="table-card">
        <div className="table-header">
          <span className="table-title">Reported Reviews</span>
          <span className="count-badge">{reports.length} total</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: 1000 }}>
            <thead>
              <tr>
                <th>Module</th>
                <th>Rating</th>
                <th>Comment</th>
                <th>Report Reason</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={`${r.reviewId}-${r.reportId}`}>
                  <td>{r.moduleType || '-'}</td>
                  <td>{'★'.repeat(Number(r.rating || 0))}</td>
                  <td style={{ maxWidth: 280 }}>{r.comment || '-'}</td>
                  <td style={{ maxWidth: 280 }}>{r.reason || '-'}</td>
                  <td>{r.status}</td>
                  <td>
                    {r.status === 'open' ? (
                      <button className="btn btn-ghost" onClick={() => resolveReport(r.reviewId, r.reportId)}>Resolve</button>
                    ) : (
                      'Resolved'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

