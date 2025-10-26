import PageLayout from "../components/PageLayout/PageLayout";
import PlaylistGrid from "../components/PlaylistGrid/PlaylistGrid";
import { getUser } from "../lib/userStorage";

export default function MyPlaylistsPage() {
  const user = getUser();
  const listenerId = user?.listenerId ?? user?.ListenerID ?? null;
  const authorName = user?.displayName || user?.username || user?.Username || "you";

  return (
    <PageLayout>
      <PlaylistGrid
        listenerId={listenerId}
        showPrivate={true}
        showLikedFallback={true}
        authorName={authorName}
      />
    </PageLayout>
  );
}
