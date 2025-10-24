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
        <div className="lp__profileSection">
          <ProfileCard />
        </div>
        <div className="lp__bottom">
          <div className="lp__left">
            <FavoriteArtists />
            <FavPlaylist />
          </div>
          <JamCard />
        </div>
      </div>
    </PageLayout>
  );
}
