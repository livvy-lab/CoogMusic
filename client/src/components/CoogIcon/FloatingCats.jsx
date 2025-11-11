import React, { memo, useRef } from 'react';
import './FloatingCats.css';

import CatIcon1 from '../../assets/cat-icon.svg';
import CatIcon2 from '../../assets/cat-icon2.svg';
import CatIcon3 from '../../assets/cat-icon3.svg';
import CatIcon4 from '../../assets/cat-icon4.svg';
import CatIcon5 from '../../assets/cat-icon5.svg';
import CatIcon6 from '../../assets/cat-icon6.svg';

const catIcons = [CatIcon1, CatIcon2, CatIcon3, CatIcon4, CatIcon5, CatIcon6];

// shuffle array
function shuffle(arr) {
  const temp = [...arr];
  for (let i = temp.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [temp[i], temp[j]] = [temp[j], temp[i]];
  }
  return temp;
}

const FloatingCatsComponent = () => {
  // use a ref to keep track of icon order without rerenders
  const iconQueueRef = useRef(shuffle(catIcons));
  const cats = Array.from({ length: 8 });

  // helper to get next icon, reshuffle when out
  function getNextIcon() {
    if (iconQueueRef.current.length === 0) {
      iconQueueRef.current = shuffle(catIcons);
    }
    return iconQueueRef.current.pop();
  }

  return (
    <div className="floating-cats-container">
      {cats.map((_, index) => {
        const chosenIcon = getNextIcon();
        return (
          <div
            className="floating-cat"
            key={index}
            style={{
              left: `${Math.random() * 100}vw`,
              animationDuration: `${Math.random() * 8 + 10}s`,
              animationDelay: `${Math.random() * 15}s`,
            }}
          >
            <img src={chosenIcon} alt="" />
          </div>
        );
      })}
    </div>
  );
};

export default memo(FloatingCatsComponent);
