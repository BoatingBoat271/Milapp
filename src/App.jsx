import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import MapView from './components/MapView'
import PetProfile from './components/PetProfile'
import Community from './components/Community'
import Navbar from './components/Navbar'

function App() {
  return (
    <Router>
      <div className="h-screen flex flex-col">
        <Navbar />
        <Routes>
          <Route path="/" element={<MapView />} />
          <Route path="/pet/:id" element={<PetProfile />} />
          <Route path="/community" element={<Community />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
