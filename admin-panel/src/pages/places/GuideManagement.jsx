import { useCallback, useEffect, useState } from 'react' 
import api from '../../api/axios'
import Toast from '../../../components/Toast'

const EMPTY = {
  name: '',
  contactNumber: '',
  experience: '',
  languages: '',
  pricePerDay: '',
  availability: true,
  placeId: '',
}

export default function GuideManagement() {
  const [guides, setGuides] = useState([])
  const [places, setPlaces] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [toast, setToast] = useState(null)

  const notify = (message, type = 'success') => setToast({ message, type })

  const load = useCallback(async () => {
    const [gRes, pRes] = await Promise.all([api.get('/guides'), api.get('/places')])
    setGuides(Array.isArray(gRes.data) ? gRes.data : [])
    setPlaces(Array.isArray(pRes.data) ? pRes.data : [])
  }, [])

  useEffect(() => {
    load().catch(() => notify('Failed to load guides', 'error'))
  }, [load])

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const validateGuide = payload => {
    if (!String(payload?.name || '').trim()) return 'Guide name is required'
    if (!String(payload?.contactNumber || '').trim()) return 'Guide contact number is required'
    if (String(payload.contactNumber).replace(/\D/g, '').length < 10) return 'Guide contact number must be at least 10 digits'
    if (!String(payload?.languages || '').trim()) return 'Languages are required'
    if (!String(payload?.placeId || '').trim()) return 'Assigned place is required'
    const price = Number(payload?.pricePerDay)
    if (!Number.isFinite(price) || price <= 0) return 'Price per day must be greater than 0'
    return null
  }

  const create = async () => {
    const error = validateGuide(form)
    if (error) return notify(error, 'error')
    try {
      await api.post('/guides', { ...form, pricePerDay: Number(form.pricePerDay) })
      setForm(EMPTY)
      load()
      notify('Guide created')
    } catch (err) {
      notify(err.response?.data?.message || 'Create failed', 'error')
    }
  }

  const update = async () => {
    const error = validateGuide(editing)
    if (error) return notify(error, 'error')
    try {
      await api.put(`/guides/${editing._id}`, { ...editing, pricePerDay: Number(editing.pricePerDay) })
      setEditing(null)
      load()
      notify('Guide updated')
    } catch (err) {
      notify(err.response?.data?.message || 'Update failed', 'error')
    }
  }

  const remove = async id => {
    if (!confirm('Delete this guide?')) return
    try {
      await api.delete(`/guides/${id}`)
      load()
      notify('Guide deleted')
    } catch (err) {
      notify(err.response?.data?.message || 'Delete failed', 'error')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Guide Management</div>
        <div className="page-sub">Add, assign, edit, and delete guides</div>
      </div>

      <div className="form-card">
        <h3>Add Guide</h3>
        <div className="form-row">
          <div className="field"><label>Name</label><input value={form.name} onChange={e => set('name', e.target.value)} /></div>
          <div className="field"><label>Guide Contact Number</label><input value={form.contactNumber} onChange={e => set('contactNumber', e.target.value)} /></div>
          <div className="field"><label>Experience</label><input value={form.experience} onChange={e => set('experience', e.target.value)} /></div>
          <div className="field"><label>Languages (comma separated)</label><input value={form.languages} onChange={e => set('languages', e.target.value)} /></div>
          <div className="field"><label>Price Per Day</label><input type="number" value={form.pricePerDay} onChange={e => set('pricePerDay', e.target.value)} /></div>
          <div className="field">
            <label>Assigned Place</label>
            <select value={form.placeId} onChange={e => set('placeId', e.target.value)}>
              <option value="">Select place</option>
              {places.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Availability</label>
            <select value={String(form.availability)} onChange={e => set('availability', e.target.value === 'true')}>
              <option value="true">Available</option>
              <option value="false">Unavailable</option>
            </select>
          </div>
        </div>
        <button className="btn btn-primary" onClick={create}>+ Add Guide</button>
      </div>

      <div className="table-card">
        <div className="table-header">
          <span className="table-title">All Guides</span>
          <span className="count-badge">{guides.length} total</span>
        </div>
        {guides.length === 0 ? (
          <div className="empty-state">No guides yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Experience</th>
                <th>Contact</th>
                <th>Languages</th>
                <th>Price</th>
                <th>Assigned Place</th>
                <th>Availability</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {guides.map(g => (
                <tr key={g._id}>
                  <td>{g.name}</td>
                  <td>{g.experience || '-'}</td>
                  <td>{g.contactNumber || '-'}</td>
                  <td>{Array.isArray(g.languages) ? g.languages.join(', ') : '-'}</td>
                  <td>{g.pricePerDay}</td>
                  <td>{g.placeId?.name || '-'}</td>
                  <td>{g.availability ? 'Available' : 'Unavailable'}</td>
                  <td>
                    <div className="actions">
                      <button className="btn btn-ghost" onClick={() => setEditing({ ...g, placeId: g.placeId?._id || '', languages: Array.isArray(g.languages) ? g.languages.join(', ') : '' })}>Edit</button>
                      <button className="btn btn-danger" onClick={() => remove(g._id)}>Delete</button>
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
            <h3>Edit Guide</h3>
            <div className="form-row">
              <div className="field"><label>Name</label><input value={editing.name} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} /></div>
              <div className="field"><label>Guide Contact Number</label><input value={editing.contactNumber || ''} onChange={e => setEditing(p => ({ ...p, contactNumber: e.target.value }))} /></div>
              <div className="field"><label>Experience</label><input value={editing.experience || ''} onChange={e => setEditing(p => ({ ...p, experience: e.target.value }))} /></div>
              <div className="field"><label>Languages</label><input value={editing.languages || ''} onChange={e => setEditing(p => ({ ...p, languages: e.target.value }))} /></div>
              <div className="field"><label>Price</label><input type="number" value={editing.pricePerDay} onChange={e => setEditing(p => ({ ...p, pricePerDay: e.target.value }))} /></div>
              <div className="field">
                <label>Assigned Place</label>
                <select value={editing.placeId || ''} onChange={e => setEditing(p => ({ ...p, placeId: e.target.value }))}>
                  <option value="">Select place</option>
                  {places.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Availability</label>
                <select value={String(editing.availability)} onChange={e => setEditing(p => ({ ...p, availability: e.target.value === 'true' }))}>
                  <option value="true">Available</option>
                  <option value="false">Unavailable</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={update}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
