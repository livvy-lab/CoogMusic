import PageLayout from "../components/PageLayout/PageLayout";
import SongForm from "../components/ArtistUpload/SongForm";
import "../pages/ArtistView.css";

export default function UploadSong() {
  return (
    <PageLayout>
      <div style={{ padding: '40px 24px', maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ margin: 0, marginBottom: 24, fontSize: 32, fontWeight: 600, color: '#2D2D2D' }}>Upload Music</h1>
        <SongForm />
      </div>
    </PageLayout>
  );
}
