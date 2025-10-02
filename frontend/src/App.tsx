import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'
import EnergyDashboard from './components/EnergyDashboard'

function App() {
  const [totalRecords, setTotalRecords] = useState<number | null>(null)
  const [apiStatus, setApiStatus] = useState<string>('Yükleniyor...')

  const API_BASE_URL = 'http://localhost:5003/api/v1'

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/energy/stats`)
        setTotalRecords(response.data.stats.totalRecords || 0)
        setApiStatus('Aktif')
      } catch (error) {
        console.error('Header stats fetch error:', error)
        setTotalRecords(0)
        setApiStatus('Hata')
      }
    }

    fetchStats()
    // Her 60 saniyede bir güncelle
    const interval = setInterval(fetchStats, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <div className="header-title">
            <div className="header-logo">⚡</div>
            <div className="header-info">
              <h1>Türkiye Enerji Analiz Platformu</h1>
              <p>Gerçek zamanlı enerji üretim verileri ve trend analizleri</p>
            </div>
          </div>
          <div className="header-stats">
            <div className="header-stat">
              <p className="header-stat-value">{totalRecords !== null ? totalRecords : '-'}</p>
              <p className="header-stat-label">Toplam Kayıt</p>
            </div>
            <div className="header-stat">
              <p className="header-stat-value">{apiStatus}</p>
              <p className="header-stat-label">EPİAŞ API</p>
            </div>
          </div>
        </div>
      </header>
      <main>
        <EnergyDashboard />
      </main>
    </div>
  )
}

export default App
