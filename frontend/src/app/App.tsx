import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../auth/AuthProvider";
import { ToastContainer } from "../components/ui/Toast";
import { AppPreferencesProvider } from "../preferences/AppPreferencesProvider";
import { AppRoutes } from "./routes";

export function App() {
  return (
    <BrowserRouter basename="/app">
      <AuthProvider>
        <AppPreferencesProvider>
          <AppRoutes />
          <ToastContainer />
        </AppPreferencesProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
