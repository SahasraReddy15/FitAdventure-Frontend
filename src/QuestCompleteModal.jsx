
import "./QuestCompleteModal.css";

export default function QuestCompleteModal({
  quest,
  value,
  setValue,
  onConfirm,
  onCancel,
}) {
  if (!quest) return null;

  const unit =
    quest.unit ||
    (quest.activityType === "WALKING"
      ? "steps"
      : quest.activityType === "RUNNING"
      ? "km"
      : "session");

  return (
    <div className="quest-modal-overlay">
      <div className="quest-modal">
        <div className="quest-modal-stars">✨ ⭐ ✨</div>

        <div className="quest-modal-icon">
          {quest.icon || "🏆"}
        </div>

        <p className="quest-modal-label">MAGICAL QUEST</p>
        <h2>{quest.name || quest.title}</h2>

        <p className="quest-modal-description">
          {quest.description || "Complete your fitness challenge!"}
        </p>

        <div className="quest-modal-reward">
          <span>🎯 Target: {quest.target} {unit}</span>
          <span>✨ Reward: {quest.xp ?? quest.xpReward ?? 0} XP</span>
        </div>

        <label htmlFor="quest-activity">
          How much did you complete?
        </label>

        <div className="quest-modal-input">
          <input
            id="quest-activity"
            type="number"
            min="1"
            step="any"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={`Enter ${unit}`}
            autoFocus
          />
          <span>{unit}</span>
        </div>

        <div className="quest-modal-actions">
          <button
            type="button"
            className="quest-cancel-button"
            onClick={onCancel}
          >
            Cancel
          </button>

          <button
            type="button"
            className="quest-confirm-button"
            onClick={onConfirm}
          >
            ⚔️ Complete Quest
          </button>
        </div>
      </div>
    </div>
  );
}
