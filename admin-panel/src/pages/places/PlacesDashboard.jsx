import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../../api/axios'

export default function PlacesDashboard() {
  const [places, setPlaces] = useState([])

  const load = useCallback(async () => {
    const { data } = await api.get('/places')
    setPlaces(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => {
    load().catch(() => {})
  }, [load])

  const stats = useMemo(() => {
    const categories = new Set(places.map(p => String(p.category || '').trim()).filter(Boolean))
    const locations = new Set(places.map(p => String(p.location || '').trim()).filter(Boolean))
    return {
      totalPlaces: places.length,
      categories: categories.size,
      locations: locations.size,
    }
  }, [places])

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Places Dashboard</div>
        <div className="page-sub">Tourist places explorer overview</div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Total Places</div>
          <div className="stat-value blue">{stats.totalPlaces}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Categories</div>
          <div className="stat-value purple">{stats.categories}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Locations</div>
          <div className="stat-value green">{stats.locations}</div>
        </div>
      </div>
    </div>
  )
}
