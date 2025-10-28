import { useParams } from "react-router-dom";
import ListenerProfile from "./ListenerProfile";

export default function ListenerPublic() {
  const { id } = useParams();
  return <ListenerProfile profileId={Number(id)} publicView />;
}
