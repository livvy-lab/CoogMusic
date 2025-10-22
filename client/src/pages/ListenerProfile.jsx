import PageLayout from "../components/PageLayout/PageLayout";
import ProfileCard from "../components/ListenerProfile/ProfileCard";
import FavoriteArtists from "../components/ListenerProfile/FavoriteArtists";
import JamCard from "../components/ListenerProfile/JamCard";
import "./ListenerProfile.css";

export default function ListenerProfile() {
  return (
    <PageLayout>
      <div className="lp">
        {/* TOP: Profile card spans the full content width */}
        <div className="lp__header">
          <ProfileCard />
        </div>
        <div className="lp__bottom">
          <h3 className="lp__favTitle">Favorite Artists</h3>
          <FavoriteArtists />
          <JamCard />
        </div>
      </div>
    </PageLayout>
  );
}
