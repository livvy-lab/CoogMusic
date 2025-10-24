import PageLayout from "../components/PageLayout/PageLayout";
import ArtistCard from "../components/ArtistView/ArtistCard";
import TopTracks from "../components/ArtistView/TopTracks";
import AboutBox from "../components/ArtistView/AboutBox";
import Discography from "../components/ArtistView/DiscographyGrid";
import "./ArtistView.css";

export default function ArtistView() {
  return (
    <PageLayout>
      <div className="artistView">   {/* NEW wrapper */}
        <ArtistCard />

        <div className="artistView__bottom">
          <TopTracks />
          <AboutBox />
        </div>

        <Discography />
      </div>
    </PageLayout>
  );
}
