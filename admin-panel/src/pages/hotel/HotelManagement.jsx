import { useEffect, useState, useCallback } from 'react'
import api from '../../api/axios'
import Toast from '../../../components/Toast'

const EMPTY = { name: '', location: '', phone: '', description: '', images: [] }

const readFileAsDataUrl = file =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })


  
export default function HotelManagement() {
  const [hotels, setHotels] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const notify = (message, type = 'success') => setToast({ message, type })

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/hotels/mine')
      setHotels(data)
    } catch {
      notify('Failed to load hotels', 'error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const appendImageFilesToForm = async files => {
    const picked = Array.from(files || []).filter(f => f?.type?.startsWith('image/'))
    if (!picked.length) return
    setUploading(true)
    try {
      const dataUrls = await Promise.all(picked.map(readFileAsDataUrl))
      setForm(prev => ({ ...prev, images: [...prev.images, ...dataUrls] }))
      notify(`${dataUrls.length} image(s) added`)
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
      notify(`${dataUrls.length} image(s) added`)
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
    if (!form.name || !form.location) return notify('Name & location required', 'error')
    setLoading(true)
    try {
      await api.post('/hotels', { ...form, images: form.images || [] })
      setForm(EMPTY)
      await load()
      notify('Hotel created successfully')
    } catch {
      notify('Failed to create hotel', 'error')
    }
    setLoading(false)
  }

  const update = async () => {
    setLoading(true)
    try {
      await api.put(`/hotels/${editing._id}`, { ...editing, images: editing.images || [] })
      setEditing(null)
      await load()
      notify('Hotel updated')
    } catch {
      notify('Update failed', 'error')
    }
    setLoading(false)
  }

  const remove = async id => {
    if (!confirm('Delete this hotel?')) return
    try {
      await api.delete(`/hotels/${id}`)
      await load()
      notify('Hotel deleted')
    } catch {
      notify('Delete failed', 'error')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Hotels</div>
        <div className="page-sub">Manage your hotel & villa listings</div>
      </div>

      <div className="form-card">
        <h3>Add New Hotel</h3>
        <div className="form-row">
          <div className="field">
            <label>Hotel Name</label>
            <input placeholder="e.g. Ocean View Resort" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div className="field">
            <label>Location</label>
            <input placeholder="e.g. Colombo, Sri Lanka" value={form.location} onChange={e => set('location', e.target.value)} />
          </div>
          <div className="field">
            <label>Hotel Phone Number</label>
            <input placeholder="e.g. +94 77 123 4567" value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label>Description</label>
            <textarea placeholder="Describe the property..." value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label>Hotel Images (optional)</label>
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                appendImageFilesToForm(e.dataTransfer.files)
              }}
              style={{ border: '2px dashed var(--line)', borderRadius: 10, padding: 12, marginBottom: 8, color: 'var(--muted)' }}
            >
              Drag and drop images here or choose files
              <div style={{ marginTop: 8 }}>
                <input type="file" accept="image/*" multiple onChange={e => appendImageFilesToForm(e.target.files)} />
              </div>
            </div>
            {form.images?.length ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {form.images.map((img, idx) => (
                  <div key={`${idx}-${img.slice(0, 16)}`} style={{ position: 'relative' }}>
                    <img src={img} alt={`hotel-${idx}`} style={{ width: 92, height: 68, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--line)' }} />
                    <button className="btn btn-danger" style={{ padding: '2px 8px', marginTop: 6 }} onClick={() => removeFormImage(idx)}>Remove</button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <button className="btn btn-primary" onClick={create} disabled={loading || uploading}>
          {loading || uploading ? '...' : '+ Add Hotel'}
        </button>
      </div>

      <div className="table-card">
        <div className="table-header">
          <span className="table-title">All Hotels</span>
          <span className="count-badge">{hotels.length} total</span>
        </div>
        {hotels.length === 0 ? (
          <div className="empty-state">No hotels yet. Add your first listing above.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Location</th>
                <th>Description</th>
                <th>Phone</th>
                <th>Images</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {hotels.map(h => (
                <tr key={h._id}>
                  <td><strong>{h.name}</strong></td>
                  <td><span className="badge badge-blue">{h.location}</span></td>
                  <td style={{ color: 'var(--muted)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {h.description || '-'}
                  </td>
                  <td style={{ color: 'var(--muted)' }}>{h.phone || '-'}</td>
                  <td>{Array.isArray(h.images) ? h.images.length : 0}</td>
                  <td style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 12 }}>{new Date(h.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="actions">
                      <button className="btn btn-ghost" onClick={() => setEditing({ ...h, images: Array.isArray(h.images) ? h.images : [] })}>Edit</button>
                      <button className="btn btn-danger" onClick={() => remove(h._id)}>Delete</button>
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
            <h3>Edit Hotel</h3>
            <div className="form-row">
              <div className="field">
                <label>Name</label>
                <input value={editing.name} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="field">
                <label>Location</label>
                <input value={editing.location} onChange={e => setEditing(p => ({ ...p, location: e.target.value }))} />
              </div>
              <div className="field">
                <label>Phone</label>
                <input placeholder="e.g. +94 77 123 4567" value={editing.phone || ''} onChange={e => setEditing(p => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>
            <div className="field">
              <label>Description</label>
              <textarea value={editing.description} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="field">
              <label>Hotel Images</label>
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  appendImageFilesToEditing(e.dataTransfer.files)
                }}
                style={{ border: '2px dashed var(--line)', borderRadius: 10, padding: 12, marginBottom: 8, color: 'var(--muted)' }}
              >
                Drag and drop images here or choose files
                <div style={{ marginTop: 8 }}>
                  <input type="file" accept="image/*" multiple onChange={e => appendImageFilesToEditing(e.target.files)} />
                </div>
              </div>
              {editing.images?.length ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {editing.images.map((img, idx) => (
                    <div key={`${idx}-${img.slice(0, 16)}`} style={{ position: 'relative' }}>
                      <img src={img} alt={`hotel-edit-${idx}`} style={{ width: 92, height: 68, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--line)' }} />
                      <button className="btn btn-danger" style={{ padding: '2px 8px', marginTop: 6 }} onClick={() => removeEditImage(idx)}>Remove</button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={update} disabled={loading || uploading}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
