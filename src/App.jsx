import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Upload } from "lucide-react";

const generateSampleData = () => {
  const recordings = [];
  const startHour = 0;

  for (let i = 0; i < 24; i++) {
    const hour = (startHour + i) % 24;
    const timestamp = new Date(2024, 0, 1, hour, 0, 0);

    // Simulate realistic noise patterns
    let mean_rms = 0.1;
    let peak_rms = 0.3;

    // Morning activity (6-9)
    if (hour >= 6 && hour <= 9) {
      mean_rms = 0.4;
      peak_rms = 0.8;
    }
    // Daytime moderate (9-17)
    else if (hour >= 9 && hour <= 17) {
      mean_rms = 0.25;
      peak_rms = 0.5;
    }
    // Evening activity (17-22)
    else if (hour >= 17 && hour <= 22) {
      mean_rms = 0.35;
      peak_rms = 0.7;
    }
    // Night quiet (22-6)
    else {
      mean_rms = 0.05;
      peak_rms = 0.15;
    }

    // Add some randomness
    mean_rms += (Math.random() - 0.5) * 0.1;
    peak_rms += (Math.random() - 0.5) * 0.2;

    recordings.push({
      filename: `recording_${hour}`,
      timestamp: timestamp.toISOString(),
      duration_seconds: 3600,
      mean_rms: Math.max(0, mean_rms),
      peak_rms: Math.max(0, peak_rms),
      output_file: `recording_${hour}_anonymized.mp3`,
    });
  }

  return {
    date: "2024-01-01",
    recordings: recordings,
    total_duration: recordings.length * 3600,
  };
};

const getColorForIntensity = (intensity) => {
  if (intensity < 0.15) return "rgb(59, 130, 246)"; // blue - quiet
  if (intensity < 0.3) return "rgb(34, 197, 94)"; // green - low
  if (intensity < 0.5) return "rgb(234, 179, 8)"; // yellow - medium
  if (intensity < 0.7) return "rgb(249, 115, 22)"; // orange - high
  return "rgb(239, 68, 68)"; // red - very loud
};

const formatTime = (hour) => {
  return `${hour.toString().padStart(2, "0")}:00`;
};

const AudioSegmentBar = ({
  recording,
  idx,
  maxPeak,
  selectedEvent,
  playAudio,
}) => {
  const hour = new Date(recording.timestamp)
    .toLocaleTimeString()
    .substring(0, 5);
  const size = (recording.peak_rms / maxPeak) * 100;
  const color = getColorForIntensity(recording.mean_rms * 6);
  const selected = selectedEvent?.filename === recording.filename;
  const [hovered, setHovered] = useState(false);
  const hoverTimeout = useRef(null);
  const barRef = useRef(null);

  return (
    <div
      key={idx}
      className="flex items-center group cursor-pointer w-full mb-1 box-border"
      onClick={() => playAudio(recording, barRef.current)}
    >
      <div className="font-sm text-gray-500 mr-2">{hour}</div>
      <div
        ref={barRef}
        className={`w-full flex items-center rounded audio-bar ${
          selected ? "ring-2 ring-blue-400" : ""
        }
          hover:ring-1 hover:ring-gray-400
          `}
        onMouseEnter={() => {
          hoverTimeout.current = setTimeout(() => setHovered(true), 500); // ⏳ delay 2s
        }}
        onMouseLeave={() => {
          if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
          setHovered(false);
        }}
        style={{
          width: `${size}%`,
          backgroundColor: color,
          "--bar-color": color, // ✅ pass RMS color to CSS variable
          minHeight: "4px",
          transition: "height 0.2s ease-in-out",
          height: hovered ? "4em" : "2em",
        }}
      >
        {hovered &&
          recording.rms_values.map((val, valIndex) => {
            return (
              <div
                key={valIndex}
                className="group-hover:opacity-100 transition flex-1"
                style={{
                  height: `${(val / recording.peak_rms) * 100}%`,
                  backgroundColor: "#00000033",
                  marginLeft: "1px",
                  // minHeight: "4px",
                }}
              />
            );
          })}
      </div>
    </div>
  );
};

