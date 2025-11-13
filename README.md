# Audio Anonymizer and Timeline Generator

This project processes long environmental audio recordings, anonymizing them by replacing the original sound with synthetic noise that preserves the same loudness and timing. It outputs anonymized MP3 files and a JSON timeline for web visualization.

---

## Features

* Generates Brown and Pink noise shaped by the RMS envelope of the original audio
* Maintains loudness dynamics while removing identifiable sounds
* Applies peak limiting to prevent distortion
* Converts to compressed mono MP3 for web playback
* Extracts metadata and timestamps for each file
* Outputs a timeline JSON for visualization

---

## Processing Chain

1. Load original `.wav` file
2. Compute RMS envelope over 250 ms frames
3. Generate Brown and Pink noise
4. Match noise loudness to original RMS profile
5. Apply peak limiter
6. Export anonymized `.mp3`
7. Save metadata to `timeline_data.json`

---

## Output Structure

```
anonymized_output/
├── 1762777334516-79900-allday_anonymized.mp3
├── 1762895897078-5200-allday_anonymized.mp3
└── timeline_data.json
```

---

## Example Metadata

```json
{
  "filename": "1762777334516-79900-allday",
  "timestamp": "2025-11-11T06:00:00",
  "duration_seconds": 3600,
  "sample_rate": 44100,
  "peak_rms": 0.82,
  "mean_rms": 0.36,
  "output_file": "1762777334516-79900-allday_anonymized.mp3"
}
```

---

## Requirements

* Python 3.10+
* ffmpeg
* numpy, librosa, soundfile, audiocomplib

---

## Frontend Visualization

The frontend displays the anonymized day timeline as a vertical scroll of horizontal bars, each representing one sound file.

* Bars are colored by sound intensity (RMS level).
* Hover reveals the internal RMS shape of each segment.
* Clicking a bar plays the corresponding anonymized sound.
* Progress is visualized with a gradient effect using CSS variables.

### Example structure

```tsx
<AudioSegmentBar
  recording={recording}
  progress={progress}
  playAudio={playAudio}
/>
```

### CSS example

```css
.audio-bar {
  background: linear-gradient(
    to right,
    var(--bar-color) var(--progress),
    #ccc var(--progress)
  );
  transition: height 0.25s ease-in-out;
}
```
