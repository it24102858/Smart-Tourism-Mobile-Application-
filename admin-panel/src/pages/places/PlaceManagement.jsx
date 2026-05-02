import { useCallback, useEffect, useState } from 'react'
import api from '../../api/axios'
import Toast from '../../../components/Toast'

const EMPTY = {
  name: '',
  location: '',
  description: '',
  openingHours: '',
  entryFee: '',
  contactNumber: '',
  images: [],
}

const readFileAsDataUrl = file =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })

export default function PlaceManagement() {
  const [places, setPlaces] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [toast, setToast] = useState(null)
  const [uploading, setUploading] = useState(false)

  const notify = (message, type = 'success') => setToast({ message, type })

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/places')
      setPlaces(Array.isArray(data) ? data : [])
    } catch {
      notify('Failed to load places', 'error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const validatePlace = payload => {
    if (!String(payload?.name || '').trim()) return 'Place name is required'
    if (!String(payload?.location || '').trim()) return 'Location is required'
    if (!String(payload?.description || '').trim()) return 'Description is required'
    if (!String(payload?.contactNumber || '').trim()) return 'Contact number is required'
    const contactDigits = String(payload.contactNumber).replace(/\D/g, '')
    if (contactDigits.length < 10) return 'Contact number must be at least 10 digits'
    return null
  }

  const addImages = async files => {
    const picked = Array.from(files || []).filter(f => f?.type?.startsWith('image/'))
    if (!picked.length) return
    setUploading(true)
    try {
      const dataUrls = await Promise.all(picked.map(readFileAsDataUrl))
      setForm(prev => ({ ...prev, images: [...prev.images, ...dataUrls] }))
    } catch {
      notify('Failed to add images', 'error')
    }
    setUploading(false)
  }

  const addEditImages = async files => {
    const picked = Array.from(files || []).filter(f => f?.type?.startsWith('image/'))
    if (!picked.length) return
    setUploading(true)
    try {
      const dataUrls = await Promise.all(picked.map(readFileAsDataUrl))
      setEditing(prev => ({ ...prev, images: [...(prev.images || []), ...dataUrls] }))
    } catch {
      notify('Failed to add images', 'error')
    }
    setUploading(false)
  }

  const create = async () => {
    const error = validatePlace(form)
    if (error) return notify(error, 'error')
    try {
      await api.post('/places', form)
      setForm(EMPTY)
      await load()
      notify('Place created')
    } catch (err) {
      notify(err.response?.data?.message || 'Create failed', 'error')
    }
  }

  const update = async () => {
    const error = validatePlace(editing)
    if (error) return notify(error, 'error')
    try {
      await api.put(`/places/${editing._id}`, editing)
      setEditing(null)
      await load()
      notify('Place updated')
    } catch (err) {
      notify(err.response?.data?.message || 'Update failed', 'error')
    }
  }

  const remove = async id => {
    if (!confirm('Delete this place?')) return
    try {
      await api.delete(`/places/${id}`)
      await load()
      notify('Place deleted')
    } catch (err) {
      notify(err.response?.data?.message || 'Delete failed', 'error')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Place Management</div>
        <div className="page-sub">Create, edit, and delete tourist places</div>
      </div>

      <div className="form-card">
        <h3>Add Place</h3>
        <div className="form-row">
          <div className="field"><label>Name</label><input value={form.name} onChange={e => set('name', e.target.value)} /></div>
          <div className="field"><label>Location</label><input value={form.location} onChange={e => set('location', e.target.value)} /></div>
          <div className="field"><label>Opening Hours</label><input value={form.openingHours} onChange={e => set('openingHours', e.target.value)} /></div>
          <div className="field"><label>Entry Fee</label><input value={form.entryFee} onChange={e => set('entryFee', e.target.value)} /></div>
          <div className="field"><label>Contact Number</label><input value={form.contactNumber} onChange={e => set('contactNumber', e.target.value)} /></div>
        </div>
        <div className="field">
          <label>Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
        <div className="field">
          <label>Images</label>
          <input type="file" accept="image/*" multiple onChange={e => addImages(e.target.files)} />
        </div>
        <button className="btn btn-primary" onClick={create} disabled={uploading}>+ Add Place</button>
      </div>

      <div className="table-card">
        <div className="table-header">
          <span className="table-title">All Places</span>
          <span className="count-badge">{places.length} total</span>
        </div>
        {places.length === 0 ? (
          <div className="empty-state">No places yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Location</th>
                <th>Contact</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {places.map(p => (
                <tr key={p._id}>
                  <td>{p.name}</td>
                  <td>{p.location}</td>
                  <td>{p.contactNumber || '-'}</td>
                  <td>
                    <div className="actions">
                      <button className="btn btn-ghost" onClick={() => setEditing({ ...p, images: Array.isArray(p.images) ? p.images : [] })}>Edit</button>
                      <button className="btn btn-danger" onClick={() => remove(p._id)}>Delete</button>
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
            <h3>Edit Place</h3>
            <div className="form-row">
              <div className="field"><label>Name</label><input value={editing.name} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} /></div>
              <div className="field"><label>Location</label><input value={editing.location} onChange={e => setEditing(p => ({ ...p, location: e.target.value }))} /></div>
              <div className="field"><label>Contact</label><input value={editing.contactNumber || ''} onChange={e => setEditing(p => ({ ...p, contactNumber: e.target.value }))} /></div>
            </div>
            <div className="field">
              <label>Description</label>
              <textarea value={editing.description || ''} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="field">
              <label>Images</label>
              <input type="file" accept="image/*" multiple onChange={e => addEditImages(e.target.files)} />
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