export default function NoiseMonitor() {
  const [timelineData, setTimelineData] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);
  const activeBarRef = useRef(null);
  const previousBarRef = useRef(null);

  // Generate sample data for demo

  useEffect(() => {
    // Load timeline_data.json from public folder
    fetch("./out/timeline_data.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load timeline data");
        }
        return response.json();
      })
      .then((data) => {
        setTimelineData(data);
      })
      .catch((err) => {
        console.error("Error loading timeline data:", err);
        // Fallback to sample data if file not found
        setTimelineData(generateSampleData());
      });
  }, []);

  const playAudio = (event, barEl) => {
    // reset previous bar if exists
    if (activeBarRef.current && activeBarRef.current !== barEl) {
      previousBarRef.current = activeBarRef.current;
      previousBarRef.current.style.transition = "var(--progress) 0.3s ease";
      previousBarRef.current.style.setProperty("--progress", "0%");
    }

    // set new active bar
    activeBarRef.current = barEl;

    if (audioRef.current) {
      if (isPlaying && selectedEvent?.filename === event.filename) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        setSelectedEvent(event);
        // Load the audio file from public folder
        audioRef.current.src = `${import.meta.env.VITE_FILES_FOLDER}${
          event.output_file
        }`;
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.error("Error playing audio:", err);
            alert("Could not play audio file");
            setIsPlaying(false);
          });

        const updateProgress = () => {
          const audio = audioRef.current;
          if (!audio.duration) return;
          const p = (audio.currentTime / audio.duration) * 100;
          // setProgress(p);
          activeBarRef.current.style.setProperty("--progress", `${p}%`);
          // or directly update CSS variable:
          // barRef.current?.style.setProperty("--progress", `${p}%`);
        };

        // update every 100ms (10 times per second)
        const interval = setInterval(updateProgress, 200);

        // clear when paused or unmounted
        return () => clearInterval(interval);
      }
    }
  };

  if (!timelineData) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <h1 className="text-3xl font-bold">Loading...</h1>
      </div>
    );
  }

  const recordings = timelineData.recordings || [];
  const maxPeak = Math.max(...recordings.map((r) => r.peak_rms || 0));

  return (
    <div className="min-h-screen w-full p-4 box-border">
      {/* Header */}
      <div className="w-full mx-auto mb-1 p-6">
        <h1 className="text-4xl font-bold mb-1">Road Noise</h1>
        <p className="font-bold">
          a awkward everyday experience by{" "}
          <a href="https://github.com/bruno-langer" target="_blank">
            bruno-langer
          </a>
        </p>
      </div>

      {/* 24-Hour Heatmap */}
      <div className="w-full mx-auto mb-8 box-border p-6">
        <div className="rounded-lg ">
          <h2 className="text-xl font-bold mb-4">
            Follow a day in a busy road to see how noisy it is
          </h2>
          <span>
            The samples above are a <strong>anonymized version</strong> of the
            recordings from a external security camera in my house
          </span>
          <p>
            Each bar represents a segment with aproximately 1 minutes of audio
            each.
            <br />
            The color represents the intensity of the noise.
            <br />
            The size represents how loud the noise is. The peak of the noise in
            RMS.
          </p>
          <div className="my-4 border-3 border-dashed border-gray-300 p-4">
            <details>
              <summary>
                <strong>Additional info for nerds</strong>
              </summary>
              <p>
                The anonymization process was done using python and a chain of
                functions. <br />
                1.Computation of the RMS with a 250ms frame <br />
                2.Use of Pink and Brown noise mapping the dynamics of the audio{" "}
                <br />
                3.Frequency Shaping using SciPy firwin2 <br />
                4.Basic Compression / Limiting of the audio <br />
                5.Compression to MP3 | 96kbps | 16kHz Sample to reduce file size{" "}
                <br />
                PS : There's a lot of help from AI in the processing code of the
                audio, don't take me wrong, I'm just trying to remove the ideas
                from my head.
              </p>
            </details>
          </div>
          <div className="flex items-center gap-6 my-6 text-xs">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: "rgb(59, 130, 246)" }}
              />
              <span className="text-gray-400">Quiet</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: "rgb(34, 197, 94)" }}
              />
              <span className="text-gray-400">Low</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: "rgb(234, 179, 8)" }}
              />
              <span className="text-gray-400">Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: "rgb(249, 115, 22)" }}
              />
              <span className="text-gray-400">High</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: "rgb(239, 68, 68)" }}
              />
              <span className="text-gray-400">Very Loud</span>
            </div>
          </div>
          {isPlaying && selectedEvent ? (
            <div className="flex items-center gap-2 text-gray-300">
              <Pause size={18} onClick={() => audioRef.current.pause()} />
              <span>
                Playing {new Date(selectedEvent.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-400">
              <Play size={18} />
              <span>Click a bar to play</span>
            </div>
          )}

          <div className="flex flex-col w-[100%]">
            {recordings.map((recording, idx) => (
              <AudioSegmentBar
                key={idx}
                recording={recording}
                idx={idx}
                maxPeak={maxPeak}
                selectedEvent={selectedEvent}
                playAudio={playAudio}
              />
            ))}
          </div>

          {/* Color Legend */}
        </div>
      </div>

      {/* Hidden audio element for playback */}
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />
    </div>
  );
}
