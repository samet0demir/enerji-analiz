import './App.css'
import EnergyDashboard from './components/EnergyDashboard'

function App() {
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
              <p className="header-stat-value">17</p>
              <p className="header-stat-label">Toplam Kayıt</p>
            </div>
            <div className="header-stat">
              <p className="header-stat-value">Aktif</p>
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
