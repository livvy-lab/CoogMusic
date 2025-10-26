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
        <Route path="/artist" element={<ArtistView/>} />
        <Route path="/song" element={<Song/>} />
        <Route path="/likedsongs" element={<LikedSong/>}/>
        <Route path="/playlist" element={<Playlist/>}/>
        <Route path="/subscription" element={<Subscription/>}/>
        <Route path="/follows" element={<FollowsPage/>}/>
        <Route path="/buy-ads" element={<BuyAds/>}/>
      </Routes>
    </BrowserRouter>
  );
}