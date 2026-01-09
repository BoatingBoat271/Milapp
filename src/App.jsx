import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import MapView from './components/MapViewGoogle'
import PetProfile from './components/PetProfile'
import Community from './components/Community'
import Navbar from './components/Navbar'
import Login from './components/Login'
import UserProfile from './components/UserProfile'
import AdminPanel from './components/AdminPanel'
import MembersList from './components/MembersList'
import PetsList from './components/PetsList'

function Layout({ children }) {
  return (
    <div className="h-screen flex flex-col">
      <Navbar />
      {children}
    </div>
  )
}

function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout><MapView /></Layout>} />
        <Route path="/pets" element={<Layout><PetsList /></Layout>} />
        <Route path="/pet/:id" element={<Layout><PetProfile /></Layout>} />
        <Route path="/community" element={<Layout><Community /></Layout>} />
        <Route path="/profile" element={<Layout><UserProfile /></Layout>} />
        <Route path="/admin" element={<Layout><AdminPanel userId={localStorage.getItem('userId')} /></Layout>} />
        <Route path="/members" element={<Layout><MembersList userId={localStorage.getItem('userId')} /></Layout>} />
      </Routes>
    </Router>
  )
}

export default App
