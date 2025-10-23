import PageLayout from "../components/PageLayout/PageLayout";
import ArtistCard from "../components/ArtistView/ArtistCard";
import TopTracks from "../components/ArtistView/TopTracks";
import AboutBox from "../components/ArtistView/AboutBox";
import "./ArtistView.css";
import Discography from "../components/ArtistView/DiscographyGrid";

export default function ArtistView() {
  return (
    <PageLayout>
      <ArtistCard />

      <div className="artistView__bottom">
        <TopTracks />
        <AboutBox />
      </div>
      <Discography></Discography>
    </PageLayout>
  );
}
