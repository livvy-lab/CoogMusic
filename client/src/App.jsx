import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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

import { PlayerProvider } from "./context/PlayerContext";
import { FavoritesPinsProvider } from "./context/FavoritesPinsContext"; // ✅ add this
import MusicPlayBar from "./components/MusicPlayBar/MusicPlayBar";

export default function App() {
  return (
    <PlayerProvider>
      <FavoritesPinsProvider>
        <BrowserRouter>
          <Routes>
            {/* Redirect root to login */}
            <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register/select" element={<AccountType />} />
        <Route path="/artist-dashboard" element={<ArtistsPerspective />} />

        {/* Listener routes */}
        <Route path="/profile" element={<ListenerProfile />} />
        <Route path="/home" element={<ListenerHome />} />
        <Route path="/user-report" element={<UserReport />} />
        <Route path="/likedsongs" element={<PlaylistView isLikedSongs={true} />} />
        <Route path="/me/playlists" element={<MyPlaylistsPage />} />
        <Route path="/playlist/:id" element={<PlaylistPage />} />
        <Route path="/listeners/:id/playlists" element={<ListenerPlaylistsPage />} />
        <Route path="/subscription" element={<Subscription />} />
        <Route path="/follows" element={<FollowsPage />} />
        <Route path="/buy-ads" element={<BuyAds />} />
        <Route path="/edit-profile" element={<EditProfile />} />
        <Route path="/playlists" element={<Playlists />} />
        <Route path="/my-ads" element={<MyAds />} />

          {/* Artist routes */}
          <Route path="/artist/:artistId" element={<ArtistView />} />
          <Route path="/upload" element={<Navigate to="/upload/song" replace />} />
          <Route path="/upload/song" element={<RequireArtist><UploadSong /></RequireArtist>} />
          <Route path="/upload/album" element={<RequireArtist><CreateAlbum /></RequireArtist>} />

            {/* Public listener profile (search links point to /listeners/:id) */}
            <Route path="/listeners/:id" element={<ListenerPublic />} />

            {/* Song routes */}
            <Route path="/song" element={<Song />} />
            <Route path="/genres/:genreId" element={<Song />} />
            <Route path="/genre/:genreId" element={<Song />} />

          {/* Search routes */}
          <Route path="/search" element={<SearchResults />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </BrowserRouter>

        <MusicPlayBar />
      </FavoritesPinsProvider>
    </PlayerProvider>
  );
}
