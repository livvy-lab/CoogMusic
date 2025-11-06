import PageLayout from "../components/PageLayout/PageLayout";
import SongForm from "../components/ArtistUpload/SongForm";
import "../components/ArtistUpload/SongForm.css";

export default function UploadSong() {
  return (
    <PageLayout>
      {/* page title */}
      <h1 className="upload-page-title">Upload Music</h1>

      {/* main upload container */}
      <div className="upload-page-container">
        <SongForm />
      </div>
    </PageLayout>
  );
}
