import { useEffect, useState } from 'react'
import api from '../../api/axios'

export default function UserControl() {
  const [users, setUsers] = useState([])
  const [reasonByUser, setReasonByUser] = useState({})

  const load = async () => {
    const { data } = await api.get('/system-admin/users')
    setUsers(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    load().catch(() => {})
  }, [])

  const removeUser = async userId => {
    const reason = String(reasonByUser[userId] || '').trim()
    if (!reason) return alert('Please add removal reason')
    await api.patch(`/system-admin/users/${userId}/remove`, { reason })
    load()
  }

  const restoreUser = async userId => {
    await api.patch(`/system-admin/users/${userId}/restore`)
    load()
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">User and Component Admin Control</div>
        <div className="page-sub">Remove/restore platform access with mandatory reason</div>
      </div>

      <div className="table-card">
        <div className="table-header">
          <span className="table-title">All Accounts</span>
          <span className="count-badge">{users.length} total</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="compact-table" style={{ minWidth: 1120 }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Component</th>
                <th>Badge</th>
                <th>Status</th>
                <th>Reason</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td style={{ color: 'var(--muted)' }}>{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'badge-blue' : 'badge-purple'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ color: 'var(--muted)' }}>{u.adminComponent || '-'}</td>
                  <td>{u.reviewBadge ? <span className="badge badge-yellow">{u.reviewBadge}</span> : '-'}</td>
                  <td>
                    <span className={`badge ${u.blocked ? 'badge-red' : 'badge-green'}`}>
                      {u.blocked ? 'Removed' : 'Active'}
                    </span>
                  </td>
                  <td style={{ maxWidth: 260, color: 'var(--muted)' }}>{u.blockedReason || '-'}</td>
                  <td>
                    <div className="user-actions">
                      {!u.blocked ? (
                        <>
                          <input
                            className="reason-input"
                            placeholder="Removal reason"
                            value={reasonByUser[u._id] || ''}
                            onChange={e => setReasonByUser(prev => ({ ...prev, [u._id]: e.target.value }))}
                          />
                          <button className="btn btn-danger" onClick={() => removeUser(u._id)}>Remove</button>
                        </>
                      ) : (
                        <button className="btn btn-success" onClick={() => restoreUser(u._id)}>Restore</button>
                      )}
                    </div>
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
