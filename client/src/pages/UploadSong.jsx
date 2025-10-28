import PageLayout from "../components/PageLayout/PageLayout";
import SongForm from "../components/ArtistUpload/SongForm";
import "../pages/ArtistView.css";

export default function UploadSong() {
  return (
    <PageLayout>
      <div style={{ padding: 24, maxWidth: 920, margin: "0 auto" }}>
        <h1 style={{ margin: 0, marginBottom: 12 }}>Upload Music</h1>
        <div style={{ background: "#fff", padding: 18, borderRadius: 12 }}>
          <SongForm />
        </div>
      </div>
    </PageLayout>
  );
}
