import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SellerProvider } from './context/SellerContext'
import AppRoutes from './routes'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SellerProvider>
          <AppRoutes />
        </SellerProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
