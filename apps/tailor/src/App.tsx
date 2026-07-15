import { BrowserRouter } from 'react-router-dom'
import { ArtisanProvider } from './context/ArtisanContext'
import AppRoutes from './routes'

export default function App() {
  return (
    <BrowserRouter>
      <ArtisanProvider>
        <AppRoutes />
      </ArtisanProvider>
    </BrowserRouter>
  )
}
