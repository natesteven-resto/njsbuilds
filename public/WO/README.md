# Daily movement — local workout package

Open **index.html** in a browser. Keep all files together. No installation, server, network, fonts service, or CDN is needed. If using the ZIP, extract it first.

## Workout

- 15 exercises, 60 seconds each, in the order shown in the video.
- 10 seconds of transition/rest between exercises by default; adjustable from 0–300 seconds. This is a **website setting, not an instruction from the video**. Changes affect the next rest period, not one already underway. Settings are remembered when browser storage is available.
- Default total: **17 minutes 20 seconds** (15 minutes of work + 14 transitions). No final rest period.
- Start/resume, Pause, Restart workout, Previous and Next. Navigation resets the selected exercise to 60 seconds and preserves running/paused state. Restart returns to the first exercise, paused. Next on the last exercise ends the session.
- Countdown follows elapsed clock time; returning from a backgrounded tab catches up. Pause before leaving if you want the workout to wait.
- The screen is kept awake while running when the browser grants a Screen Wake Lock. Pausing or finishing releases it. The page displays whether this succeeded. OS/browser restrictions may prevent wake lock, especially in local-file contexts. Reference: https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API

## Media and confidence

All 15 clips are muted H.264 MP4s with web-friendly pixel format and fast-start metadata. Useful movement portions were selected and loop endpoints matched by image/pose similarity and motion direction. Normal forward motion is retained: no reversed motion, synthetic interpolation or blended body poses. Some loop seams remain visible due to the short source demonstrations.

Only top/bottom interface margins are cropped. Full source width and the bottom picture edge are preserved; embedded social overlays remain where removing them would cost useful positioning. The pushup shot already puts extremities at or beyond the original picture edges; missing source detail cannot be restored.

The original video was not modified, moved or deleted. Its SHA-256 is recorded in workout.json and verified after processing.

The source prescribes one minute per exercise, not a rep count. Sets, rest and per-side durations are not stated. The one-pass sequence is a website playback choice. The video headline says 20 minutes, but only 15 minutes of exercise are specified; the extra five minutes are unexplained. Form notes describe visible movement, not spoken instructions. No medical or outcome claims from the video are adopted here.

## Files

- `index.html`, `style.css`, `app.js`: local player.
- `workout.json`: reusable metadata, source timestamps, confidence notes and website defaults.
- `workout-data.js`: identical metadata wrapped for direct local loading without fetch/CORS restrictions.
- `01-…mp4` through `15-…mp4`: exercise clips; matching JPGs are thumbnails.
- `verification/`: media, browser-flow and wake-lock check reports plus visual review sheets/screenshots.

If editing workout.json, regenerate workout-data.js with Python 3:

```sh
python3 sync-workout-data.py
```

## Verification scope

All 15 clips fully decoded with FFmpeg and each thumbnail opened successfully. Every clip played and looped in Chrome using a file:// URL (no server). The complete 15-work/14-rest session was tested with an accelerated clock, as were pause/resume, restart, navigation, zero/custom rest, changing a future rest, and session completion. Mobile widths of 320 and 390 pixels and a desktop width of 1280 pixels were checked. Wake-lock grant/release and denial handling were tested.

A physical iPhone/Android phone was not tested. Local HTML support depends on the phone's browser/file viewer; some file preview apps do not run HTML or allow sibling videos. Use a browser that supports local HTML with relative media files. No claim is made that every mobile file viewer supports this package.
