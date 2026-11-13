# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Image Studio** — AVIF output (with an up-front browser-support probe; a
  browser that cannot encode AVIF gets an honest per-file error instead of a
  mislabelled PNG), and exact-size resizing: centre-crop to social/link
  presets (1200×630, 1080×1080, 1080×1350, 1920×1080, 1080×1920) or custom
  dimensions, never upscaling a too-small source.
- **Subtitle Tools** — batch conversion: drop multiple .srt/.vtt files, apply
  the same format/shift/strip settings to all of them, download individually
  or as one zip.

## [1.0.0] - 2026-11-06

### Added

- **Image Studio** — batch compress (quality slider), convert
  (JPEG/PNG/WebP or keep format) and resize (max-dimension presets), with
  before/after sizes, savings percentage, per-file download and
  download-all-as-zip.
- **Metadata Stripper** — view a photo's EXIF (camera, date, software and
  GPS, with a plain-language warning when location is present) and strip it
  by re-encoding, with a re-read of the cleaned file as proof.
- **Video & Audio Studio** — ffmpeg.wasm powered convert (MP4/WebM),
  compress preset, animated GIF maker (width/fps/duration), audio
  extraction (MP3/WAV) and frame-accurate trim. ffmpeg argument
  construction is implemented as pure, unit-tested builder functions.
  Friendly, explanatory fallback when cross-origin isolation
  (SharedArrayBuffer) is unavailable.
- **Subtitle Tools** — SRT ↔ WebVTT conversion, timestamp shifting
  (clamped at zero), and formatting-tag stripping.
- **Transcribe (Beta)** — local Whisper (`whisper-tiny.en`) transcription
  via Transformers.js, loaded lazily, producing a plain transcript and a
  downloadable .srt.
- App shell: dark/light following the system theme, responsive layout,
  accessible controls, PWA manifest, persistent privacy notice.
- Self-hosting: multi-stage Dockerfile (nginx with COOP/COEP headers),
  `docker-compose.yml`, and a `_headers` file for Netlify-style hosts.
- Project scaffolding for contributors: MIT licence, Contributor Covenant
  code of conduct, contributing guide, security policy, issue/PR
  templates, and 76 unit tests covering the pure libraries.
