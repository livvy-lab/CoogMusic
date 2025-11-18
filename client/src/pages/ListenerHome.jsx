import RecommendedSongs from "../components/ListenerHome/RecommendedSongs";
import NewReleases from "../components/ListenerHome/NewReleases";
import Genres from "../components/ListenerHome/Genres";
import PageLayout from "../components/PageLayout/PageLayout";
import AdBanner from "../components/ListenerHome/AdBanner";
import "./ListenerHome.css";
import { useLocation, useNavigate } from "react-router-dom";
import React from "react";

export default function ListenerHome() {
  const location = useLocation();
  const navigate = useNavigate();
  const { username } = location.state || {};

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
        <AdBanner />
        <RecommendedSongs />
        <NewReleases title="New releases" items={demoReleases} />
        <Genres />
      </div>
    </PageLayout>
  );
}