import PageLayout from "../components/PageLayout/PageLayout";
import ArtistCard from "../components/ArtistProfile/ArtistCard";
import TopTracks from "../components/ArtistProfile/TopTracks";
import AboutBox from "../components/ArtistProfile/AboutBox";
import Discography from "../components/ArtistProfile/DiscographyGrid";
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
