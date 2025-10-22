import PageLayout from "../components/PageLayout/PageLayout";
import ProfileCard from "../components/ListenerProfile/ProfileCard";
import FavoriteArtists from "../components/ListenerProfile/FavoriteArtists";
import JamCard from "../components/ListenerProfile/JamCard";
import FavPlaylist from "../components/ListenerProfile/FavPlaylist";
import "./ListenerProfile.css";

export default function ListenerProfile() {
  return (
    <PageLayout>
      <div className="lp">
        <div className="lp__header">
          <ProfileCard />
        </div>

        <div className="lp__bottom">
          <h3 className="lp__favTitle">Favorite Artists</h3>

          <div className="lp__left">
            <FavoriteArtists />
            <h3 className="lp__favTitle">Go-to Playlist</h3>
            <FavPlaylist />
          </div>

          <JamCard />
        </div>
      </div>
    </PageLayout>
  );
}
