import { useCallback, useEffect, useState } from 'react'
import api from '../../api/axios'
import Toast from '../../../components/Toast'

const EMPTY = { name: '', type: '', serviceCompanyName: '', serviceCompanyPhone: '', pricePerDay: '', seatCount: '', acType: 'ac', description: '', availability: true, driverName: '', images: [] }

const readFileAsDataUrl = file =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })

export default function VehicleManagement() {
  const [vehicles, setVehicles] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [toast, setToast] = useState(null)
  const [uploading, setUploading] = useState(false)

  const notify = (message, type = 'success') => setToast({ message, type })

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/transport')
      setVehicles(Array.isArray(data) ? data : [])
    } catch {
      notify('Failed to load vehicles', 'error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const appendImageFilesToForm = async files => {
    const picked = Array.from(files || []).filter(f => f?.type?.startsWith('image/'))
    if (!picked.length) return
    setUploading(true)
    try {
      const dataUrls = await Promise.all(picked.map(readFileAsDataUrl))
      setForm(prev => ({ ...prev, images: [...prev.images, ...dataUrls] }))
    } catch {
      notify('Failed to add selected image files', 'error')
    }
    setUploading(false)
  }

  const appendImageFilesToEditing = async files => {
    const picked = Array.from(files || []).filter(f => f?.type?.startsWith('image/'))
    if (!picked.length) return
    setUploading(true)
    try {
      const dataUrls = await Promise.all(picked.map(readFileAsDataUrl))
      setEditing(prev => ({ ...prev, images: [...(prev.images || []), ...dataUrls] }))
    } catch {
      notify('Failed to add selected image files', 'error')
    }
    setUploading(false)
  }

  const removeFormImage = index => {
    setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }))
  }

  const removeEditImage = index => {
    setEditing(prev => ({ ...prev, images: (prev.images || []).filter((_, i) => i !== index) }))
  }

  const create = async () => {
    try {
      await api.post('/transport', { ...form, pricePerDay: Number(form.pricePerDay), seatCount: Number(form.seatCount || 0), images: form.images || [] })
      setForm(EMPTY)
      load()
      notify('Vehicle added')
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to add vehicle', 'error')
    }
  }

  const update = async () => {
    try {
      await api.put(`/transport/${editing._id}`, { ...editing, pricePerDay: Number(editing.pricePerDay), seatCount: Number(editing.seatCount || 0), images: editing.images || [] })
      setEditing(null)
      load()
      notify('Vehicle updated')
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to update vehicle', 'error')
    }
  }

  const remove = async id => {
    if (!confirm('Delete this vehicle?')) return
    try {
      await api.delete(`/transport/${id}`)
      load()
      notify('Vehicle deleted')
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to delete vehicle', 'error')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Vehicles</div>
        <div className="page-sub">Create and manage transport vehicles</div>
      </div>

      <div className="form-card">
        <h3>Add Vehicle</h3>
        <div className="form-row">
          <div className="field">
            <label>Service Company Name</label>
            <input value={form.serviceCompanyName} onChange={e => set('serviceCompanyName', e.target.value)} />
          </div>
          <div className="field">
            <label>Vehicle Name</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div className="field">
            <label>Type</label>
            <input value={form.type} onChange={e => set('type', e.target.value)} />
          </div>
          <div className="field">
            <label>Service Company Phone</label>
            <input value={form.serviceCompanyPhone} onChange={e => set('serviceCompanyPhone', e.target.value)} />
          </div>
          <div className="field">
            <label>Price Per Day</label>
            <input type="number" value={form.pricePerDay} onChange={e => set('pricePerDay', e.target.value)} />
          </div>
          <div className="field">
            <label>Driver Name</label>
            <input value={form.driverName} onChange={e => set('driverName', e.target.value)} />
          </div>
          <div className="field">
            <label>Seat Count</label>
            <input type="number" min="1" value={form.seatCount} onChange={e => set('seatCount', e.target.value)} />
          </div>
          <div className="field">
            <label>AC Type</label>
            <select value={String(form.acType)} onChange={e => set('acType', e.target.value)}>
              <option value="ac">AC</option>
              <option value="non_ac">Non-AC</option>
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
        <div className="form-row">
          <div className="field">
            <label>Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label>Vehicle Photos (optional)</label>
            <input type="file" accept="image/*" multiple onChange={e => appendImageFilesToForm(e.target.files)} />
            {form.images?.length ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {form.images.map((img, idx) => (
                  <div key={`${idx}-${img.slice(0, 12)}`}>
                    <img src={img} alt={`vehicle-${idx}`} style={{ width: 88, height: 66, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--line)' }} />
                    <button className="btn btn-danger" style={{ padding: '2px 8px', marginTop: 6 }} onClick={() => removeFormImage(idx)}>Remove</button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <button className="btn btn-primary" onClick={create} disabled={uploading}>+ Add Vehicle</button>
      </div>

      <div className="table-card">
        <div className="table-header">
          <span className="table-title">All Vehicles</span>
          <span className="count-badge">{vehicles.length} total</span>
        </div>
        {vehicles.length === 0 ? (
          <div className="empty-state">No vehicles yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Vehicle</th>
                <th>Type</th>
                <th>Company Phone</th>
                <th>Price/Day</th>
                <th>Seats</th>
                <th>AC</th>
                <th>Driver</th>
                <th>Description</th>
                <th>Photos</th>
                <th>Availability</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(v => (
                <tr key={v._id}>
                  <td><strong style={{ color: '#b00020' }}>{v.serviceCompanyName || '-'}</strong></td>
                  <td>{v.name}</td>
                  <td>{v.type}</td>
                  <td>{v.serviceCompanyPhone || '-'}</td>
                  <td>{v.pricePerDay}</td>
                  <td>{v.seatCount}</td>
                  <td>{v.acType === 'ac' ? 'AC' : 'Non-AC'}</td>
                  <td>{v.driverName}</td>
                  <td style={{ maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.description || '-'}</td>
                  <td>{Array.isArray(v.images) ? v.images.length : 0}</td>
                  <td>{v.isBooked ? 'Booked' : (v.availability ? 'Available' : 'Unavailable')}</td>
                  <td>
                    <div className="actions">
                      <button className="btn btn-ghost" onClick={() => setEditing({ ...v, images: Array.isArray(v.images) ? v.images : [] })}>Edit</button>
                      <button className="btn btn-danger" onClick={() => remove(v._id)}>Delete</button>
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
            <h3>Edit Vehicle</h3>
            <div className="form-row">
              <div className="field"><label>Service Company</label><input value={editing.serviceCompanyName || ''} onChange={e => setEditing(p => ({ ...p, serviceCompanyName: e.target.value }))} /></div>
              <div className="field"><label>Vehicle Name</label><input value={editing.name} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} /></div>
              <div className="field"><label>Type</label><input value={editing.type} onChange={e => setEditing(p => ({ ...p, type: e.target.value }))} /></div>
              <div className="field"><label>Company Phone</label><input value={editing.serviceCompanyPhone || ''} onChange={e => setEditing(p => ({ ...p, serviceCompanyPhone: e.target.value }))} /></div>
              <div className="field"><label>Price</label><input type="number" value={editing.pricePerDay} onChange={e => setEditing(p => ({ ...p, pricePerDay: e.target.value }))} /></div>
              <div className="field"><label>Driver</label><input value={editing.driverName} onChange={e => setEditing(p => ({ ...p, driverName: e.target.value }))} /></div>
              <div className="field"><label>Seats</label><input type="number" min="1" value={editing.seatCount || ''} onChange={e => setEditing(p => ({ ...p, seatCount: e.target.value }))} /></div>
              <div className="field">
                <label>AC Type</label>
                <select value={String(editing.acType || 'ac')} onChange={e => setEditing(p => ({ ...p, acType: e.target.value }))}>
                  <option value="ac">AC</option>
                  <option value="non_ac">Non-AC</option>
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
            <div className="field">
              <label>Description</label>
              <textarea value={editing.description || ''} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="field">
              <label>Vehicle Photos</label>
              <input type="file" accept="image/*" multiple onChange={e => appendImageFilesToEditing(e.target.files)} />
              {editing.images?.length ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {editing.images.map((img, idx) => (
                    <div key={`${idx}-${img.slice(0, 12)}`}>
                      <img src={img} alt={`vehicle-edit-${idx}`} style={{ width: 88, height: 66, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--line)' }} />
                      <button className="btn btn-danger" style={{ padding: '2px 8px', marginTop: 6 }} onClick={() => removeEditImage(idx)}>Remove</button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={update} disabled={uploading}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
