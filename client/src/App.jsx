import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { usePlayer } from "./context/PlayerContext";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ListenerProfile from "./pages/ListenerProfile";
import ListenerPublic from "./pages/ListenerPublic";
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
import ArtistsPerspective from "./pages/ArtistsPerspective";
import ListenerPlaylistsPage from "./pages/ListenerPlaylist";
import ArtistUpload from "./pages/ArtistUpload";
import UploadSong from "./pages/UploadSong";
import CreateAlbum from "./pages/CreateAlbum";
import RequireArtist from "./components/Auth/RequireArtist";
import SearchResults from "./pages/SearchResults";
import PlaylistPage from "./pages/PlaylistPage";
import PlaylistView from "./pages/PlaylistView";
import Playlists from "./pages/Playlists";
import MyAds from "./pages/MyAds";
import MySongs from "./pages/MySongs";
import MyAlbums from "./pages/MyAlbums";
import ArtistAnalytics from "./pages/ArtistAnalytics";
import ListenerAnalytics from "./pages/ListenerAnalytics";
import AdminReportReview from "./pages/AdminReportReview";
import AdminHome from "./pages/AdminHome";
import RequireAdmin from "./components/Auth/RequireAdmin";
import AlbumView from "./pages/AlbumView";
import AdminRevenueReport from "./pages/AdminRevenueReport"; 
import AdminSongPerformance from "./pages/AdminSongPerformance";
import AdminUserManagement from "./pages/AdminUserManagement";

import { PlayerProvider } from "./context/PlayerContext";
import { FavoritesPinsProvider } from "./context/FavoritesPinsContext";
import { AchievementProvider } from "./context/AchievementContext";
import MusicPlayBar from "./components/MusicPlayBar/MusicPlayBar";
import Toasts from "./components/Toasts/Toasts";
import ToggleBarButton from "./components/ToggleBarButton/ToggleBarButton";


function AppContent() {
  const location = useLocation();
  const [isBarMinimized, setIsBarMinimized] = useState(false);
  const { current } = usePlayer();
  const hidePlaybar = ['/login', '/register', '/account-type'].includes(location.pathname);
  const showPlayer = current && !hidePlaybar;

  return (
    <>
      <Routes>
          {/* Redirect root to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register/select" element={<AccountType />} />
          <Route path="/artist-dashboard" element={<ArtistsPerspective />} />

          {/* Admin Routes */}
          <Route path="report-review" element={<RequireAdmin><AdminReportReview /></RequireAdmin>} />
          <Route path="admin-home" element={<RequireAdmin><AdminHome /></RequireAdmin>} />
          <Route path="/admin/reports/songs" element={<RequireAdmin><AdminSongPerformance /></RequireAdmin>} />
          <Route path="/admin/reports/revenue" element={<RequireAdmin><AdminRevenueReport /></RequireAdmin>} />
          <Route path="/admin/listeners" element={<RequireAdmin><AdminUserManagement /></RequireAdmin>} />

          {/* Listener routes */}
          <Route path="/profile" element={<ListenerProfile />} />
          <Route path="/home" element={<ListenerHome />} />
          <Route path="/user-report" element={<UserReport />} />
          <Route path="/likedsongs" element={<LikedSong />} />
          <Route path="/me/playlists" element={<MyPlaylistsPage />} />
          <Route path="/playlist/:id" element={<PlaylistPage />} />
          <Route path="/listeners/:id/playlists" element={<ListenerPlaylistsPage />} />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/listeners/:id/follows" element={<FollowsPage />} />
          <Route path="/buy-ads" element={<BuyAds />} />
          <Route path="/edit-profile" element={<EditProfile />} />
          <Route path="/playlists" element={<Playlists />} />
          <Route path="/my-ads" element={<MyAds />} />
          <Route path="/listener-analytics" element={<ListenerAnalytics />} />
          <Route path="/follows" element={<FollowsPage />} />

          {/* Artist routes */}
          <Route path="/artist/:artistId" element={<ArtistView />} />
          <Route path="/upload" element={<Navigate to="/upload/song" replace />} />
          <Route path="/upload/song" element={<RequireArtist><UploadSong /></RequireArtist>} />
          <Route path="/upload/album" element={<RequireArtist><CreateAlbum /></RequireArtist>} />
          <Route path="/artist-analytics" element={<ArtistAnalytics />} />
          <Route path="/my-songs" element={<RequireArtist><MySongs /></RequireArtist>} />
          <Route path="/my-albums" element={<RequireArtist><MyAlbums /></RequireArtist>} />
          
          {/* Public listener profile (search links point to /listeners/:id) */}
          <Route path="/listeners/:id" element={<ListenerPublic />} />

          {/* Album view route */}
          <Route path="/albums/:id" element={<AlbumView />} />

          {/* Song routes */}
          <Route path="/song" element={<Song />} />
          <Route path="/genres/:genreId" element={<Song />} />
          <Route path="/genre/:genreId" element={<Song />} />

          {/* Search routes */}
          <Route path="/search" element={<SearchResults />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
      <Toasts />

      {showPlayer && !isBarMinimized && (
        <MusicPlayBar />
      )}

      {showPlayer && (
        <ToggleBarButton
          isMinimized={isBarMinimized}
          onClick={() => setIsBarMinimized(v => !v)}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <AchievementProvider>
      <PlayerProvider>
        <FavoritesPinsProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </FavoritesPinsProvider>
      </PlayerProvider>
    </AchievementProvider>
  );
}
