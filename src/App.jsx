import { useEffect, useState } from "react";
import "./App.css";
import "./QuestCompleteModal.css";
import CastleMap from "./CastleMap";
import WebcamWorkout from "./components/WebcamWorkout";
const API_URL = "https://fitadventure-backend-production-2f1f.up.railway.app/api";

const REWARDS = [
  { id: 1, name: "Magic Potion", icon: "🧪", cost: 10 },
  { id: 2, name: "Golden Sword", icon: "⚔️", cost: 25 },
  { id: 3, name: "Royal Shield", icon: "🛡️", cost: 30 },
  { id: 4, name: "Castle Crown", icon: "👑", cost: 50 },
];

function App() {
  const [player, setPlayer] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("fitAdventurePlayer")) || null;
    } catch {
      return null;
    }
  });

  const [screen, setScreen] = useState(() =>
    localStorage.getItem("fitAdventurePlayer") ? "game" : "login"
  );

  const [authMode, setAuthMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [quests, setQuests] = useState([]);
  const [completedIds, setCompletedIds] = useState([]);
  const [questHistory, setQuestHistory] = useState([]);
const [dailyQuests, setDailyQuests] = useState([]);
const [dailyQuestError, setDailyQuestError] = useState("");

  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [coins, setCoins] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
const [longestStreak, setLongestStreak] = useState(0);
const [monsterHp, setMonsterHp] = useState(100);
const [battleMessage, setBattleMessage] = useState(
  "A forest monster is blocking your path!"
);
const [isAttacking, setIsAttacking] = useState(false);

const MONSTERS = [
  {
    id: 1,
    name: "Forest Slime",
    emoji: "👾",
    maxHp: 50,
    reward: 30,
    companion: "🌱",
    description: "Your first forest challenge!"
  },
  {
    id: 2,
    name: "Mystic Fox",
    emoji: "🦊",
    maxHp: 75,
    reward: 50,
    companion: "🔮",
    description: "A magical fox guards the forest."
  },
  {
    id: 3,
    name: "Baby Dragon",
    emoji: "🐉",
    maxHp: 100,
    reward: 75,
    companion: "🔥",
    description: "A little dragon with a big fiery attack!"
  },
  {
    id: 4,
    name: "Ice Golem",
    emoji: "🧊",
    maxHp: 125,
    reward: 100,
    companion: "❄️",
    description: "A powerful guardian of the frozen kingdom."
  }
];

const STORY_CHAPTERS = [
  {
    id: 1,
    title: "The Cursed Forest",
    emoji: "🌲",
    description:
      "The forest has lost its magic. Complete 3 fitness quests to restore it.",
    requiredQuests: 3,
    reward: "🌿 Forest Guardian unlocked!",
  },
  {
    id: 2,
    title: "The Crystal Kingdom",
    emoji: "💎",
    description:
      "The kingdom's crystal is fading. Complete 5 fitness quests to restore its power.",
    requiredQuests: 5,
    reward: "🦊 Crystal Fox unlocked!",
  },
  {
    id: 3,
    title: "The Dragon's Castle",
    emoji: "🏰",
    description:
      "Reach the dragon's castle by completing 8 fitness quests.",
    requiredQuests: 8,
    reward: "🐉 Dragon Realm unlocked!",
  },
];


const [monsterIndex, setMonsterIndex] = useState(0);
const [unlockedMonsterCount, setUnlockedMonsterCount] = useState(1);

const [battleVictory, setBattleVictory] = useState(false);

useEffect(() => {
  if (!player?.userId) return;

  const key = `fitAdventureMonsterIndex_${player.userId}`;
  const savedIndex = Number(localStorage.getItem(key) || 0);

  setMonsterIndex(
    Math.min(Math.max(savedIndex, 0), MONSTERS.length - 1)
  );
}, [player?.userId]);

useEffect(() => {
  if (!player?.userId) return;

  localStorage.setItem(
    `fitAdventureMonsterIndex_${player.userId}`,
    String(monsterIndex)
  );
}, [monsterIndex, player?.userId]);


  const [unlockedRewards, setUnlockedRewards] = useState([]);

  // Achievements and badges
  const [achievements, setAchievements] = useState([]);
  const [achievementError, setAchievementError] = useState("");

  const [activeTab, setActiveTab] = useState("Home");
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [notice, setNotice] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState("");
  const [completingId, setCompletingId] = useState(null);

  const [modalQuest, setModalQuest] = useState(null);
  const [activityInput, setActivityInput] = useState("");
  const [levelUp, setLevelUp] = useState(null);
const userId = player?.userId;
const [showWelcome, setShowWelcome] = useState(false);
  useEffect(() => {
    if (screen === "game" && userId) {
      loadQuests();
      loadDailyQuests();
      loadProgress();
      loadRewards();
      loadMonsterBattle();
      loadAchievements();
    }
  }, [screen, userId]);
  useEffect(() => {
  if (screen !== "game" || !userId) return;

  const welcomeKey = `fitAdventureWelcomeSeen_${userId}`;

  if (localStorage.getItem(welcomeKey) !== "true") {
    setShowWelcome(true);
  }
}, [screen, userId]);

  async function readError(response) {
    const text = await response.text();

    if (!text) {
      return `Request failed (${response.status}). Please try again.`;
    }

    try {
      const data = JSON.parse(text);
      return data.detail || data.message || data.error || text;
    } catch {
      return text;
    }
  }

  async function handleAuth(event) {
    event.preventDefault();
    setAuthMessage("");
    setAuthLoading(true);

    try {
      const endpoint =
        authMode === "register" ? "/auth/register" : "/auth/login";

      const body =
        authMode === "register"
          ? { name: name.trim(), email: email.trim(), password }
          : { email: email.trim(), password };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const data = await response.json();

      if (authMode === "register") {
        setAuthMessage("Account created! You can now log in.");
        setAuthMode("login");
        setName("");
        setPassword("");
        return;
      }

      const loggedInPlayer = {
        userId: data.userId ?? data.id,
        name: data.name,
        email: data.email,
      };

      if (!loggedInPlayer.userId) {
        throw new Error(
          "Login succeeded, but the user ID was not returned."
        );
      }

      localStorage.setItem(
        "fitAdventurePlayer",
        JSON.stringify(loggedInPlayer)
      );

      setPlayer(loggedInPlayer);
      setScreen("game");
      setPassword("");
      setNotice(`Welcome to your adventure, ${data.name}! ✨`);
    } catch (err) {
      setAuthMessage(
        err.message ||
          "Could not connect to the server. Make sure Spring Boot is running."
      );
    } finally {
      setAuthLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("fitAdventurePlayer");

    setPlayer(null);
    setScreen("login");
    setAuthMode("login");
    setName("");
    setEmail("");
    setPassword("");

    setQuests([]);
    setCompletedIds([]);
    setQuestHistory([]);
    setXp(0);
    setLevel(1);
    setCoins(0);
    setUnlockedRewards([]);
    setAchievements([]);
    setAchievementError([]);

    setNotice("");
    setError("");
    setAuthMessage("");
    setActiveTab("Quests");
    setLevelUp(null);
    setModalQuest(null);
    setActivityInput("");
  }

  async function loadQuests() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/quests`);

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const data = await response.json();

      setQuests(
        data.map((quest, index) => ({
          id: quest.id,
          name: quest.title,
          icon:
            quest.activityType === "WALKING"
              ? "👟"
              : quest.activityType === "RUNNING"
                ? "🏃"
                : "💪",
          description: quest.description,
          target: quest.targetValue,
          unit:
            quest.activityType === "WALKING"
              ? "steps"
              : quest.activityType === "RUNNING"
                ? "km"
                : "session",
          xp: quest.xpReward,
          coins: [20, 15, 25][index % 3],
          color: ["blue", "pink", "green"][index % 3],
        }))
      );
    } catch (err) {
      setError(
        err.message ||
          "Cannot connect to the game server. Check that Spring Boot is running on port 8080."
      );
    } finally {
      setLoading(false);
    }
  }
  
async function loadDailyQuests() {
  try {
    setDailyQuestError("");

    const response = await fetch(`${API_URL}/quests/daily`);

    if (!response.ok) {
      throw new Error("Failed to load daily quests");
    }

    const data = await response.json();

    const formattedQuests = data.map((quest) => ({
      ...quest,
      activityType: quest.activityType,
      name: quest.title,
      target: quest.targetValue,
      xp: quest.xpReward,
      coins: Math.floor(quest.xpReward / 2),

      unit:
        quest.activityType === "STEPS" ? "steps" :
        quest.activityType === "SQUATS" ? "squats" :
        quest.activityType === "STRETCH" ? "minutes" :
        quest.activityType === "WATER" ? "glasses" : "",

      icon:
        quest.activityType === "STEPS" ? "👟" :
        quest.activityType === "SQUATS" ? "💪" :
        quest.activityType === "STRETCH" ? "🧘" :
        quest.activityType === "WATER" ? "💧" : "⚔️",

      color: "green"
    }));

    setDailyQuests(formattedQuests);
  } catch (error) {
    console.error("Daily quest loading failed:", error);
    setDailyQuestError(error.message);
  }
}

    async function loadProgress() {
    if (!userId) return null;

    try {
      const response = await fetch(
        `${API_URL}/users/${userId}/progress`
      );

      if (!response.ok) {
        if (response.status === 404) logout();
        return null;
      }

      const data = await response.json();

  setXp(data.xp ?? 0);
setLevel(data.level ?? 1);
setCoins(data.coins ?? 0);
setCurrentStreak(data.currentStreak ?? 0);
setLongestStreak(data.longestStreak ?? 0);

      if (Array.isArray(data.completedQuestIds)) {
        setCompletedIds(data.completedQuestIds);
      }

      if (Array.isArray(data.questHistory)) {
        setQuestHistory(data.questHistory);
      }

      return data;
    } catch (err) {
      console.error("Could not load player progress:", err);
      return null;
    }
  }

  async function loadRewards() {
    if (!userId) return;

    try {
      const response = await fetch(
        `${API_URL}/rewards?userId=${userId}`
      );

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const data = await response.json();

      setUnlockedRewards(
        Array.isArray(data)
          ? data.map((reward) => Number(reward.rewardId))
          : []
      );
    } catch (err) {
      console.error("Could not load unlocked rewards:", err);
    }
  }

  // Load achievements and earned badges
  async function loadAchievements() {
    if (!userId) return;

    try {
      setAchievementError("");

      const response = await fetch(
        `${API_URL}/achievements/user/${userId}`
      );

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const data = await response.json();
      setAchievements(Array.isArray(data) ? data : []);
    } catch (err) {
      setAchievementError(
        err.message || "Could not load achievements."
      );
    }
  }

async function loadMonsterBattle() {
  if (!userId) return;

  try {
    const response = await fetch(
      `${API_URL}/monster-battle/${userId}`
    );

    if (!response.ok) {
      throw new Error("Failed to load monster battle");
    }

   const battle = await response.json();

const backendMonsterIndex = MONSTERS.findIndex(
  (monster) => monster.name === battle.monsterName
);

const safeMonsterIndex =
  backendMonsterIndex >= 0 ? backendMonsterIndex : 0;

setMonsterIndex(safeMonsterIndex);
setUnlockedMonsterCount(safeMonsterIndex + 1);
setMonsterHp(
  Number(battle.currentHp ?? MONSTERS[safeMonsterIndex].maxHp)
);
setBattleVictory(Boolean(battle.defeated));

    setBattleMessage(
      battle.defeated
        ? `🏆 You defeated the ${battle.monsterName}!`
        : `⚔️ Complete quests to attack the ${battle.monsterName}!`
    );
  } catch (error) {
    console.error("Could not load monster battle:", error);
  }
}

  function updateQuest(quest) {
    if (completedIds.includes(quest.id) || completingId !== null) {
      return;
    }

    setActivityInput("");
    setNotice("");
    setModalQuest(quest);
  }
async function confirmQuestCompletion() {
  if (!modalQuest || completingId !== null) return;

  const quest = modalQuest;
  const activityValue = Number(activityInput);

  if (!Number.isFinite(activityValue) || activityValue <= 0) {
    setNotice("⚠️ Enter a valid activity value greater than zero.");
    return;
  }

  if (activityValue < quest.target) {
    setNotice(
      `⚠️ Target not reached! You need ${quest.target} ${quest.unit}.`
    );
    return;
  }

  setCompletingId(quest.id);
  setNotice("");

  try {
    const response = await fetch(
      `${API_URL}/quests/${quest.id}/complete?userId=${userId}&activityValue=${encodeURIComponent(activityValue)}`,
      { method: "POST" }
    );

    if (!response.ok) {
      throw new Error(await readError(response));
    }

    const message = await response.text();

    // Damage the current monster after successful quest completion.
    
// Damage the monster after successful quest completion.

const battleResponse = await fetch(
  `${API_URL}/monster-battle/${userId}/attack`,
  { method: "POST" }
);

if (!battleResponse.ok) {
  throw new Error(await readError(battleResponse));
}

const battle = await battleResponse.json();

const backendMonsterIndex = MONSTERS.findIndex(
  (monster) => monster.name === battle.monsterName
);

if (backendMonsterIndex >= 0) {
  setMonsterIndex(backendMonsterIndex);
  setUnlockedMonsterCount((count) =>
    Math.max(count, backendMonsterIndex + 1)
  );
}

setMonsterHp(Number(battle.currentHp));
setBattleVictory(Boolean(battle.defeated));

setBattleMessage(
  battle.defeated
    ? `🏆 You defeated the ${battle.monsterName}!`
    : `⚔️ ${battle.monsterName}: ${battle.currentHp} HP remaining!`
);

setIsAttacking(true);
setTimeout(() => setIsAttacking(false), 700);


    const previousLevel = level;
    const updatedProgress = await loadProgress();

    if (
      updatedProgress &&
      (updatedProgress.level ?? 1) > previousLevel
    ) {
      setLevelUp({
        level: updatedProgress.level,
        questName: quest.name,
        xp: updatedProgress.xp ?? xp,
      });
    }

    await loadAchievements();
    await loadQuests();
    await loadDailyQuests();

    setModalQuest(null);
    setActivityInput("");
    setNotice(`🎉 ${message || `${quest.name} completed!`}`);
  } catch (err) {
    setNotice(
      `⚠️ ${err.message || "Quest completion failed. Please try again."}`
    );
    await loadProgress();
  } finally {
    setCompletingId(null);
  }
}
  async function unlockReward(reward) {
    if (unlockedRewards.includes(reward.id)) {
      setNotice("✨ You already unlocked this reward!");
      return;
    }

    if (coins < reward.cost) {
      setNotice(
        `🪙 You need ${reward.cost - coins} more coins to unlock ${reward.name}.`
      );
      return;
    }

    try {
      setNotice("");

      const response = await fetch(
        `${API_URL}/rewards/${reward.id}/unlock?userId=${userId}`,
        { method: "POST" }
      );

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      setNotice(`🎉 You unlocked ${reward.name}!`);

      await loadProgress();
      await loadRewards();
    } catch (err) {
      setNotice(
        `⚠️ ${err.message || "Could not unlock this reward."}`
      );
    }
  }

  const xpProgress = ((xp % 100) / 100) * 100;
  

const currentMonster = MONSTERS[monsterIndex];

const completedQuestCount = completedIds.length;
const forestUnlocked = completedQuestCount >= 3;
const crystalUnlocked = completedQuestCount >= 5;
const dragonUnlocked = completedQuestCount >= 8;
const unlockedChapterCount = STORY_CHAPTERS.filter(
  (chapter) => completedQuestCount >= chapter.requiredQuests
).length;

const monsterHealth = Math.max(
  0,
  Math.min(currentMonster.maxHp, monsterHp)
);

const monsterHealthPercent =
  (monsterHealth / currentMonster.maxHp) * 100;



  // Login and registration screen
  if (screen === "login") {
    return (
      <div className="auth-page">
        <div className="auth-sky">
          <span className="sky-cloud cloud-left">☁️</span>
          <span className="sky-cloud cloud-right">☁️</span>
          <div className="auth-castle">🏰</div>
          <div className="auth-ground">🌳 🌿 🌷 🌿 🌳</div>
        </div>

        <main className="auth-card">
          <div className="auth-brand-icon">🛡️</div>
          <p className="eyebrow">YOUR NEXT ADVENTURE BEGINS HERE</p>

          <h1>
            Fit<span>Adventure</span>
          </h1>

          <p className="auth-subtitle">
            Move your body. Complete quests. Become a legend.
          </p>

          <div className="auth-tabs">
            <button
              type="button"
              className={authMode === "login" ? "auth-tab active" : "auth-tab"}
              onClick={() => {
                setAuthMode("login");
                setAuthMessage("");
              }}
            >
              Login
            </button>

            <button
              type="button"
              className={
                authMode === "register" ? "auth-tab active" : "auth-tab"
              }
              onClick={() => {
                setAuthMode("register");
                setAuthMessage("");
              }}
            >
              Create Account
            </button>
          </div>

          <form className="auth-form" onSubmit={handleAuth}>
            {authMode === "register" && (
              <label>
                Your adventurer name
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={100}
                  required
                />
              </label>
            )}

            <label>
              Email address
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={150}
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                placeholder={
                  authMode === "register"
                    ? "At least 8 characters"
                    : "Enter your password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={authMode === "register" ? 8 : undefined}
                maxLength={72}
                required
              />
            </label>

            {authMessage && (
              <div className="auth-message" role="status">
                {authMessage}
              </div>
            )}

            <button
              className="auth-submit"
              type="submit"
              disabled={authLoading}
            >
              {authLoading
                ? "Please wait..."
                : authMode === "register"
                  ? "✨ Create My Account"
                  : "🏰 Enter the Castle"}
            </button>
          </form>

          <p className="auth-footnote">
            🌟 Every step takes you closer to your next level.
          </p>
        </main>
      </div>
    );
  }

  const tabs = [
    "Home",
    "Quests",
    "Map",
    "AI Workout",
    "Achievements",
    "Rewards",
    "History",
  ];
    return (
    <div className="game">
      {showWelcome && (
  <div className="welcome-overlay">
    <div className="welcome-card">
      <div className="welcome-castle">🏰</div>

      <p className="welcome-kicker">
        ✨ YOUR ADVENTURE STARTS HERE ✨
      </p>

      <h1>Welcome, Adventurer!</h1>

      <p className="welcome-description">
        Your journey to becoming a legend starts today!
      </p>

      <div className="welcome-quest-box">
        <span>⚔️</span>
        <div>
          <h3>Your first quests await!</h3>
          <p>Walk, exercise, complete quests and earn XP.</p>
        </div>
      </div>

      <button
        className="welcome-start-button"
        onClick={() => {
          localStorage.setItem(
            `fitAdventureWelcomeSeen_${userId}`,
            "true"
          );
          setShowWelcome(false);
          setActiveTab("Home");
        }}
      >
        ⚔️ Start Your First Quest
      </button>

      <p className="welcome-footer">
        Every step makes you stronger. Let's begin! 🌟
      </p>
    </div>
  </div>
)}
      {/* Quest completion popup */}
      {modalQuest && (
        <div className="quest-modal-overlay">
          <div
            className="quest-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quest-modal-title"
          >
            <div className="quest-modal-stars">✨ ⭐ ✨</div>
            <div className="quest-modal-icon">
              {modalQuest.icon || "🏆"}
            </div>
            <p className="quest-modal-label">MAGICAL QUEST</p>
            <h2 id="quest-modal-title">{modalQuest.name}</h2>
            <p className="quest-modal-description">
              {modalQuest.description}
            </p>

            <div className="quest-modal-reward">
              <span>
                🎯 Target: {modalQuest.target} {modalQuest.unit}
              </span>
              <span>✨ Reward: {modalQuest.xp} XP</span>
            </div>

            <label htmlFor="quest-activity">
              How much did you complete?
            </label>

            <div className="quest-modal-input">
              <input
                id="quest-activity"
                type="number"
                min="0.01"
                step="any"
                value={activityInput}
                onChange={(event) => setActivityInput(event.target.value)}
                placeholder={`Enter ${modalQuest.unit}`}
              />
              <span>{modalQuest.unit}</span>
            </div>

            {notice && (
              <p className="notice" role="status">
                {notice}
              </p>
            )}

            <div className="quest-modal-actions">
              <button
                type="button"
                className="quest-cancel-button"
                disabled={completingId !== null}
                onClick={() => {
                  setModalQuest(null);
                  setActivityInput("");
                  setNotice("");
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="quest-confirm-button"
                disabled={completingId !== null}
                onClick={confirmQuestCompletion}
              >
                {completingId === modalQuest.id
                  ? "Completing..."
                  : "⚔️ Complete Quest"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Level-up popup */}
      {levelUp && (
        <div
          className="levelup-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="levelup-title"
        >
          <div className="levelup-card">
            <div className="levelup-sparkles">✨ ⭐ ✦ 💫 ✨</div>
            <div className="levelup-crown">👑</div>
            <p className="levelup-eyebrow">A NEW POWER AWAKENS!</p>
            <h2 id="levelup-title">LEVEL UP!</h2>

            <div className="levelup-level">Level {levelUp.level}</div>

            <p className="levelup-message">
              Amazing work, {player?.name}! You're becoming a stronger
              adventurer.
            </p>

            <div className="levelup-reward">
              ✨ {levelUp.xp} Total XP
            </div>

            <button
              className="levelup-continue"
              onClick={() => setLevelUp(null)}
            >
              Continue Adventure →
            </button>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">🛡️</div>
        <h3>
          FIT<span>ADVENTURE</span>
        </h3>

        <div className="sidebar-player">
          <div className="player-avatar">🧙‍♀️</div>
          <div>
            <strong>{player?.name}</strong>
            <p>Level {level} Adventurer</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={
                activeTab === tab ? "nav-item active" : "nav-item"
              }
              onClick={() => {
                setActiveTab(tab);
                setNotice("");
              }}
            >
              {tab === "Home" && "🏠"}
              {tab === "Quests" && "⚔️"}
              {tab === "Map" && "🗺️"}
              {tab === "Achievements" && "🏆"}
              {tab === "Rewards" && "🎁"}
              {tab === "History" && "📜"}
              {tab === "AI Workout" && "🏋️"}
              <span>{tab}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-coins">🪙 {coins} Coins</div>
          <button className="logout-button" onClick={logout}>
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="game-main">
        <header className="game-header">
          <div>
            <p className="eyebrow">WELCOME BACK, HERO!</p>
            <h1>Hello, {player?.name}! ✨</h1>
            <p>Your next adventure is waiting.</p>
          </div>

          <div className="header-stats">
            <div className="stat-pill">👑 Level {level}</div>
            <div className="stat-pill">✨ {xp} XP</div>
            <div className="stat-pill">🪙 {coins}</div>
          </div>
        </header>

        {notice && !modalQuest && (
          <div className="notice" role="status">
            {notice}
            <button onClick={() => setNotice("")}>×</button>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        {/* XP progress */}
        <section className="player-progress">
          <div className="progress-heading">
            <div>
              <h2>🌟 Your Adventure Progress</h2>
              <p>Keep moving to unlock your next level!</p>
            </div>
            <strong>Level {level}</strong>
          </div>

          <div className="xp-label">
            <span>Experience Points</span>
            <span>{xp % 100} / 100 XP</span>
          </div>

          <div className="xp-bar">
            <div style={{ width: `${xpProgress}%` }} />
          </div>
        </section>

        {/* Home */}
        
{/* Story Chapters */}
{activeTab === "Home" && (
  <section className="content-section story-section">
    <h2>📖 Your Adventure Story</h2>
<p>
  Complete real-life fitness quests to restore the kingdom and unlock new adventures!
</p>

<div className="story-next-goal">
  {completedQuestCount < 3
    ? `🌲 ${3 - completedQuestCount} more quests to unlock the Crystal Kingdom!`
    : completedQuestCount < 5
      ? `💎 ${5 - completedQuestCount} more quests to unlock the Dragon's Castle!`
      : "🐉 You're ready to explore the Dragon's Castle!"}
</div>

    <div className="quest-grid">
      {STORY_CHAPTERS.map((chapter) => {
          const unlocked =
  chapter.id === 1 ||
  (chapter.id === 2 && completedQuestCount >= 3) ||
  (chapter.id === 3 && completedQuestCount >= 5);

        return (
<article
  className={`quest-card ${unlocked ? "" : "locked-chapter"}`}
  key={chapter.id}
>
            <div className="quest-icon">{chapter.emoji}</div>
            <h3>{chapter.title}</h3>
            {unlocked && (
  <div className="chapter-unlocked-badge">
    ✨ CHAPTER UNLOCKED
  </div>
)}
            <p>{chapter.description}</p>

            <div className="quest-target">
              Progress: {Math.min(
                completedQuestCount,
                chapter.requiredQuests
              )} / {chapter.requiredQuests} quests
            </div>

            <div className="quest-progress">
              <div
                style={{
                  width: `${
                    Math.min(
                      completedQuestCount / chapter.requiredQuests,
                      1
                    ) * 100
                  }%`,
                }}
              />
            </div>

          
<p>
  {unlocked
    ? `✨ Chapter available! ${chapter.reward}`
    : `🔒 Complete more quests to unlock this chapter.`}
</p>

<button
  className="primary-button"
  disabled={!unlocked}
 onClick={() => setSelectedChapter(chapter)}
>
  {unlocked ? "Enter Chapter →" : "Chapter Locked 🔒"}
</button>

          </article>
        );
      })}
        </div>

    {selectedChapter && (
      <div className="story-mission-panel">
        <h2>
          {selectedChapter.emoji} {selectedChapter.title}
        </h2>

        <p>{selectedChapter.description}</p>

        <h3>🎯 Your Mission</h3>

        <p>
          Complete {selectedChapter.requiredQuests} fitness quests
          to finish this chapter.
        </p>

        <p>🏆 Reward: {selectedChapter.reward}</p>

        <button
          className="primary-button"
          onClick={() => setActiveTab("Quests")}
        >
          Start Fitness Quest →
        </button>

        <button
          className="primary-button"
          onClick={() => setSelectedChapter(null)}
        >
          Back to Chapters
        </button>
      </div>
    )}
  </section>
)}

        {activeTab === "Home" && (
          <section className="content-section">
            <h2>🏰 Welcome to Your Castle</h2>
            <p>
              Complete quests, collect coins, earn XP, and become a
              legendary adventurer!
            </p>
  <div className="dashboard-cards">
  <article className="dashboard-card">
    <span>⚔️</span>
    <h3>{quests.length}</h3>
    <p>Available Quests</p>
  </article>

  <article className="dashboard-card">
    <span>🏆</span>
    <h3>{completedIds.length}</h3>
    <p>Completed Quests</p>
  </article>

  <article className="dashboard-card">
    <span>🪙</span>
    <h3>{coins}</h3>
    <p>Coins Collected</p>
  </article>

  <article className="dashboard-card streak-card">
    <span>🔥</span>
    <h3>{currentStreak}</h3>
    <p>Day Streak</p>
  </article>

  <article className="dashboard-card streak-card">
    <span>🏅</span>
    <h3>{longestStreak}</h3>
    <p>Best Streak</p>
  </article>
</div>

            <button
              className="primary-button"
              onClick={() => setActiveTab("Quests")}
            >
              Explore Quests →
            </button>
          </section>
        )}

        
{/* Quests */}
{activeTab === "Quests" && (
  <section className="content-section">

    {/* Monster Battle */}
    <div className="monster-battle">
      <div className="battle-heading">
        <span>⚔️ YOUR FIRST BATTLE</span>
        <h2>Defeat the {currentMonster.name}!</h2>
        <p>Complete real-life quests to earn your victory.</p>
      </div>

      <div className={`monster-arena ${isAttacking ? "attacking" : ""}`}>
        <div className="battle-sparkle">✨</div>
        <div className="battle-monster">
          {monsterHealth === 0 ? "👑" : currentMonster.emoji}
        </div>
        {isAttacking && <div className="damage-number">-25 HP!</div>}
      </div>

<div className="monster-stats">
  <div className="monster-name">
    <strong>
      {monsterHealth === 0
        ? `${currentMonster.name} Defeated!`
        : currentMonster.name}
    </strong>

    <span>
      {monsterHealth} / {currentMonster.maxHp} HP
    </span>
  </div>

  <div className="monster-health-track">
    <div
      className="monster-health-fill"
      style={{ width: `${monsterHealthPercent}%` }}
    />
  </div>
</div>


      <p className="battle-message">{battleMessage}</p>

   

{monsterHealth === 0 && (
  <div className="battle-victory treasure-reveal">
    <div className="treasure-chest">🎁</div>

    <h3>🏆 {currentMonster.name} Defeated!</h3>

    <p>You cleared this battle. Amazing work!</p>

    <div className="treasure-reward">
      🪙 Battle reward: {currentMonster.reward} coins
    </div>

    {monsterIndex < MONSTERS.length - 1 ? (
      <button
        type="button"
        className="primary-button"
        
onClick={async () => {
  try {
    const response = await fetch(
      `${API_URL}/monster-battle/${userId}/next`,
      { method: "POST" }
    );

    if (!response.ok) {
      throw new Error(await readError(response));
    }

    const battle = await response.json();

    const nextIndex = MONSTERS.findIndex(
      (monster) => monster.name === battle.monsterName
    );

    if (nextIndex < 0) {
      throw new Error("Unknown monster returned by server.");
    }

    setMonsterIndex(nextIndex);
    setUnlockedMonsterCount(nextIndex + 1);
    setMonsterHp(Number(battle.currentHp));
    setBattleVictory(Boolean(battle.defeated));

    setBattleMessage(
      `⚔️ ${battle.monsterName} appeared! Complete quests to attack!`
    );
    setNotice("");
  } catch (error) {
    setNotice(`⚠️ ${error.message || "Could not start the next battle."}`);
  }
}}

      >
        ⚔️ Fight {MONSTERS[monsterIndex + 1].name}
      </button>
    ) : (
      <p>👑 You defeated all available monsters!</p>
    )}
  </div>
)}
    </div>

<div className="monster-collection">
  <h3>🐾 Monster Collection</h3>
  <p>Defeat monsters to unlock your next challenge!</p>

  <div className="monster-collection-grid">
    {MONSTERS.map((monster, index) => {
      const unlocked = index < unlockedMonsterCount;
      const defeated = index < monsterIndex;
      const current = index === monsterIndex;
      return (
        <div
          key={monster.id}
          className={`monster-collection-card ${
            unlocked ? "unlocked" : "locked"
          } ${current ? "current" : ""} ${defeated ? "defeated" : ""}`}
        >
          <span className="collection-monster">
            {unlocked ? monster.emoji : "🔒"}
          </span>

          <strong>
            {unlocked ? monster.name : "Locked Monster"}
          </strong>

       <span>
  {defeated
    ? "🏆 Defeated"
    : current
      ? "⚔️ Fighting Now"
      : "🔒 Locked"}
</span>

          <small>{monster.maxHp} HP</small>
        </div>
      );
    })}
  </div>
</div>

    {/* Existing daily quests continue below */}

            <div className="section-heading">
              <div>
                <h2>⚔️ Today's Quests</h2>
                <p>Complete activities to earn XP and coins!</p>
              </div>
            </div>

            {loading ? (
              <p>Loading your quests... ✨</p>
            ) : dailyQuests.length === 0 && quests.length === 0 ? (
              <p>No quests found. Check whether your backend is running.</p>
            ) : (
              <div className="quest-grid">
                {(dailyQuests.length > 0 ? dailyQuests : quests).map((quest) => {
                  const done = completedIds.includes(quest.id);

                  return (
                    <article
                      className={`quest-card ${quest.color}`}
                      key={quest.id}
                    >
                      <div className="quest-icon">{quest.icon}</div>
                      <span className="quest-label">DAILY QUEST</span>
                      <h3>{quest.name}</h3>
                      <p>{quest.description}</p>

                      <div className="quest-target">
                        Target:{" "}
                        <strong>
                          {quest.target} {quest.unit}
                        </strong>
                      </div>

                      <div className="quest-progress">
                        <div
                          style={{ width: done ? "100%" : "0%" }}
                        />
                      </div>

                      <div className="rewards">
                        <span>✨ +{quest.xp} XP</span>
                        <span>🪙 +{quest.coins}</span>
                      </div>

                      <button
                        className={`quest-button ${done ? "done" : ""}`}
                        onClick={() => updateQuest(quest)}
                        disabled={done || completingId !== null}
                      >
                        {done
                          ? "✓ Quest Completed"
                          : completingId === quest.id
                            ? "Saving..."
                            : "Complete Quest →"}
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Original Castle Map */}
        {activeTab === "Map" && (
          <section className="content-section">
            <CastleMap
  level={level}
  xp={xp}
  quests={quests}
  onCompleteQuest={updateQuest}
  onGoToQuests={() => setActiveTab("Quests")}
/>
          </section>
        )}
        
{/* AI Workout */}
{activeTab === "AI Workout" && (
  <section className="content-section">
    {console.log("Daily quests in App:", dailyQuests)}
    
<WebcamWorkout
  userId={userId}
  quests={[...dailyQuests, ...quests]}
  onQuestCompleted={async () => {
    await loadProgress();
    await loadRewards();
    await loadAchievements();
    await loadQuests();
    await loadDailyQuests();
  }}
/>

  </section>
)}


        {/* Achievements */}
        {activeTab === "Achievements" && (
          <section className="content-section">
            <div className="section-heading">
              <div>
                <h2>🏆 Achievements & Badges</h2>
                <p>
                  Complete quests, earn badges, and become a legend!
                </p>
              </div>
            </div>

            {achievementError && (
              <div className="error-message" role="alert">
                {achievementError}
              </div>
            )}

            {!achievementError && achievements.length === 0 ? (
              <div className="empty-history">
                <span>🔒</span>
                <h3>Your adventure is just beginning!</h3>
                <p>Complete quests to unlock your first badge.</p>
                <button
                  className="primary-button"
                  onClick={loadAchievements}
                >
                  Refresh Achievements
                </button>
              </div>
            ) : (
              <div className="reward-grid">
                {achievements.map((item, index) => {
                  const badge = item.achievement ?? item;
                  const unlocked =
                    item.unlocked ??
                    item.earned ??
                    Boolean(item.achievementId);

                  return (
                    <article
                      className="reward-card"
                      key={item.id ?? badge.id ?? badge.code ?? index}
                      style={{
                        opacity: unlocked ? 1 : 0.65,
                        border: unlocked
                          ? "2px solid #e6b85c"
                          : "1px solid #aaa",
                      }}
                    >
                      <div className="reward-icon">
                        {unlocked ? badge.icon || "🏆" : "🔒"}
                      </div>

                      <h3>
                        {badge.name || badge.code || "Achievement"}
                      </h3>

                      <p>
                        {badge.description ||
                          "Complete quests to earn this badge."}
                      </p>

                      <div className="reward-cost">
                        {unlocked
                          ? "✨ Badge Unlocked!"
                          : "🔒 Not Unlocked"}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Rewards */}
        {activeTab === "Rewards" && (
          <section className="content-section">
            <div className="section-heading">
              <div>
                <h2>🎁 Royal Rewards</h2>
                <p>Spend your coins to unlock magical items!</p>
              </div>
              <div className="reward-wallet">🪙 {coins} Coins</div>
            </div>

            <div className="reward-grid">
              {REWARDS.map((reward) => {
                const unlocked = unlockedRewards.includes(reward.id);

                return (
                  <article className="reward-card" key={reward.id}>
                    <div className="reward-icon">{reward.icon}</div>
                    <h3>{reward.name}</h3>

                    <p>
                      {unlocked
                        ? "This magical reward is yours!"
                        : `Unlock this reward for ${reward.cost} coins.`}
                    </p>

                    <div className="reward-cost">
                      {unlocked
                        ? "✨ Unlocked"
                        : `🪙 ${reward.cost} Coins`}
                    </div>

                    <button
                      className="reward-button"
                      disabled={unlocked}
                      onClick={() => unlockReward(reward)}
                    >
                      {unlocked ? "✓ Unlocked" : "Unlock Reward"}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* History */}
        {activeTab === "History" && (
          <section className="content-section">
            <h2>📜 Quest History</h2>
            <p>Look back at all the adventures you've completed.</p>

            {questHistory.length === 0 ? (
              <div className="empty-history">
                <span>📖</span>
                <h3>Your story starts here!</h3>
                <p>
                  Complete your first quest to add it to your history.
                </p>
              </div>
            ) : (
              <div className="history-list">
                {questHistory.map((item, index) => (
                  <article
                    className="history-card"
                    key={
                      item.questId ??
                      item.id ??
                      item.completedAt ??
                      index
                    }
                  >
                    <div className="history-icon">🏆</div>

                    <div className="history-details">
                      <h3>{item.questTitle || "Completed Quest"}</h3>
                      <p>
                        {item.completedAt
                          ? new Date(item.completedAt).toLocaleString()
                          : "Completed"}
                      </p>
                    </div>

                    <div className="history-xp">
                      +{item.xpEarned ?? 0} XP
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        <footer>
          🌈 Every quest counts. Keep moving, hero!
        </footer>
      </main>
    </div>
  );
}

export default App;