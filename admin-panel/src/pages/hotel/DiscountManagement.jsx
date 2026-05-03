import { useEffect, useState, useCallback } from 'react'
import api from '../../api/axios'
import Toast from '../../../components/Toast'

const EMPTY = { title: '', percentage: '', hotelId: '', roomId: '', startDate: '', endDate: '' }

export default function DiscountManagement() {
  const [discounts, setDiscounts] = useState([])
  const [hotels, setHotels] = useState([])
  const [rooms, setRooms] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(false)

  
  const notify = (message, type = 'success') => setToast({ message, type })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const today = new Date().toISOString().slice(0, 10)

  const load = useCallback(async () => {
    try {
      const [dRes, hRes, rRes] = await Promise.all([
        api.get('/discounts/mine'), api.get('/hotels/mine'), api.get('/rooms/mine')
      ])
      setDiscounts(dRes.data)
      setHotels(hRes.data)
      setRooms(rRes.data)
    } catch {
      notify('Failed to load', 'error')
    }
  }, [])

  useEffect(() => { load() }, [load])

  const hotelName = id => hotels.find(h => h._id === id)?.name || 'All hotels'
  const roomType = id => rooms.find(r => r._id === id)?.type || 'All rooms'

  const isActive = d => {
    const now = new Date()
    if (d.startDate && new Date(d.startDate) > now) return false
    if (d.endDate && new Date(d.endDate) < now) return false
    return true
  }

  const create = async () => {
    if (!form.title || !form.percentage) return notify('Title & percentage required', 'error')
    if (Number(form.percentage) < 1 || Number(form.percentage) > 100) return notify('Percentage must be 1-100', 'error')
    if (form.endDate && form.endDate < today) return notify('End date cannot be in the past', 'error')
    if (form.startDate && form.endDate && form.endDate < form.startDate) return notify('End date must be after start date', 'error')

    setLoading(true)
    try {
      await api.post('/discounts', form)
      setForm(EMPTY)
      await load()
      notify('Discount created')
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to create discount', 'error')
    }
    setLoading(false)
  }

  const update = async () => {
    const eStart = editing?.startDate ? String(editing.startDate).slice(0, 10) : ''
    const eEnd = editing?.endDate ? String(editing.endDate).slice(0, 10) : ''

    if (eEnd && eEnd < today) return notify('End date cannot be in the past', 'error')
    if (eStart && eEnd && eEnd < eStart) return notify('End date must be after start date', 'error')

    setLoading(true)
    try {
      await api.put(`/discounts/${editing._id}`, editing)
      setEditing(null)
      await load()
      notify('Discount updated')
    } catch (err) {
      notify(err.response?.data?.message || 'Update failed', 'error')
    }
    setLoading(false)
  }

  const remove = async id => {
    if (!confirm('Delete this discount?')) return
    try {
      await api.delete(`/discounts/${id}`)
      await load()
      notify('Discount deleted')
    } catch {
      notify('Delete failed', 'error')
    }
  }

  const fmtDate = d => d ? new Date(d).toLocaleDateString() : '-'
  const active = discounts.filter(isActive).length
  const expired = discounts.length - active

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Discounts</div>
        <div className="page-sub">Create and manage promotional offers</div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Total Discounts</div>
          <div className="stat-value blue">{discounts.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Now</div>
          <div className="stat-value green">{active}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Expired</div>
          <div className="stat-value purple">{expired}</div>
        </div>
      </div>

      <div className="form-card">
        <h3>Create Discount</h3>
        <div className="form-row">
          <div className="field">
            <label>Title</label>
            <input placeholder="e.g. Summer Special" value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div className="field">
            <label>Discount %</label>
            <input type="number" min="1" max="100" placeholder="15" value={form.percentage} onChange={e => set('percentage', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label>Apply to Hotel (optional)</label>
            <select value={form.hotelId} onChange={e => set('hotelId', e.target.value)}>
              <option value="">All hotels</option>
              {hotels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Apply to Room (optional)</label>
            <select value={form.roomId} onChange={e => set('roomId', e.target.value)}>
              <option value="">All rooms</option>
              {rooms.map(r => <option key={r._id} value={r._id}>{r.type}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label>Valid From</label>
            <input type="date" min={today} value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          </div>
          <div className="field">
            <label>Valid Until</label>
            <input type="date" min={form.startDate || today} value={form.endDate} onChange={e => set('endDate', e.target.value)} />
          </div>
        </div>
        <button className="btn btn-primary" onClick={create} disabled={loading}>{loading ? '...' : 'Create Discount'}</button>
      </div>

      <div className="table-card">
        <div className="table-header">
          <span className="table-title">All Discounts</span>
          <span className="count-badge">{discounts.length} total</span>
        </div>
        {discounts.length === 0 ? (
          <div className="empty-state">No discounts yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Discount</th>
                <th>Applies To</th>
                <th>Valid Period</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {discounts.map(d => (
                <tr key={d._id}>
                  <td><strong>{d.title}</strong></td>
                  <td><span className="pct-pill">{d.percentage}% OFF</span></td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span className="badge badge-blue">{hotelName(d.hotelId)}</span>
                      <span className="badge badge-purple" style={{ fontSize: 10 }}>{roomType(d.roomId)}</span>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>
                    {fmtDate(d.startDate)} {' -> '} {fmtDate(d.endDate)}
                  </td>
                  <td>{isActive(d) ? <span className="badge badge-green">Active</span> : <span className="badge badge-red">Expired</span>}</td>
                  <td>
                    <div className="actions">
                      <button className="btn btn-ghost" onClick={() => setEditing({ ...d })}>Edit</button>
                      <button className="btn btn-danger" onClick={() => remove(d._id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Edit Discount</h3>
            <div className="form-row">
              <div className="field">
                <label>Title</label>
                <input value={editing.title} onChange={e => setEditing(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="field">
                <label>Percentage</label>
                <input type="number" value={editing.percentage} onChange={e => setEditing(p => ({ ...p, percentage: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Start Date</label>
                <input type="date" min={today} value={editing.startDate?.slice(0, 10) || ''} onChange={e => setEditing(p => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div className="field">
                <label>End Date</label>
                <input type="date" min={editing.startDate?.slice(0, 10) || today} value={editing.endDate?.slice(0, 10) || ''} onChange={e => setEditing(p => ({ ...p, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={update} disabled={loading}>Save</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
