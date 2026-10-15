import "./QuestGame.css";
import { useState } from "react";
import "./CastleMap.css";

const zones = [
  {
    id: 1,
    name: "Starter Village",
    icon: "🏡",
    requiredLevel: 1,
    color: "village",
  },
  {
    id: 2,
    name: "Enchanted Forest",
    icon: "🌳",
    requiredLevel: 2,
    color: "forest",
  },
  {
    id: 3,
    name: "Crystal Lake",
    icon: "💎",
    requiredLevel: 3,
    color: "lake",
  },
  {
    id: 4,
    name: "Dragon Mountain",
    icon: "🐉",
    requiredLevel: 5,
    color: "mountain",
  },
  {
    id: 5,
    name: "Royal Castle",
    icon: "🏰",
    requiredLevel: 8,
    color: "castle",
  },
];

const positions = [
  { left: "50%", top: "9%" },
  { left: "77%", top: "25%" },
  { left: "50%", top: "43%" },
  { left: "23%", top: "61%" },
  { left: "50%", top: "81%" },
];

export default function CastleMap({
  level = 1,
  xp = 0,
  quests = [],
  onCompleteQuest,
  onGoToQuests,
}) {
  const [selectedZone, setSelectedZone] = useState(1);

  const currentZone =
    zones.find((zone) => zone.id === selectedZone) || zones[0];

  const isUnlocked = level >= currentZone.requiredLevel;

  const unlockedCount = zones.filter(
    (zone) => level >= zone.requiredLevel
  ).length;

  return (
    <section className="castle-map-page">
      <header className="map-heading">
        <div>
          <p className="map-kicker">✨ YOUR ADVENTURE WORLD</p>
          <h1>Magical Kingdom</h1>
          <p className="map-description">
            Complete fitness quests, gain XP, and unlock new lands!
          </p>
        </div>

        <div className="map-player-stats">
          <span>⭐ Level {level}</span>
          <span>✨ {xp} XP</span>
        </div>
      </header>

      <div className="map-progress-card">
        <div className="map-progress-top">
          <span>🗺️ Kingdom exploration</span>
          <strong>
            {unlockedCount} / {zones.length} zones
          </strong>
        </div>

        <div className="map-progress-track">
          <div
            className="map-progress-fill"
            style={{
              width: `${(unlockedCount / zones.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="fantasy-map">
        <div className="map-cloud cloud-a">☁️</div>
        <div className="map-cloud cloud-b">☁️</div>

        <div className="map-sparkle sparkle-a">✦</div>
        <div className="map-sparkle sparkle-b">✧</div>

        <svg
          className="map-path"
          viewBox="0 0 340 700"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M170 85 C285 105 285 175 170 205 S55 300 170 335 S285 420 170 465 S55 555 170 610"
            fill="none"
            stroke="#d6b5f5"
            strokeWidth="15"
            strokeLinecap="round"
            strokeDasharray="5 15"
          />
        </svg>

        {zones.map((zone, index) => {
          const unlocked = level >= zone.requiredLevel;
          const selected = selectedZone === zone.id;

          return (
            <button
              key={zone.id}
              type="button"
              className={[
                "map-zone",
                zone.color,
                unlocked ? "zone-unlocked" : "zone-locked",
                selected ? "zone-selected" : "",
              ].join(" ")}
              style={positions[index]}
              onClick={() => setSelectedZone(zone.id)}
              aria-label={`${zone.name}, ${
                unlocked
                  ? "unlocked"
                  : `locked until level ${zone.requiredLevel}`
              }`}
            >
              <span className="zone-icon">
                {unlocked ? zone.icon : "🔒"}
              </span>

              <span className="zone-name">{zone.name}</span>

              <span className="zone-level">
                {unlocked
                  ? "✓ Unlocked"
                  : `🔒 Level ${zone.requiredLevel}`}
              </span>
            </button>
          );
        })}

        <div className="map-landscape">
          🌲 🌿 🌷 🌲 🌼 🌿 🌲 🌷 🌲
        </div>
      </div>

      <div className="zone-details">
        <div className="zone-details-icon">
          {isUnlocked ? currentZone.icon : "🔒"}
        </div>

        <div className="zone-details-content">
          <p className="map-kicker">YOUR SELECTED DESTINATION</p>
          <h2>{currentZone.name}</h2>

          {isUnlocked ? (
            <>
              <p>Ready for your next fitness adventure?</p>

              <h3>Available Fitness Quests</h3>

              {quests.length > 0 ? (
                <div className="map-quest-list">
                  {quests.map((quest) => (
                    <div className="map-quest-card" key={quest.id}>
                      <div>
                        <strong>
                          {quest.icon || "✨"}{" "}
                          {quest.name || quest.title}
                        </strong>

                        <p>
                          {quest.description ||
                            "Complete this fitness quest"}
                        </p>

                        <span>
                          ⭐ {quest.xp ?? quest.xpReward ?? 0} XP
                        </span>
                      </div>

                      <button
                        type="button"
                        className="map-quest-button"
                        onClick={() => onCompleteQuest?.(quest)}
                      >
                        Complete
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No quests available right now. Try again later!</p>
              )}

              <button
                type="button"
                className="map-main-button"
                onClick={onGoToQuests}
              >
                View All Quests →
              </button>

              <span className="zone-status unlocked-status">
                ✓ Area unlocked
              </span>
            </>
          ) : (
            <div className="locked-message">
              <strong>🔒 This area is locked!</strong>

              <p>
                Reach Level {currentZone.requiredLevel} to explore this
                magical land. Keep completing fitness quests!
              </p>

              <button
                type="button"
                className="map-main-button"
                onClick={onGoToQuests}
              >
                Start a Quest →
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="map-note">
        🌟 Complete quests to gain XP and unlock your next destination.
      </p>
    </section>
  );
}