import { AdminAuthProvider } from './context/AdminAuthContext';
import AppRouter from './router';

export default function App() {
  return (
    <AdminAuthProvider>
      <AppRouter />
    </AdminAuthProvider>
  );
}
