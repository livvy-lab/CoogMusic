import PageLayout from "../components/PageLayout/PageLayout";
import "./ListenerProfile.css";

import ProfileCard from "../components/ListenerProfile/ProfileCard";
import FavoriteArtists from "../components/ListenerProfile/FavoriteArtists";
import JamCard from "../components/ListenerProfile/JamCard";
import FavPlaylist from "../components/ListenerProfile/FavPlaylist";

export default function ListenerProfile() {
  return (
    <PageLayout>
      <div className="listenerProfile">
        {/* Header */}
        <h1 className="listenerProfile__title">Profile &gt; coolgirl&lt;3</h1>

        {/* Top section (Profile + Jam) */}
        <div className="listenerProfile__top">
          <ProfileCard />
          <JamCard />
        </div>

        {/* Favorite Artists */}
        <section className="listenerProfile__section">
          <h2 className="listenerProfile__subtitle">Favorite Artists</h2>
          <FavoriteArtists />
        </section>

        {/* Favorite Playlist */}
        <section className="listenerProfile__section">
          <h2 className="listenerProfile__subtitle">Favorite Playlist</h2>
          <FavPlaylist />
        </section>
      </div>
    </PageLayout>
  );
}
