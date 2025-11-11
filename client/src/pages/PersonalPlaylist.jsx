import PageLayout from "../components/PageLayout/PageLayout";
import PlaylistGrid from "../components/PlaylistGrid/PlaylistGrid";
import { getUser } from "../lib/userStorage";
import CreatePlaylistModal from "../components/Playlist/CreatePlaylistModal";

export default function MyPlaylistsPage() {
  const user = getUser();
  const listenerId = user?.listenerId ?? user?.ListenerID ?? null;
  const authorName =
    user?.displayName || user?.username || user?.Username || "you";

  return (
    <PageLayout>
      {/* ✅ Modal button + form */}
      <CreatePlaylistModal
        listenerId={listenerId}
        onCreated={(newPlaylist) => {
          console.log("✅ Created playlist:", newPlaylist);
          try { window.dispatchEvent(new CustomEvent('playlistCreated', { detail: newPlaylist })); } catch (e) {}
        }}
      />

      {/* Existing Playlist Grid */}
      <PlaylistGrid
        listenerId={listenerId}
        showPrivate={true}
        showLikedFallback={true}
        authorName={authorName}
      />
    </PageLayout>
  );
}
