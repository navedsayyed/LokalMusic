# 🎵 LokalMusic

A full-featured offline-ready music player built with **React Native (Expo)** powered by the **JioSaavn API**. Supports streaming, downloads, playlists, artist browsing, lyrics, and background playback.

---

## 📱 Screenshots

| Home                            | Player                             | Library                           |
| ------------------------------- | ---------------------------------- | --------------------------------- |
| Browse trending songs & artists | Full player with seek, like, queue | Playlists, liked songs, downloads |

---

## 🔗 Links

| Resource     | URL                                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------------------- |
| GitHub Repo  | [github.com/navedsayyed/LokalMusic](https://github.com/navedsayyed/LokalMusic)                                      |
| APK Download | [APK Direct Download](https://github.com/navedsayyed/LokalMusic-Releases/releases/latest/download/LokalMusic.apk) |
| Demo Video   | [YouTube](https://youtu.be/8eBGl1OJ_2M?si=RowrYjMdyuSeKy9J)                                                                                               |

---

## ⚡ Quick Start

### Prerequisites

| Tool                   | Version                               |
| ---------------------- | ------------------------------------- |
| Node.js                | ≥ 18                                  |
| Expo CLI               | `npx expo` (no global install needed) |
| Android Studio / Xcode | For emulator (optional)               |
| Expo Go app            | For physical device testing           |

### 1. Install dependencies

```bash
cd LokalMusic
npm install
```

### 2. Start the dev server

```bash
npm start            # Expo dev server (scan QR with Expo Go)
npm run android      # Launch on Android emulator
npm run ios          # Launch on iOS simulator (macOS only)
```

### 3. Open on device

- Install **Expo Go** from the App Store / Play Store
- Scan the QR code shown in your terminal

> **Note:** No `.env` file is required — the app talks directly to the public JioSaavn API (`https://saavn.sumit.co/`).

---

## 🗂️ Project Structure

```
LokalMusic/
├── App.tsx                    # Entry point — navigation container
├── src/
│   ├── navigation/
│   │   ├── RootNavigator.tsx  # Root stack (tabs + Player/Artist/Album)
│   │   └── BottomTabs.tsx     # Tab bar (Home, Search, Library, Settings)
│   │
│   ├── screens/
│   │   ├── Home/              # Trending songs, artists, albums
│   │   ├── Search/            # Song, artist, album, playlist search
│   │   ├── Player/            # Full-screen player (seek, controls, queue)
│   │   ├── Playlist/          # Library — playlists, liked songs, downloads
│   │   ├── Settings/          # Theme, quality, EQ, notifications
│   │   ├── Artist/            # Artist hero + discography
│   │   └── Album/             # Album tracklist
│   │
│   ├── components/
│   │   └── music/
│   │       ├── MiniPlayer.tsx       # Persistent mini-player bar
│   │       ├── SongOptionsSheet.tsx # Bottom sheet (download, queue, like…)
│   │       ├── QueueSheet.tsx       # Draggable queue view
│   │       └── LyricsModal.tsx      # Synced lyrics overlay
│   │
│   ├── services/
│   │   ├── api/
│   │   │   └── music.api.ts         # JioSaavn API — search, getSongById, getArtist
│   │   └── player/
│   │       ├── audio.service.ts     # expo-av playback engine
│   │       └── download.service.ts  # expo-file-system offline download
│   │
│   ├── store/
│   │   ├── player.store.ts    # Queue, current song, playback state (Zustand)
│   │   ├── library.store.ts   # Playlists, liked songs, downloads (persisted)
│   │   ├── settings.store.ts  # Audio quality, theme preference
│   │   ├── ui.store.ts        # Mini-player visibility
│   │   └── theme.store.ts     # Dark / light mode
│   │
│   ├── hooks/
│   │   └── usePlayer.ts       # playFromSearch, togglePlayPause helpers
│   │
│   ├── theme/
│   │   └── colors.ts          # Dark & light palette tokens
│   │
│   └── types/
│       └── music.types.ts     # Song, Artist, Album TypeScript interfaces
```

---

## 📱 Application Screens

### Home Screen

The Home screen is the discovery and engagement hub with three main sections:

**Suggested** — Dynamic content blocks including Popular Songs, Recommendations, and Trending Songs fetched from the API.

**Songs** — Recently played and frequently played tracks for personalized listening.

**Artists** — Scrollable list of artists; tapping any opens the Artist Profile Screen.

**Albums** — Top albums; tapping opens the Album Details Screen.

### Search Screen

Results are divided into four tabs: **Songs**, **Playlists**, **Albums**, and **Artists**. Results update dynamically as you type. From search results you can play songs, visit artist profiles, open albums, or open playlists.

### Playlist Screen

Three sections manage your personal library:

- **Liked Songs** — Auto-generated playlist of all liked tracks. Supports shuffle and normal play.
- **Downloads** — Offline songs that play without internet. Local file takes priority over streaming.
- **Custom Playlists** — Create, rename, and delete playlists. Add or remove songs. Play normally or shuffled. All playlists persist locally.

### Artist Profile Screen

Displays artist image and name, trending songs, most played songs, and top albums. From here you can play, queue, like, download any song, or navigate directly to an album.

### Settings Screen

| Setting                  | Options              |
| ------------------------ | -------------------- |
| Dark Mode                | Toggle on/off        |
| Streaming Quality        | 96 / 160 / 320 kbps  |
| Equalizer (EQ)           | Custom band controls |
| Persistent Notifications | Toggle on/off        |
| About                    | App info             |

All settings are persisted locally and applied globally.

---

## 🎵 Music Playback System

### Full Player Controls

Play, Pause, Next, Previous, Repeat, Shuffle, Like, Add to Queue, Add to Playlist, Download, Go to Album, Go to Artist.

### Queue Management

Add / remove / rearrange songs, shuffle, or play sequentially. The queue is globally synchronized across Mini Player and Full Player — no duplicate audio instances are ever created.

### Mini Player

Persistent bar visible across all tabs. Supports Play/Pause, Next/Previous, and tap-to-open Full Player. Shares the same global state as the Full Player.

### Background Playback

Audio continues when the app is minimized, the screen is locked, or the user navigates between screens.

---

## 🏗️ Architecture

### Navigation — React Navigation v7

```
RootNavigator (Stack)
  └── MainTabs (Bottom Tabs)
  │     ├── HomeScreen
  │     ├── SearchScreen
  │     ├── PlaylistScreen
  │     └── SettingsScreen
  ├── PlayerScreen
  ├── ArtistScreen
  └── AlbumScreen
```

Player, Artist, and Album screens sit in the **root stack** (not inside tabs) so the bottom tab bar remains visible when navigating to them.

### State Management — Zustand

All state lives in Zustand stores, split by concern:

| Store            | Persisted       | Purpose                                                   |
| ---------------- | --------------- | --------------------------------------------------------- |
| `player.store`   | ❌              | Active queue, current index, position, playback status    |
| `library.store`  | ✅ AsyncStorage | Playlists, liked songs, downloaded song metadata          |
| `settings.store` | ✅ AsyncStorage | Audio quality (96/160/320 kbps), colour scheme preference |
| `ui.store`       | ❌              | Mini-player open/closed flag                              |
| `theme.store`    | ✅ AsyncStorage | Dark / light mode                                         |

This ensures clean separation of concerns, no duplicated states, predictable data flow, and easy scalability.

### Audio Engine — expo-av

`audio.service.ts` owns a single `Audio.Sound` instance. Key decisions:

- **One sound at a time** — previous sound is unloaded before the next loads, preventing overlapping playback and memory leaks.
- **Auto-advance** — `onPlaybackStatusUpdate` fires `loadAndPlayCurrent()` after 300 ms when `didJustFinish`.
- **Stream URL fallback** — if the queue entry has no `streamUrl`, `getSongById` is called to fetch a fresh URL before playback begins.
- **Background playback** — `staysActiveInBackground: true` + `playsInSilentModeIOS: true` keep audio alive when the app is backgrounded.

### API Layer — JioSaavn (unofficial)

Base URL: `https://saavn.sumit.co/`

| Endpoint                 | Usage                            |
| ------------------------ | -------------------------------- |
| `/search/songs?query=`   | Song search with pagination      |
| `/search/artists?query=` | Artist search                    |
| `/songs/:id`             | Fetch stream URL + full metadata |
| `/artists/:id`           | Artist profile + top songs       |
| `/albums/:id`            | Album tracklist                  |

Artist name extraction is defensive — checks `primaryArtists` → `artists.primary[]` → `artists.all[]` because the API response shape varies between search results and detail endpoints.

---

## ⚖️ Trade-offs & Known Limitations

### expo-file-system deprecation warning

`expo-file-system` v19 deprecated the legacy `FileSystem.*` API in favour of a new class-based API (`File`, `Directory`). The download service still uses the legacy API which prints a console warning. The `/legacy` import path does not exist in the installed version, so the standard import is kept. A future migration to the new API is needed.

### No token auth / rate limiting

The JioSaavn API used is an unofficial public proxy. It has no authentication and may be rate-limited or go offline. For production use, a proper licensed music API (Spotify Web API, Apple MusicKit) would replace it.

### Stream URLs expire

JioSaavn stream URLs are time-limited CDN links. If a song was added to the queue hours ago its URL may have expired — the app mitigates this by re-fetching via `getSongById` when no cached `streamUrl` is present, but does not proactively refresh URLs for songs already in the queue.

### No background download progress on iOS

`expo-file-system` does not support iOS background URLSession transfers. Downloads will pause if the app is fully closed during a download.

### Playlist songs are not re-fetched

Songs saved in playlists store a snapshot of the metadata at the time of adding. If the API changes a song's stream URL or artwork, the stored copy is stale until the user plays it (which triggers a fresh `getSongById` fetch).

---

## 🛠️ Tech Stack

| Library              | Version | Role                              |
| -------------------- | ------- | --------------------------------- |
| React Native         | 0.81    | UI framework                      |
| Expo                 | ~54     | Build toolchain, managed workflow |
| TypeScript           | ~5.9    | Type safety                       |
| React Navigation     | v7      | Stack + bottom tab navigation     |
| Zustand              | v5      | Lightweight global state          |
| AsyncStorage         | 2.2     | Persistent store serialisation    |
| expo-av              | ~16     | Audio playback engine             |
| expo-file-system     | ~19     | Offline song downloads            |
| expo-linear-gradient | ~15     | UI gradients                      |
| Axios                | 1.7     | HTTP requests to JioSaavn API     |

---

## 🤝 Contributing

1. Fork the repo and create a feature branch
2. Run `npm run lint` before committing
3. Keep new API calls inside `src/services/api/music.api.ts`
4. Keep new state slices in `src/store/`
5. Open a PR with a clear description of the change

---

## 📄 License

MIT — see `LICENSE` for details.
