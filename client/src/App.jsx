import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ListenerProfile from "./pages/ListenerProfile";
import ListenerHome from "./pages/ListenerHome";
import UserReport from "./pages/UserReport";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login/>} />
        <Route path="/register" element={<Register/>} />
        <Route path="/profile" element={<ListenerProfile/>} />
        <Route path="/home" element={<ListenerHome/>} />
        <Route path="/user-report" element={<UserReport/>} />
      </Routes>
    </BrowserRouter>
  );
}
