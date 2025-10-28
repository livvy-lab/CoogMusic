import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ListenerProfile from "./pages/ListenerProfile";
import ListenerHome from "./pages/ListenerHome";
import UserReport from "./pages/UserReport";
import ArtistView from "./pages/ArtistView";
import Song from "./pages/Songs";
import LikedSong from "./pages/LikedPage";
import MyPlaylistsPage from "./pages/PersonalPlaylist";
import Subscription from "./pages/Subscription";
import FollowsPage from "./pages/FollowsPage";
import BuyAds from "./pages/BuyAds";
import EditProfile from "./pages/EditProfile";
import AccountType from "./pages/Auth/AccountType";
import ListenerPlaylistsPage from "./pages/ListenerPlaylist";
import ArtistUpload from "./pages/ArtistUpload";
import PlaylistPage from "./pages/PlaylistPage";
import PlaylistView from "./pages/PlaylistView";
import Playlists from "./pages/Playlists";


import { PlayerProvider } from "./context/PlayerContext";
import MusicPlayBar from "./components/MusicPlayBar/MusicPlayBar";

export default function App() {
  return (
    <PlayerProvider>
      <BrowserRouter>
        <Routes>
          {/* Redirect root to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register/select" element={<AccountType />} />

          {/* Listener routes */}
          <Route path="/profile" element={<ListenerProfile />} />
          <Route path="/home" element={<ListenerHome />} />
          <Route path="/user-report" element={<UserReport />} />
          <Route path="/likedsongs" element={<LikedSong />} />
          <Route path="/me/playlists" element={<MyPlaylistsPage />} />
          <Route path="/listeners/:id/playlists" element={<ListenerPlaylistsPage />} />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/follows" element={<FollowsPage />} />
          <Route path="/buy-ads" element={<BuyAds />} />
          <Route path="/edit-profile" element={<EditProfile />} />

          {/* Artist routes */}
          <Route path="/artist/:artistId" element={<ArtistView />} />
          <Route path="/upload" element={<ArtistUpload />} />

          {/* Song routes */}
          <Route path="/song" element={<Song />} />
          <Route path="/genres/:genreId" element={<Song />} />
          <Route path="/genre/:genreId" element={<Song />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </BrowserRouter>

      <MusicPlayBar />
    </PlayerProvider>
  );
}
