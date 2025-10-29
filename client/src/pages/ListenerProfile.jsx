import { useEffect, useState } from "react";
import PageLayout from "../components/PageLayout/PageLayout";
import ProfileCard from "../components/ListenerProfile/ProfileCard";
import FavoriteArtists from "../components/ListenerProfile/FavoriteArtists";
import JamCard from "../components/ListenerProfile/JamCard";
import FavPlaylist from "../components/ListenerProfile/FavPlaylist";
import "./Listenerprofile.css";

export default function ListenerProfile({ profileId = null, publicView = false }) {
  const [listenerId, setListenerId] = useState(profileId);

  useEffect(() => {
    if (profileId != null) {
      setListenerId(profileId);
      return;
    }
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "null");
      const id = stored?.listenerId ?? stored?.ListenerID ?? null;
      setListenerId(id);
    } catch {
      setListenerId(null);
    }
  }, [profileId]);

  return (
    <PageLayout>
      <div className="lp">
        <div className="lp__profileSection">
          <ProfileCard listenerId={listenerId} publicView={publicView} />
        </div>
        <div className="lp__bottom">
          <div className="lp__left">
            <FavoriteArtists listenerId={listenerId} publicView={publicView} />
            <FavPlaylist listenerId={listenerId} publicView={publicView} />
          </div>
          <JamCard listenerId={listenerId} publicView={publicView} />
        </div>
      </div>
    </PageLayout>
  );
}
