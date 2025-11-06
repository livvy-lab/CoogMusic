import "./AchievementPopup.css";

export default function AchievementPopup({
  achievement,
  visible,
  onDisplay,
  onClose,
}) {
  if (!visible || !achievement) return null;
  return (
    <div className="ap-popup-bg">
      <div className="ap-popup-card">
        <h2 className="ap-title">You got an achievement!</h2>
        <img
          className="ap-icon"
          src={achievement.IconURL}
          alt={achievement.Name}
        />
        <div className="ap-achievement-title">{achievement.Name}</div>
        
        <div className="ap-achievement-desc">{achievement.Description}</div>

        <div className="ap-btn-row">
          <button className="ap-btn" onClick={onDisplay}>Display on profile</button>
          <button className="ap-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}