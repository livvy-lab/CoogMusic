import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./NavigationBar.css";
import { getUser, clearUser } from "../../lib/userStorage";
import { usePlayer } from "../../context/PlayerContext";

import dashboardIcon from '../../assets/navigation_icons/dashboard.svg';
import socialIcon from '../../assets/navigation_icons/social.svg';
import libraryIcon from '../../assets/navigation_icons/library.svg';
import homeIcon from '../../assets/navigation_icons/home.svg';
import subscriptionIcon from '../../assets/navigation_icons/subscription.svg';
import analyticsIcon from '../../assets/navigation_icons/analytics.svg';
import profileIcon from '../../assets/navigation_icons/profile.svg';
import editIcon from '../../assets/navigation_icons/edit.svg';
import connectionsIcon from '../../assets/navigation_icons/connections.svg';
import favoritesIcon from '../../assets/navigation_icons/favorites.svg';
import playlistsIcon from '../../assets/navigation_icons/playlists.svg';
import logoutIcon from '../../assets/navigation_icons/logout.svg';
import advertisementsIcon from '../../assets/navigation_icons/advertisements.svg';
import uploadAdIcon from '../../assets/navigation_icons/uploadad.svg';
import uploadSongIcon from '../../assets/navigation_icons/uploadsong.svg';
import albumIcon from '../../assets/navigation_icons/album.svg';

export default function NavigationBar() {
  const navigate = useNavigate();
  const user = useMemo(() => getUser(), []);
  const isArtist = (user?.accountType || "").toLowerCase() === "artist";
  const isAdmin = (user?.accountType || "").toLowerCase() === "admin";
  const { clearPlayer } = usePlayer();

  const handleLogout = () => {
    clearPlayer();
    clearUser();
    navigate("/login");
  };

  return (
    <>
      <div className="navHoverTrigger" />
      
      <aside className="nav">
        <div className="nav__scroll-wrapper">
          <div className="navBrand">
            <div className="logo">
              Coogs<br />Music
            </div>
          </div>

          {/* === MAIN DASHBOARD SECTION === */}
          <nav className="navSection">
            <div className="navTitle">
              <img src={dashboardIcon} alt="" className="navTitleIcon" />
              <span>Dashboard</span>
            </div>
            <Link 
              className="navLink" 
              to={isAdmin ? "/admin-home" : (isArtist ? "/artist-dashboard" : "/home")}
            >
              <img src={homeIcon} alt="" className="navIcon" />
              <span>Home</span>
            </Link>

            {/* Listeners Only: Subscription */}
            {!isArtist && !isAdmin && (
              <Link className="navLink" to="/subscription">
                <img src={subscriptionIcon} alt="" className="navIcon" />
                <span>Subscription</span>
              </Link>
            )}

            {/* Analytics: Artists & Listeners Only */}
            {isArtist && (
               <Link className="navLink" to="/artist-analytics">
                 <img src={analyticsIcon} alt="" className="navIcon" />
                 <span>Analytics</span>
               </Link>
            )}
            {!isArtist && !isAdmin && (
               <Link className="navLink" to="/listener-analytics">
                 <img src={analyticsIcon} alt="" className="navIcon" />
                 <span>My History</span>
               </Link>
            )}
          </nav>

          {/* === ADMIN SECTION (Admins Only) === */}
          {isAdmin && (
            <nav className="navSection">
              <div className="navTitle">Admin Tools</div>
              <Link className="navLink" to="/report-review">
                <img src={analyticsIcon} alt="" className="navIcon" />
                <span>User Complaints</span>
              </Link>
              <Link className="navLink" to="/admin/reports/revenue">
                <img src={analyticsIcon} alt="" className="navIcon" />
                <span>Revenue Report</span>
              </Link>
              <Link className="navLink" to="/admin/reports/songs">
                <img src={analyticsIcon} alt="" className="navIcon" />
                <span>Song Performance</span>
              </Link>
            </nav>
          )}

          {/* === SOCIAL SECTION (Hidden for Admins) === */}
          {!isAdmin && (
            <nav className="navSection">
              <div className="navTitle">
                <img src={socialIcon} alt="" className="navTitleIcon" />
                <span>Social</span>
              </div>
              
              <Link 
                className="navLink" 
                to={(isArtist && (user?.artistId ?? user?.ArtistID)) ? `/artist/${user.artistId ?? user.ArtistID}` : "/profile"}
              >
                <img src={profileIcon} alt="" className="navIcon" />
                <span>My Profile</span>
              </Link>

              <Link className="navLink" to="/edit-profile">
                <img src={editIcon} alt="" className="navIcon" />
                <span>Edit Profile</span>
              </Link>
              
              <Link className="navLink" to="/follows">
                <img src={connectionsIcon} alt="" className="navIcon navIcon--connections" />
                <span>Connections</span>
              </Link>
            </nav>
          )}

          {/* === LIBRARY SECTION (Hidden for Admins) === */}
          {!isAdmin && (
            <nav className="navSection">
              <div className="navTitle">
                <img src={libraryIcon} alt="" className="navTitleIcon" />
                <span>Library</span>
              </div>
              {!isArtist ? (
                /* Listener View */
                <>
                  <Link className="navLink" to="/likedsongs">
                    <img src={favoritesIcon} alt="" className="navIcon" />
                    <span>Favorite Tracks</span>
                  </Link>
                  <Link className="navLink" to="/me/playlists">
                    <img src={playlistsIcon} alt="" className="navIcon navIcon--playlists" />
                    <span>Playlists</span>
                  </Link>
                </>
              ) : (
                /* Artist Library View */
                <>
                  <Link className="navLink" to="/my-songs"> 
                    <img src={uploadSongIcon} alt="" className="navIcon" />
                    <span>My Songs</span>
                  </Link>
                  <Link className="navLink" to="/my-albums">
                    <img src={albumIcon} alt="" className="navIcon" />
                    <span>Albums</span>
                  </Link>
                </>
              )}
            </nav>
          )}

          {/* === ARTIST PUBLISH SECTION === */}
          {isArtist && (
            <nav className="navSection">
              <div className="navTitle">Publish</div>
              <Link className="navLink" to="/my-ads">
                <img src={advertisementsIcon} alt="" className="navIcon" />
                <span>My Ads</span>
              </Link>
              <Link className="navLink" to="/buy-ads">
                <img src={uploadAdIcon} alt="" className="navIcon" />
                <span>Upload Ad</span>
              </Link>
              <Link className="navLink" to="/upload/song">
                <img src={uploadSongIcon} alt="" className="navIcon" />
                <span>Upload Song</span>
              </Link>
              <Link className="navLink" to="/upload/album">
                <img src={albumIcon} alt="" className="navIcon" />
                <span>Create Album</span>
              </Link>
            </nav>
          )}

          {/* Logout Section - Always at bottom */}
          <nav className="navSection navSection--logout">
            <button className="navLink logoutBtn" onClick={handleLogout}>
              <img src={logoutIcon} alt="" className="navIcon" />
              <span>Log Out</span>
            </button>
          </nav>
        </div>
      </aside>
    </>
  );
}
