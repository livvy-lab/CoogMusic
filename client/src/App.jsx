import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ListenerProfile from "./pages/ListenerProfile";
import ListenerHome from "./pages/ListenerHome";
import UserReport from "./pages/UserReport";
import ArtistView from "./pages/ArtistView";
import Song from "./pages/Songs";
import LikedSong from "./pages/LikedPage";
import Playlist from "./pages/Playlist";
import Subscription from "./pages/Subscription";
import FollowsPage from "./pages/FollowsPage";
import BuyAds from "./pages/BuyAds";
import EditProfile from "./pages/EditProfile";
import AccountType from "./pages/Auth/AccountType";
import Genres from "./components/ListenerHome/Genres";
import ArtistUpload from "./pages/ArtistUpload";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register/select" element={<AccountType />} />

        {/* Listener routes */}
        <Route path="/home" element={<ListenerHome />} />
        <Route path="/profile" element={<ListenerProfile />} />
        <Route path="/user-report" element={<UserReport />} />
        <Route path="/likedsongs" element={<LikedSong />} />
        <Route path="/playlist" element={<Playlist />} />
        <Route path="/subscription" element={<Subscription />} />
        <Route path="/follows" element={<FollowsPage />} />
        <Route path="/buy-ads" element={<BuyAds />} />
        <Route path="/edit-profile" element={<EditProfile />} />

        {/* Artist routes */}
        <Route path="/artist" element={<ArtistView />} />
        <Route path="/upload" element={<ArtistUpload />} />

        {/* Song / Genre */}
        <Route path="/song" element={<Song />} />
        <Route path="/genres" element={<Genres />} />
        <Route path="/genre/:genreId" element={<Song />} />
        <Route path="/genres/:genreId" element={<Song />} />

        {/* Fallback */}
        <Route path="*" element={<div>404</div>} />
      </Routes>
    </BrowserRouter>
  );
}
