import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { router } from './routes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e2a4a',
              color: '#e8e8e8',
              border: '1px solid #2a2a4a',
            },
            success: {
              iconTheme: {
                primary: '#06d6a0',
                secondary: '#1e2a4a',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef476f',
                secondary: '#1e2a4a',
              },
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
