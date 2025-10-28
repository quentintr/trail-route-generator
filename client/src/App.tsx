import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import Home from './pages/Home'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { MyRoutes } from './pages/MyRoutes'
import { RouteDetails } from './pages/RouteDetails'
import Results from './pages/Results'

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes with layout */}
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/about" element={<Layout><div>À propos</div></Layout>} />
        
        {/* Auth routes without layout */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected routes with layout */}
        <Route path="/my-routes" element={<Layout><MyRoutes /></Layout>} />
        <Route path="/routes/:id" element={<Layout><RouteDetails /></Layout>} />
        <Route path="/routes/results" element={<Layout><Results routes={[]} /></Layout>} />
        
        {/* 404 route */}
        <Route path="*" element={<Layout><div>Page non trouvée</div></Layout>} />
      </Routes>
    </Router>
  )
}

export default App
