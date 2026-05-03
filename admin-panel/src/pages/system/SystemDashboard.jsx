import { useEffect, useState } from 'react'
import api from '../../api/axios'

export default function SystemDashboard() {
  const [summary, setSummary] = useState({ hotel: { averageRating: 0, count: 0 }, transport: { averageRating: 0, count: 0 }, place: { averageRating: 0, count: 0 } })
  const [msg, setMsg] = useState('')

  const load = async () => {
    const { data } = await api.get('/system-admin/ratings-summary')
    setSummary(data || summary)
  }
  

  const recalcBadges = async () => {
    const { data } = await api.post('/system-admin/badges/recalculate')
    setMsg(data?.message || 'Badges updated')
    load()
  }

  useEffect(() => {
    load().catch(() => {})
  }, [])

  return (
    <div>
      <div className="page-header">
        <div className="page-title">System Administrator Dashboard</div>
        <div className="page-sub">Platform-wide ratings and trust monitoring</div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Hotel Avg Rating</div>
          <div className="stat-value blue">{summary.hotel?.averageRating || 0}</div>
          <div className="page-sub">{summary.hotel?.count || 0} approved reviews</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Transport Avg Rating</div>
          <div className="stat-value purple">{summary.transport?.averageRating || 0}</div>
          <div className="page-sub">{summary.transport?.count || 0} approved reviews</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Place Avg Rating</div>
          <div className="stat-value green">{summary.place?.averageRating || 0}</div>
          <div className="page-sub">{summary.place?.count || 0} approved reviews</div>
        </div>
      </div>

      <div className="form-card">
        <h3>Review Badges</h3>
        <p className="page-sub" style={{ marginBottom: 12 }}>Assigns <b>Top Reviewer</b> to users with at least 3 approved reviews and average rating 4+.</p>
        <button className="btn btn-primary" onClick={recalcBadges}>Recalculate Badges</button>
        {msg ? <p className="page-sub" style={{ marginTop: 10 }}>{msg}</p> : null}
      </div>
    </div>
  )
}

