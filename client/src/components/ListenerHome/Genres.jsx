import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config/api";
import "./Genres.css";

import alternativeIcon from '../../assets/genre_icons/alternative.svg';
import classicalIcon from '../../assets/genre_icons/classical.svg';
import countryIcon from '../../assets/genre_icons/country.svg';
import edmIcon from '../../assets/genre_icons/edm.svg';
import electronicIcon from '../../assets/genre_icons/electronic.svg';
import hiphopIcon from '../../assets/genre_icons/hiphop.svg';
import indieIcon from '../../assets/genre_icons/indie.svg';
import jazzIcon from '../../assets/genre_icons/jazz.svg';
import jpopIcon from '../../assets/genre_icons/jpop.svg';
import metalIcon from '../../assets/genre_icons/metal.svg';
import popIcon from '../../assets/genre_icons/pop.svg';
import rbIcon from '../../assets/genre_icons/r&b.svg';
import rockIcon from '../../assets/genre_icons/rock.svg';
import soulIcon from '../../assets/genre_icons/soul.svg';

const iconMap = {
  'alternative': alternativeIcon,
  'classical': classicalIcon,
  'country': countryIcon,
  'edm': edmIcon,
  'electronic': electronicIcon,
  'hiphop': hiphopIcon,
  'indie': indieIcon,
  'jazz': jazzIcon,
  'jpop': jpopIcon,
  'metal': metalIcon,
  'pop': popIcon,
  'r&b': rbIcon,
  'rock': rockIcon,
  'soul': soulIcon,
};

const defaultIcon = rockIcon;

export default function Genres() {
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/genres`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setGenres(Array.isArray(data) ? data : []);
      } catch {
        setError("Failed to fetch genres");
      } finally {
        setLoading(false);
      }
    };
    fetchGenres();
  }, []);

  return (
    <section className="genres">
      <h2 className="genres__title">Genres</h2>

      <div className="genres__grid">
        {(Array.isArray(genres) ? genres : []).map((g) => (
          <button
            className="genres__card"
            key={g.GenreID}
            onClick={() => navigate(`/genre/${g.GenreID}`)}
            type="button"
          >
            <img
              src={iconMap[g.Name?.toLowerCase().replace(' ', '')] || defaultIcon}
              alt=""
              className="genres__icon"
            />
            <span className="genres__text">{g.Name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}