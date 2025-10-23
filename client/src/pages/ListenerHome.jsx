import RecommendedSongs from "../components/ListenerHome/RecommendedSongs";
import NewReleases from "../components/ListenerHome/NewReleases";
import Genres from "../components/ListenerHome/Genres";
import PageLayout from "../components/PageLayout/PageLayout";

export default function ListenerHome() {
  const demoReleases = [
    { id: 1, image: "https://placehold.co/600x600/6e4760/fff?text=A" },
    { id: 2, image: "https://placehold.co/600x600/AF578A/fff?text=B" },
    { id: 3, image: "https://placehold.co/600x600/895674/fff?text=C" },
    { id: 4, image: "https://placehold.co/600x600/6e4760/fff?text=D" },
    { id: 5, image: "https://placehold.co/600x600/AF578A/fff?text=E" },
  ];

  return (
    <PageLayout>
      <div className="listenerHome">
        <RecommendedSongs />
        <NewReleases title="New releases" items={demoReleases} />
        <Genres />
      </div>
    </PageLayout>
  );
}
