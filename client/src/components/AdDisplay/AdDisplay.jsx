import React, { useState, useEffect, useRef } from 'react';
import './AdDisplay.css';
import { API_BASE_URL } from "../../config/api";
import { usePremium } from "../../hooks/usePremium";

export default function AdDisplay({ isSubscribed, listenerId }) {
  // Check premium status
  const { isPremium, loading: premiumLoading } = usePremium(listenerId);
  
  // User is considered subscribed if either isSubscribed prop is true OR they have premium
  const hasAdFreeAccess = isSubscribed || isPremium;
  
  const [ad, setAd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [position, setPosition] = useState({ top: 100, left: null });
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  useEffect(() => {
    // Don't fetch ads if user has ad-free access (subscribed or premium)
    if (hasAdFreeAccess) {
      setLoading(false);
      return;
    }

    const fetchRandomAd = async () => {
      try {
  const response = await fetch(`${API_BASE_URL}/advertisements/random`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setAd(null);
            setLoading(false);
            return;
          }
          throw new Error('Failed to fetch advertisement');
        }

        const data = await response.json();
        setAd(data);
        
        // Record ad view
        if (data.adId && listenerId) {
          recordAdView(data.adId, listenerId);
        }
      } catch (err) {
        console.error('Error fetching ad:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRandomAd();
    
    // Refresh ad every 30 seconds
    const interval = setInterval(fetchRandomAd, 30000);
    
    return () => clearInterval(interval);
  }, [hasAdFreeAccess, listenerId]);

  const recordAdView = async (adId, listenerId) => {
    try {
      await fetch(`${API_BASE_URL}/ad-views`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          AdID: adId,
          ListenerID: listenerId,
          DateViewed: new Date().toISOString().slice(0, 19).replace('T', ' ')
        })
      });
    } catch (err) {
      console.error('Error recording ad view:', err);
    }
  };

  // Compute initial position (and restore from localStorage if available)
  useEffect(() => {
    if (!containerRef.current) return;

    const saved = localStorage.getItem('adDisplayPosition');
    if (saved) {
      try {
        const pos = JSON.parse(saved);
        setPosition({ top: pos.top ?? 100, left: pos.left ?? 30 });
        return;
      } catch {}
    }

    // Default positions based on viewport size
    const setDefault = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const margin = window.innerWidth <= 600 ? 12 : window.innerWidth <= 1200 ? 16 : 30;
      const defaultTop = window.innerWidth <= 1200
        ? Math.max(0, window.innerHeight - rect.height - margin)
        : 100;
      const defaultLeft = Math.max(0, window.innerWidth - rect.width - margin);
      setPosition({ top: defaultTop, left: defaultLeft });
    };

    // Wait one frame for layout, then compute
    const id = requestAnimationFrame(setDefault);
    return () => cancelAnimationFrame(id);
  }, []);

  // Keep the ad within viewport on resize
  useEffect(() => {
    const onResize = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPosition(prev => ({
        top: Math.min(Math.max(0, prev.top), Math.max(0, window.innerHeight - rect.height)),
        left: Math.min(Math.max(0, prev.left ?? 0), Math.max(0, window.innerWidth - rect.width))
      }));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Drag handlers (header only)
  const onPointerDown = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    dragOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    draggingRef.current = true;
    setDragging(true);
    containerRef.current.setPointerCapture?.(e.pointerId);
    e.preventDefault();
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const onPointerMove = (e) => {
    if (!draggingRef.current || !containerRef.current) return;
    e.preventDefault();
    const el = containerRef.current;
    const rect = el.getBoundingClientRect();
    const newLeft = e.clientX - dragOffsetRef.current.x;
    const newTop = e.clientY - dragOffsetRef.current.y;
    const maxLeft = window.innerWidth - rect.width;
    const maxTop = window.innerHeight - rect.height;
    setPosition({
      top: Math.min(Math.max(0, newTop), Math.max(0, maxTop)),
      left: Math.min(Math.max(0, newLeft), Math.max(0, maxLeft))
    });
  };

  const onPointerUp = () => {
    draggingRef.current = false;
    setDragging(false);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    // Persist position
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      localStorage.setItem('adDisplayPosition', JSON.stringify({ top: rect.top, left: rect.left }));
    }
  };

  // Don't render if user has ad-free access (subscribed or premium)
  if (hasAdFreeAccess) {
    return null;
  }

  // Loading state (including premium check)
  if (loading || premiumLoading) {
    return (
      <div className="adDisplay loading">
        <p>Loading...</p>
      </div>
    );
  }

  // No ads available
  if (!ad) {
    return null;
  }

  // Error state
  if (error) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="adDisplay"
      style={{ top: position.top, left: position.left ?? 30, right: 'auto', bottom: 'auto', zIndex: dragging ? 2000 : 1000 }}
    >
      <div className="adHeader" onPointerDown={onPointerDown} role="button" aria-label="Drag ad">
        <span className="adLabel">Advertisement</span>
      </div>
      <div className="adContent">
        {(ad.AdFileUrl || ad.AdFile) && (
          <img 
          src={ad.AdFileUrl || (ad.AdFile.startsWith('http') ? ad.AdFile : `${API_BASE_URL}${ad.AdFile}`)}
            alt={ad.AdName || 'Advertisement'} 
            className="adImage"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        )}
        {ad.AdName && <h3 className="adTitle">{ad.AdName}</h3>}
      </div>
      <div className="adFooter">
        <p className="adRemovePrompt">
          Want to remove ads? <a href="/subscription">Subscribe now!</a>
        </p>
      </div>
    </div>
  );
}
