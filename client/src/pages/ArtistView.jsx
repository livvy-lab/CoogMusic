import { useParams } from "react-router-dom";
import PageLayout from "../components/PageLayout/PageLayout";
import ArtistCard from "../components/ArtistProfile/ArtistCard";
import TopTracks from "../components/ArtistProfile/TopTracks";
import AboutBox from "../components/ArtistProfile/AboutBox";
import Discography from "../components/ArtistProfile/DiscographyGrid";
import AlbumGrid from "../components/ArtistProfile/AlbumGrid";

import "./ArtistView.css";

export default function ArtistView() {
  const { artistId: artistIdParam } = useParams();
  const artistId = Number(artistIdParam);

  const isValid = Number.isFinite(artistId) && artistId > 0;

  return (
    <PageLayout>
      <div className="artistView">
        <ArtistCard artistId={isValid ? artistId : undefined} />

        <div className="artistView__bottom">
          <TopTracks artistId={isValid ? artistId : undefined} />
          <AboutBox  artistId={isValid ? artistId : undefined} />
        </div>
        <AlbumGrid artistId={isValid ? artistId : undefined} />
      </div>
    </PageLayout>
  );
}
