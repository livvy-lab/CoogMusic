import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
<<<<<<< HEAD
import App from "./App.jsx";
=======
import AlbumPage from "./pages/AlbumPage.jsx";
>>>>>>> ba959b9 (fixing formatting)
import "./index.css";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ListenerProfile from "./pages/ListenerProfile";
import ListenerHome from "./pages/ListenerHome";
import UserReport from "./pages/UserReport";
import ArtistView from "./pages/ArtistView"; 

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login/>} />
        <Route path="/register" element={<Register/>} />
        <Route path="/profile" element={<ListenerProfile/>} />
        <Route path="/home" element={<ListenerHome/>} />
        <Route path="/user-report" element={<UserReport/>} />
        <Route path= "/artist" element={<ArtistView/>} />
        <Route path="/album" element={<AlbumPage/>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
