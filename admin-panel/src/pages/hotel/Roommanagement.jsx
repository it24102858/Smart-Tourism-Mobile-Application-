import { useEffect, useState, useCallback } from 'react'
import api from '../../api/axios'
import Toast from '../../../components/Toast'

const EMPTY = {
  hotelId: '',
  roomNumber: '',
  type: '',
  price: '',
  capacity: '',
  description: '',
  images: [],
  isBookedNow: false,
}


const readFileAsDataUrl = file =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })

export default function RoomManagement() {
  const [rooms, setRooms] = useState([])
  const [hotels, setHotels] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const notify = (message, type = 'success') => setToast({ message, type })
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

  const load = useCallback(async () => {
    try {
      const [rRes, hRes] = await Promise.all([api.get('/rooms/mine'), api.get('/hotels/mine')])
      setRooms(Array.isArray(rRes.data) ? rRes.data : [])
      setHotels(Array.isArray(hRes.data) ? hRes.data : [])
    } catch {
      notify('Failed to load data', 'error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const hotelName = id => hotels.find(h => h._id === id)?.name || '-'

  const create = async () => {
    if (!form.hotelId || !form.roomNumber || !form.type || !form.price) return notify('Hotel, room number, type and price required', 'error')
    setLoading(true)
    try {
      await api.post('/rooms', {
        hotelId: form.hotelId,
        roomNumber: form.roomNumber,
        type: form.type,
        price: form.price,
        capacity: form.capacity,
        description: form.description,
        images: form.images || [],
        isBookedNow: form.isBookedNow,
      })
      setForm(EMPTY)
      await load()
      notify('Room added')
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to add room', 'error')
    }
    setLoading(false)
  }

  const update = async () => {
    setLoading(true)
    try {
      await api.put(`/rooms/${editing._id}`, { ...editing, images: editing.images || [] })
      setEditing(null)
      await load()
      notify('Room updated')
    } catch (err) {
      notify(err.response?.data?.message || 'Update failed', 'error')
    }
    setLoading(false)
  }

  const remove = async id => {
    if (!confirm('Delete this room?')) return
    try {
      await api.delete(`/rooms/${id}`)
      await load()
      notify('Room deleted')
    } catch {
      notify('Delete failed', 'error')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Rooms</div>
        <div className="page-sub">Add room details, images and availability status</div>
      </div>

      <div className="form-card">
        <h3>Add New Room</h3>
        <div className="form-row">
          <div className="field">
            <label>Hotel</label>
            <select value={form.hotelId} onChange={e => set('hotelId', e.target.value)}>
              <option value="">Select hotel...</option>
              {hotels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Room Number</label>
            <input value={form.roomNumber} onChange={e => set('roomNumber', e.target.value)} placeholder="e.g. 101 / A-12" />
          </div>
          <div className="field">
            <label>Room Type</label>
            <input value={form.type} onChange={e => set('type', e.target.value)} />
          </div>
          <div className="field">
            <label>Price</label>
            <input type="number" value={form.price} onChange={e => set('price', e.target.value)} />
          </div>
          <div className="field">
            <label>Capacity</label>
            <input type="number" value={form.capacity} onChange={e => set('capacity', e.target.value)} />
          </div>
          <div className="field">
            <label>Availability</label>
            <select value={form.isBookedNow ? 'booked' : 'available'} onChange={e => set('isBookedNow', e.target.value === 'booked')}>
              <option value="available">Available</option>
              <option value="booked">Booked Now</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label>Description (optional)</label>
            <textarea placeholder="Room description for users..." value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label>Room Images (optional)</label>
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
                    <img src={img} alt={`room-${idx}`} style={{ width: 92, height: 68, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--line)' }} />
                    <button className="btn btn-danger" style={{ padding: '2px 8px', marginTop: 6 }} onClick={() => removeFormImage(idx)}>Remove</button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <button className="btn btn-primary" onClick={create} disabled={loading || uploading}>{loading || uploading ? '...' : 'Add Room'}</button>
      </div>

      <div className="table-card">
        <div className="table-header">
          <span className="table-title">All Rooms</span>
          <span className="count-badge">{rooms.length} total</span>
        </div>
        {rooms.length === 0 ? (
          <div className="empty-state">No rooms yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Hotel</th>
                <th>Room No.</th>
                <th>Type</th>
                <th>Price</th>
                <th>Capacity</th>
                <th>Images</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map(r => (
                <tr key={r._id}>
                  <td>{hotelName(r.hotelId)}</td>
                  <td>{r.roomNumber || '-'}</td>
                  <td>{r.type}</td>
                  <td>LKR {r.price}</td>
                  <td>{r.capacity || '-'}</td>
                  <td>{Array.isArray(r.images) ? r.images.length : 0}</td>
                  <td>{r.isBookedNow ? 'Booked Now' : 'Available'}</td>
                  <td>
                    <div className="actions">
                      <button className="btn btn-ghost" onClick={() => setEditing({ ...r, images: Array.isArray(r.images) ? r.images : [] })}>Edit</button>
                      <button className="btn btn-danger" onClick={() => remove(r._id)}>Delete</button>
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
            <h3>Edit Room</h3>
            <div className="form-row">
              <div className="field">
                <label>Room Number</label>
                <input value={editing.roomNumber || ''} onChange={e => setEditing(p => ({ ...p, roomNumber: e.target.value }))} />
              </div>
              <div className="field">
                <label>Type</label>
                <input value={editing.type} onChange={e => setEditing(p => ({ ...p, type: e.target.value }))} />
              </div>
              <div className="field">
                <label>Price</label>
                <input type="number" value={editing.price} onChange={e => setEditing(p => ({ ...p, price: e.target.value }))} />
              </div>
              <div className="field">
                <label>Capacity</label>
                <input type="number" value={editing.capacity} onChange={e => setEditing(p => ({ ...p, capacity: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Description</label>
                <textarea placeholder="Room description for users..." value={editing.description || ''} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Room Images</label>
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
                        <img src={img} alt={`room-edit-${idx}`} style={{ width: 92, height: 68, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--line)' }} />
                        <button className="btn btn-danger" style={{ padding: '2px 8px', marginTop: 6 }} onClick={() => removeEditImage(idx)}>Remove</button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Status</label>
                <select value={editing.isBookedNow ? 'booked' : 'available'} onChange={e => setEditing(p => ({ ...p, isBookedNow: e.target.value === 'booked' }))}>
                  <option value="available">Available</option>
                  <option value="booked">Booked Now</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={update} disabled={loading || uploading}>Save</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
