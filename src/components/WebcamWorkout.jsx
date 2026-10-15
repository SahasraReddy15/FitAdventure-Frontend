
import { useCallback, useEffect, useRef, useState } from "react";

import {
  DrawingUtils,
  FilesetResolver,
  PoseLandmarker,
} from "@mediapipe/tasks-vision";

import "./WebcamWorkout.css";

const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

function calculateAngle(a, b, c) {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) -
    Math.atan2(a.y - b.y, a.x - b.x);

  const angle = Math.abs((radians * 180) / Math.PI);

  return angle > 180 ? 360 - angle : angle;
}

function formatTime(total) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    seconds
  ).padStart(2, "0")}`;
}

function getErrorMessage(error) {
  const name = error?.name;
  const message = error?.message || "";

  if (
    name === "NotAllowedError" ||
    name === "PermissionDeniedError"
  ) {
    return "Camera permission was denied. Allow camera access in Chrome site settings, then try again.";
  }

  if (
    name === "NotFoundError" ||
    name === "DevicesNotFoundError"
  ) {
    return "No camera was found. Connect or enable a camera and try again.";
  }

  if (
    name === "NotReadableError" ||
    name === "TrackStartError"
  ) {
    return "Your camera may be in use by another app. Close other camera apps and try again.";
  }

  if (name === "OverconstrainedError") {
    return "The camera does not support the requested settings. Try another camera.";
  }

  if (name === "SecurityError") {
    return "Camera access is blocked. Open FitAdventure on localhost or HTTPS.";
  }

  if (/fetch|network|load failed|failed to fetch/i.test(message)) {
    return "The AI engine could not download its files. Check your internet connection and try again.";
  }

  return message || "The workout could not start. Check the Console for details.";
}

export default function WebcamWorkout({
  userId,
  quests = [],
  onQuestCompleted,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const poseRef = useRef(null);
  const frameRef = useRef(null);
  const runningRef = useRef(false);
  const phaseRef = useRef("up");
  const repsRef = useRef(0);
  const lastRepRef = useRef(0);
  const startTimeRef = useRef(0);
  const lastMessageRef = useRef(0);
  const lastStatusRef = useRef("");

  const [reps, setReps] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("ready");
  const [selectedQuestId, setSelectedQuestId] = useState("");
  const [savingQuest, setSavingQuest] = useState(false);
  const [message, setMessage] = useState(
    "Set up your camera and get ready to move."
  );
console.log("All quests:", quests);
  // Only show quests whose activity type is SQUATS.
  const squatQuests = quests.filter((quest) => {
  const type = String(quest.activityType ?? "")
    .trim()
    .toUpperCase();

  return type === "SQUATS" || type === "SQUAT";
});

  const selectedQuest = squatQuests.find(
    (quest) => String(quest.id) === String(selectedQuestId)
  );

  const stopResources = useCallback(() => {
    runningRef.current = false;

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    const video = videoRef.current;

    if (video) {
      video.pause();
      video.srcObject = null;
    }

    if (poseRef.current) {
      poseRef.current.close();
      poseRef.current = null;
    }

    setRunning(false);
  }, []);

  useEffect(() => {
    if (!running) return undefined;

    const timer = window.setInterval(() => {
      setSeconds(
        Math.floor((Date.now() - startTimeRef.current) / 1000)
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    return () => {
      runningRef.current = false;

      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());

      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }

      if (poseRef.current) {
        poseRef.current.close();
      }
    };
  }, []);

  async function startWorkout() {
    if (loading || runningRef.current) return;

    if (!selectedQuest) {
      setStatus("ready");
      setMessage("Choose a squat quest before starting your workout.");
      return;
    }

    let newPose = null;
    let newStream = null;

    try {
      setLoading(true);
      setStatus("loading");
      setMessage("Checking camera and preparing the AI engine...");

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Camera access is unavailable. Open FitAdventure using localhost or HTTPS in a supported browser."
        );
      }

      setMessage("Requesting camera access...");

      newStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      const video = videoRef.current;

      if (!video) {
        throw new Error("The camera video element could not be found.");
      }

      video.muted = true;
      video.playsInline = true;

      const metadataPromise = new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          cleanup();
          reject(new Error("The camera did not start in time. Try again."));
        }, 10000);

        function cleanup() {
          window.clearTimeout(timeout);
          video.removeEventListener("loadedmetadata", onLoaded);
          video.removeEventListener("error", onError);
        }

        function onLoaded() {
          cleanup();
          resolve();
        }

        function onError() {
          cleanup();
          reject(
            new Error(
              "The browser could not display the camera video. Close other camera apps and retry."
            )
          );
        }

        video.addEventListener("loadedmetadata", onLoaded, {
          once: true,
        });

        video.addEventListener("error", onError, { once: true });
      });

      video.srcObject = newStream;
      await metadataPromise;
      await video.play();

      setMessage("Loading AI pose tracking files...");

      let vision;

      try {
        vision = await FilesetResolver.forVisionTasks(WASM_URL);
      } catch (error) {
        console.error("MediaPipe WASM loading failed:", error);

        throw new Error(
          "Could not load the AI engine files. Check your internet connection and browser Console."
        );
      }

      setMessage("Preparing the AI body tracker...");

      try {
        newPose = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      } catch (gpuError) {
        console.warn(
          "GPU pose tracking unavailable; trying CPU:",
          gpuError
        );

        try {
          newPose = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: MODEL_URL,
              delegate: "CPU",
            },
            runningMode: "VIDEO",
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        } catch (cpuError) {
          console.error("AI model loading failed:", cpuError);

          throw new Error(
            "The AI model could not load. Check your internet connection and whether the model URL is accessible."
          );
        }
      }

      poseRef.current = newPose;
      streamRef.current = newStream;

      newPose = null;
      newStream = null;

      repsRef.current = 0;
      phaseRef.current = "up";
      lastRepRef.current = 0;
      lastMessageRef.current = 0;
      lastStatusRef.current = "";
      startTimeRef.current = Date.now();

      setReps(0);
      setSeconds(0);
      setRunning(true);
      setStatus("tracking");
      setMessage(
        "Stand sideways to the camera. Keep your hips, knees and ankles visible."
      );

      runningRef.current = true;
      detectFrame();
    } catch (error) {
      console.error("Workout startup failed:", error);

      newPose?.close();
      newStream?.getTracks().forEach((track) => track.stop());

      stopResources();

      setStatus("error");
      setMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  function detectFrame() {
    if (!runningRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const pose = poseRef.current;

    if (
      !video ||
      !canvas ||
      !pose ||
      video.readyState < 2 ||
      !video.videoWidth
    ) {
      frameRef.current = requestAnimationFrame(detectFrame);
      return;
    }

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      setStatus("error");
      setMessage("Could not create the camera drawing area.");
      stopResources();
      return;
    }

    if (
      canvas.width !== video.videoWidth ||
      canvas.height !== video.videoHeight
    ) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    try {
      const result = pose.detectForVideo(video, performance.now());

      if (result.landmarks?.length) {
        const landmarks = result.landmarks[0];
        const points = landmarks.slice(23, 33);
        const drawing = new DrawingUtils(ctx);

        drawing.drawConnectors(
          landmarks,
          PoseLandmarker.POSE_CONNECTIONS,
          {
            color: "#b9ff66",
            lineWidth: 3,
          }
        );

        drawing.drawLandmarks(landmarks, {
          color: "#ffffff",
          fillColor: "#9b5cff",
          lineWidth: 1,
          radius: 4,
        });

        
const leftHip = landmarks[23];
const leftKnee = landmarks[25];
const leftAnkle = landmarks[27];

const rightHip = landmarks[24];
const rightKnee = landmarks[26];
const rightAnkle = landmarks[28];

const isVisible = (point) =>
  point && (point.visibility ?? 1) > 0.5;

const leftVisible =
  isVisible(leftHip) &&
  isVisible(leftKnee) &&
  isVisible(leftAnkle);

const rightVisible =
  isVisible(rightHip) &&
  isVisible(rightKnee) &&
  isVisible(rightAnkle);

// Use whichever leg the camera can see clearly.
let kneeAngle = null;

if (leftVisible && rightVisible) {
  const leftAngle = calculateAngle(
    leftHip,
    leftKnee,
    leftAnkle
  );

  const rightAngle = calculateAngle(
    rightHip,
    rightKnee,
    rightAnkle
  );

  kneeAngle = (leftAngle + rightAngle) / 2;
} else if (leftVisible) {
  kneeAngle = calculateAngle(
    leftHip,
    leftKnee,
    leftAnkle
  );
} else if (rightVisible) {
  kneeAngle = calculateAngle(
    rightHip,
    rightKnee,
    rightAnkle
  );
}

if (kneeAngle !== null) {
  const now = Date.now();

  if (kneeAngle < 110 && phaseRef.current === "up") {
    phaseRef.current = "down";
    setMessage("Good! Now stand back up.");
    setStatus("tracking");
  } else if (
    kneeAngle > 155 &&
    phaseRef.current === "down" &&
    now - lastRepRef.current > 700
  ) {
    phaseRef.current = "up";
    lastRepRef.current = now;
    repsRef.current += 1;

    setReps(repsRef.current);
    setMessage("Squat completed! Keep going!");
    setStatus("tracking");
  }
} else {
  setStatus("position");
  setMessage(
    "I can't see your legs clearly. Move back and keep your hip, knee and ankle visible."
  );
}


        const visible = points.every(
          (point) =>
            point &&
            (point.visibility === undefined || point.visibility > 0.5)
        );

        if (visible) {
          const leftAngle = calculateAngle(
            landmarks[23],
            landmarks[25],
            landmarks[27]
          );

          const rightAngle = calculateAngle(
            landmarks[24],
            landmarks[26],
            landmarks[28]
          );

          const kneeAngle = (leftAngle + rightAngle) / 2;
          const now = Date.now();

          if (kneeAngle < 105 && phaseRef.current === "up") {
            phaseRef.current = "down";

            if (now - lastMessageRef.current > 1000) {
              setMessage("Nice! Now stand back up.");
              lastMessageRef.current = now;
            }

            if (lastStatusRef.current !== "tracking") {
              setStatus("tracking");
              lastStatusRef.current = "tracking";
            }
          } else if (
            kneeAngle > 160 &&
            phaseRef.current === "down" &&
            now - lastRepRef.current > 700
          ) {
            phaseRef.current = "up";
            lastRepRef.current = now;
            repsRef.current += 1;

            setReps(repsRef.current);
            setMessage("Squat completed! Keep going!");
            lastMessageRef.current = now;
          }
        } else if (lastStatusRef.current !== "position") {
          setStatus("position");
          lastStatusRef.current = "position";
          setMessage("Keep your hips, knees and ankles visible.");
        }
      } else if (lastStatusRef.current !== "position") {
        setStatus("position");
        lastStatusRef.current = "position";
        setMessage("Move back until your full body is visible.");
      }
    } catch (error) {
      console.error("AI pose tracking failed:", error);

      setStatus("error");
      setMessage(
        "AI tracking stopped unexpectedly. Check the browser Console for details."
      );

      stopResources();
      return;
    }

    if (runningRef.current) {
      frameRef.current = requestAnimationFrame(detectFrame);
    }
  }

  function finishWorkout() {
    const finalReps = repsRef.current;

    const duration = Math.floor(
      (Date.now() - startTimeRef.current) / 1000
    );

    stopResources();

    setSeconds(duration);
    setStatus("finished");

    if (selectedQuest && finalReps >= Number(selectedQuest.target)) {
      setMessage(
        `Great job! You completed ${finalReps} squats and reached your quest target of ${selectedQuest.target}. Quest reward saving is not connected yet.`
      );
    } else {
      setMessage(
        `Workout finished! You completed ${finalReps} squats in ${formatTime(duration)}. ${
          selectedQuest
            ? `Your target is ${selectedQuest.target} squats. Keep going to complete the quest.`
            : "Choose a squat quest to get started."
        }`
      );
    }
  }

  function resetWorkout() {
    stopResources();

    repsRef.current = 0;
    phaseRef.current = "up";
    lastRepRef.current = 0;
    lastMessageRef.current = 0;
    lastStatusRef.current = "";

    setReps(0);
    setSeconds(0);
    setStatus("ready");
    setMessage("Set up your camera and get ready to move.");
  }

  return (
    <section className="wa-workout">
      <div className="wa-workout-header">
        <div>
          <span className="wa-eyebrow">
            FITADVENTURE TRAINING GROUNDS
          </span>

          <h2>⚔️ AI Training Arena</h2>
          <p>Train in real life. Grow stronger in your adventure.</p>
        </div>

        <span className={`wa-status wa-status-${status}`}>
          <span className="wa-status-dot" />

          {status === "tracking"
            ? "TRACKING"
            : status === "loading"
              ? "PREPARING"
              : status === "position"
                ? "ADJUST POSITION"
                : status === "finished"
                  ? "FINISHED"
                  : status === "error"
                    ? "CHECK CAMERA"
                    : "READY"}
        </span>
      </div>

      {/* Quest selector is outside the header */}
      <div className="wa-quest-selector">
        <label htmlFor="squatQuest">Choose your squat quest</label>

        <select
          id="squatQuest"
          value={selectedQuestId}
          onChange={(event) => setSelectedQuestId(event.target.value)}
          disabled={running || loading || savingQuest}
        >
          <option value="">-- Select a squat quest --</option>

          {squatQuests.map((quest) => (
            <option key={quest.id} value={String(quest.id)}>
              {quest.name} — Target: {quest.target} squats
            </option>
          ))}
        </select>

        {squatQuests.length === 0 && (
          <p>No squat quests available right now.</p>
        )}

        {selectedQuest && (
          <p>
            Target: <strong>{selectedQuest.target} squats</strong>
            {" · "}
            Reward: <strong>{selectedQuest.xp} XP</strong>
          </p>
        )}
      </div>

      <div className="wa-workout-layout">
        <div className="wa-camera-column">
          <div className="wa-camera-frame">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="wa-video"
            />

            <canvas ref={canvasRef} className="wa-canvas" />

            {!running && (
              <div className="wa-camera-placeholder">
                <div className="wa-camera-icon">📷</div>

                <h3>
                  {status === "finished"
                    ? "Training complete!"
                    : "Ready, adventurer?"}
                </h3>

                <p>
                  {status === "finished"
                    ? "Start another session whenever you're ready."
                    : "Allow camera access to begin AI-powered training."}
                </p>
              </div>
            )}

            {running && (
              <span className="wa-live-label">
                <span /> LIVE AI TRACKING
              </span>
            )}
          </div>

          <div className="wa-camera-tip">
            <span>💡</span>
            <p>
              Place your camera far enough away to see your hips, knees and
              ankles. A side view works best for squats.
            </p>
          </div>
        </div>

        <div className="wa-stats-column">
          <div className="wa-stat-card wa-rep-card">
            <span className="wa-stat-icon">🏋️</span>
            <span className="wa-stat-label">SQUATS COMPLETED</span>
            <strong>{reps}</strong>
            <span className="wa-stat-footnote">
              AI-detected repetitions
            </span>
          </div>

          <div className="wa-stat-card">
            <span className="wa-stat-icon">⏱️</span>
            <span className="wa-stat-label">WORKOUT TIME</span>
            <strong>{formatTime(seconds)}</strong>
            <span className="wa-stat-footnote">Session duration</span>
          </div>

          <div className={`wa-feedback wa-feedback-${status}`}>
            <span className="wa-feedback-icon">
              {status === "error"
                ? "⚠️"
                : status === "finished"
                  ? "🏆"
                  : "✨"}
            </span>

            <div>
              <strong>Training guide</strong>
              <p>{message}</p>
            </div>
          </div>

          {!running ? (
            <button
              type="button"
              className="wa-primary-button"
              onClick={status === "finished" ? resetWorkout : startWorkout}
              disabled={loading || savingQuest}
            >
              {loading
                ? "Preparing AI..."
                : status === "finished"
                  ? "↻ New Workout"
                  : "📷 Start Workout"}
            </button>
          ) : (
            <button
              type="button"
              className="wa-stop-button"
              onClick={finishWorkout}
            >
              ■ Finish Workout
            </button>
          )}

          <p className="wa-privacy-note">
            🔒 Camera processing stays in your browser. This step does not
            upload or save video.
          </p>
        </div>
      </div>
    </section>
  );
}
