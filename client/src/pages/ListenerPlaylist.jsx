import { useParams } from "react-router-dom";
import PageLayout from "../components/PageLayout/PageLayout";
import PlaylistGrid from "../components/PlaylistGrid/PlaylistGrid";

export default function ListenerPlaylistsPage() {
  const { id } = useParams();
  const authorName = `Listener ${id}`;

  return (
    <PageLayout>
      <PlaylistGrid
        listenerId={id}
        showPrivate={false}
        showLikedFallback={false}
        authorName={authorName}
      />
    </PageLayout>
  );
}
