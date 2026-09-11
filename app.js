(() => {
  "use strict";

  const TRACKS = Object.freeze([
    {
      id: "melodia-do-amor",
      title: "Melodia do Amor",
      src: "audio/1-melodia-do-amor.mp3",
      duration: 300,
    },
    {
      id: "neutralizar-emocoes-negativas",
      title: "Melodia para Neutralizar Emoções Negativas",
      src: "audio/2-melodia-para-neutralizar-emocoes-negativas.mp3",
      duration: 300,
    },
    {
      id: "melodia-do-encantamento",
      title: "Melodia do Encantamento",
      src: "audio/3-melodia-do-encantamento.mp3",
      duration: 300,
    },
    {
      id: "melodia-para-a-reconciliacao",
      title: "Melodia para a Reconciliação",
      src: "audio/4-melodia-para-a-reconciliacao.mp3",
      duration: 300,
    },
    {
      id: "atrair-um-par-perfeito",
      title: "Melodia para Atrair um Par Perfeito",
      src: "audio/5-melodia-para-atrair-um-par-perfeito.mp3",
      duration: 300,
    },
  ]);

  const landingView = document.querySelector("#landing-view");
  const authView = document.querySelector("#auth-view");
  const appView = document.querySelector("#app-view");
  const appShell = document.querySelector(".app-shell");
  const appContent = document.querySelector(".app-content");
  const appHeader = document.querySelector(".app-header");
  const bottomNav = document.querySelector(".bottom-nav");
  const registerPanel = document.querySelector("#register-panel");
  const loginPanel = document.querySelector("#login-panel");
  const registerForm = document.querySelector("#register-form");
  const loginForm = document.querySelector("#login-form");
  const registerMessage = document.querySelector("#register-message");
  const loginMessage = document.querySelector("#login-message");
  const trackList = document.querySelector("#track-list");
  const favoritesList = document.querySelector("#favorites-list");
  const favoritesEmpty = document.querySelector("#favorites-empty");
  const favoritesCount = document.querySelector("#favorites-count");
  const audio = document.querySelector("#audio-player");
  const miniPlayer = document.querySelector(".mini-player");
  const miniTitle = document.querySelector("[data-mini-title]");
  const playerTitle = document.querySelector("#player-track-title");
  const playerSeek = document.querySelector("#player-seek");
  const playerCurrentTime = document.querySelector("#player-current-time");
  const playerDuration = document.querySelector("#player-duration");
  const playerFavorite = document.querySelector("[data-player-favorite]");
  const miniFavorite = document.querySelector("[data-mini-favorite]");
  const toast = document.querySelector(".toast");

  let memoryAccount = null;
  let currentTrackIndex = -1;
  let currentPanel = "home";
  let returnPanel = "detail";
  let favorites = new Set();
  let shuffleEnabled = false;
  let repeatEnabled = false;
  let isSeeking = false;
  const measuredDurations = new Map();
  let toastTimer = null;

  function readAccount() {
    try {
      return JSON.parse(localStorage.getItem("mda-account")) || memoryAccount;
    } catch {
      return memoryAccount;
    }
  }

  function saveAccount(account) {
    memoryAccount = account;
    try {
      localStorage.setItem("mda-account", JSON.stringify(account));
      sessionStorage.setItem("mda-session", "active");
    } catch {
      // The in-memory account keeps the current visit working in private mode.
    }
  }

  function favoritesStorageKey() {
    const email = readAccount()?.email || "visitante";
    return `mda-favorites:${email}`;
  }

  function readFavorites() {
    try {
      const stored = JSON.parse(localStorage.getItem(favoritesStorageKey()));
      const validIds = Array.isArray(stored)
        ? stored.filter((id) => TRACKS.some((track) => track.id === id))
        : [];
      return new Set(validIds);
    } catch {
      return new Set();
    }
  }

  function saveFavorites() {
    try {
      localStorage.setItem(favoritesStorageKey(), JSON.stringify([...favorites]));
    } catch {
      showToast("Não foi possível salvar seus favoritos neste navegador.");
    }
  }

  function showSiteView(view) {
    [landingView, authView, appView].forEach((item) => {
      const isCurrent = item === view;
      item.hidden = !isCurrent;
      item.classList.toggle("is-active", isCurrent);
    });
    document.body.classList.toggle("app-mode", view === appView);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showAuthPanel(mode) {
    const isRegister = mode === "register";
    registerPanel.hidden = !isRegister;
    loginPanel.hidden = isRegister;
    registerMessage.textContent = "";
    loginMessage.textContent = "";
    window.setTimeout(() => {
      const target = document.querySelector(
        isRegister ? "#register-name" : "#login-email"
      );
      target?.focus();
    }, 80);
  }

  function openRegistration() {
    showSiteView(authView);
    showAuthPanel("register");
    history.replaceState(null, "", "#cadastro");
  }

  function openLogin() {
    showSiteView(authView);
    showAuthPanel("login");
    const account = readAccount();
    if (account?.email) {
      document.querySelector("#login-email").value = account.email;
    }
    history.replaceState(null, "", "#entrar");
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, 3200);
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const wholeSeconds = Math.floor(seconds);
    const minutes = Math.floor(wholeSeconds / 60);
    return `${minutes}:${String(wholeSeconds % 60).padStart(2, "0")}`;
  }

  function currentTrack() {
    return TRACKS[currentTrackIndex] || null;
  }

  function trackCardMarkup(track) {
    const isFavorite = favorites.has(track.id);
    const isCurrent = currentTrack()?.id === track.id;
    const favoriteLabel = isFavorite
      ? `Remover ${track.title} dos favoritos`
      : `Adicionar ${track.title} aos favoritos`;

    return `
      <article class="track-card${isCurrent ? " is-current" : ""}" data-track-card="${track.id}">
        <button class="track-card__main" type="button" data-play-track="${track.id}" aria-label="Reproduzir ${track.title}">
          <img src="assets/mda-cover.png" alt="" />
          <span class="track-card__copy">
            <strong>${track.title}</strong>
            <span>MDA</span>
          </span>
        </button>
        <time datetime="PT5M" data-duration-for="${track.id}">${formatTime(measuredDurations.get(track.id) || track.duration)}</time>
        <button class="track-favorite${isFavorite ? " is-favorite" : ""}" type="button" data-favorite-track="${track.id}" aria-label="${favoriteLabel}" aria-pressed="${isFavorite}">${isFavorite ? "♥" : "♡"}</button>
        <button class="track-more" type="button" data-toast="Esta faixa faz parte da Melodia do Amor." aria-label="Mais opções para ${track.title}">⋮</button>
      </article>
    `;
  }

  function renderTrackList() {
    trackList.innerHTML = TRACKS.map(trackCardMarkup).join("");
  }

  function renderFavorites() {
    const favoriteTracks = TRACKS.filter((track) => favorites.has(track.id));
    const count = favoriteTracks.length;
    favoritesCount.textContent = `${count} ${count === 1 ? "música" : "músicas"}`;
    favoritesEmpty.hidden = count > 0;
    favoritesList.hidden = count === 0;
    favoritesList.innerHTML = favoriteTracks.map(trackCardMarkup).join("");
  }

  function syncFavoriteButtons() {
    const track = currentTrack();
    const isFavorite = Boolean(track && favorites.has(track.id));

    [playerFavorite, miniFavorite].forEach((button) => {
      button.textContent = isFavorite ? "♥" : "♡";
      button.classList.toggle("is-favorite", isFavorite);
      button.setAttribute("aria-pressed", String(isFavorite));
      button.setAttribute(
        "aria-label",
        isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"
      );
    });
  }

  function syncTrackFavoriteButtons(trackId) {
    const track = TRACKS.find((item) => item.id === trackId);
    if (!track) return;
    const isFavorite = favorites.has(trackId);
    document
      .querySelectorAll(`[data-favorite-track="${trackId}"]`)
      .forEach((button) => {
        button.textContent = isFavorite ? "♥" : "♡";
        button.classList.toggle("is-favorite", isFavorite);
        button.setAttribute("aria-pressed", String(isFavorite));
        button.setAttribute(
          "aria-label",
          isFavorite
            ? `Remover ${track.title} dos favoritos`
            : `Adicionar ${track.title} aos favoritos`
        );
      });
  }

  function refreshMusicViews() {
    renderTrackList();
    renderFavorites();
    syncFavoriteButtons();
  }

  function syncMiniPlayerVisibility() {
    const shouldShow = currentTrackIndex >= 0 && currentPanel !== "player";
    miniPlayer.hidden = !shouldShow;
    appShell.classList.toggle("has-mini-player", shouldShow);
  }

  function showAppPanel(name) {
    const target = document.querySelector(`#app-${name}`);
    if (!target) return;

    if (name === "player" && currentPanel !== "player") {
      returnPanel = currentPanel;
    }
    currentPanel = name;

    document.querySelectorAll(".app-panel").forEach((panel) => {
      const isCurrent = panel === target;
      panel.hidden = !isCurrent;
      panel.classList.toggle("is-active", isCurrent);
    });

    document.querySelectorAll(".bottom-nav [data-app-panel]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.appPanel === name);
    });

    const playerMode = name === "player";
    const navHidden = playerMode || name === "detail";
    bottomNav.hidden = navHidden;
    appHeader.hidden = playerMode;
    appShell.classList.toggle("is-player-mode", playerMode);
    appShell.classList.toggle("nav-hidden", navHidden);
    syncMiniPlayerVisibility();

    if (name === "favorites") renderFavorites();
    appContent.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openApp(panel = "home") {
    showSiteView(appView);
    showAppPanel(panel);
    history.replaceState(null, "", "#app");
  }

  function updateProgress() {
    const track = currentTrack();
    const duration = Number.isFinite(audio.duration)
      ? audio.duration
      : track?.duration || 300;
    const current = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    const progress = duration > 0 ? (current / duration) * 100 : 0;

    const canSeek = currentTrackIndex >= 0 && audio.readyState >= 1 && Number.isFinite(audio.duration);
    playerSeek.disabled = !canSeek;
    playerSeek.max = String(duration);
    if (!isSeeking) {
      playerSeek.value = String(Math.min(current, duration));
      playerSeek.style.setProperty("--progress", `${Math.min(progress, 100)}%`);
      playerSeek.setAttribute(
        "aria-valuetext",
        `${formatTime(current)} de ${formatTime(duration)}`
      );
      playerCurrentTime.textContent = formatTime(current);
    }
    playerDuration.textContent = formatTime(duration);
  }

  function syncPlaybackButtons() {
    const isPlaying = !audio.paused && !audio.ended && currentTrackIndex >= 0;
    document.querySelectorAll("[data-toggle-play]").forEach((button) => {
      button.textContent = isPlaying ? "Ⅱ" : "▶";
      button.setAttribute("aria-label", isPlaying ? "Pausar" : "Reproduzir");
    });
  }

  function updateMediaSession(track) {
    if (!("mediaSession" in navigator) || !window.MediaMetadata) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: "MDA",
        album: "Melodia do Amor",
        artwork: [
          {
            src: new URL("assets/mda-cover.png", location.href).href,
            sizes: "512x512",
            type: "image/png",
          },
        ],
      });
    } catch {
      // Playback remains fully functional when Media Session is unavailable.
    }
  }

  function updateCurrentTrackUI() {
    const track = currentTrack();
    if (!track) return;
    playerTitle.textContent = track.title;
    miniTitle.textContent = track.title;
    updateMediaSession(track);
    updateProgress();
    refreshMusicViews();
    syncMiniPlayerVisibility();
  }

  async function playAudio() {
    if (currentTrackIndex < 0) {
      selectTrack(TRACKS[0].id, true, true);
      return;
    }

    const requestedTrackId = currentTrack()?.id;
    try {
      await audio.play();
    } catch (error) {
      if (error?.name === "AbortError" || currentTrack()?.id !== requestedTrackId) return;
      showToast("Toque em reproduzir novamente para iniciar o áudio.");
      syncPlaybackButtons();
    }
  }

  function selectTrack(trackId, shouldPlay = true, openPlayer = true) {
    const index = TRACKS.findIndex((track) => track.id === trackId);
    if (index < 0) return;

    const changed = index !== currentTrackIndex;
    currentTrackIndex = index;
    const track = currentTrack();

    if (changed || audio.dataset.trackId !== track.id) {
      isSeeking = false;
      playerSeek.disabled = true;
      playerSeek.value = "0";
      playerSeek.style.setProperty("--progress", "0%");
      audio.src = track.src;
      audio.dataset.trackId = track.id;
      audio.load();
    }

    updateCurrentTrackUI();
    if (openPlayer) showAppPanel("player");
    if (shouldPlay) playAudio();
  }

  function togglePlayback() {
    if (currentTrackIndex < 0) {
      selectTrack(TRACKS[0].id, true, true);
    } else if (audio.paused) {
      playAudio();
    } else {
      audio.pause();
    }
  }

  function nextTrack() {
    if (currentTrackIndex < 0) {
      selectTrack(TRACKS[0].id, true, currentPanel === "player");
      return;
    }

    let nextIndex;
    if (shuffleEnabled && TRACKS.length > 1) {
      do {
        nextIndex = Math.floor(Math.random() * TRACKS.length);
      } while (nextIndex === currentTrackIndex);
    } else {
      nextIndex = (currentTrackIndex + 1) % TRACKS.length;
    }
    selectTrack(TRACKS[nextIndex].id, true, false);
  }

  function previousTrack() {
    if (currentTrackIndex < 0) {
      selectTrack(TRACKS[0].id, true, currentPanel === "player");
      return;
    }
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      updateProgress();
      return;
    }
    const previousIndex = (currentTrackIndex - 1 + TRACKS.length) % TRACKS.length;
    selectTrack(TRACKS[previousIndex].id, true, false);
  }

  function toggleFavorite(trackId) {
    const track = TRACKS.find((item) => item.id === trackId);
    if (!track) return;

    const wasFavorite = favorites.has(trackId);
    if (wasFavorite) favorites.delete(trackId);
    else favorites.add(trackId);
    saveFavorites();
    renderFavorites();
    syncTrackFavoriteButtons(trackId);
    syncFavoriteButtons();
    showToast(
      wasFavorite
        ? `${track.title} foi removida dos favoritos.`
        : `${track.title} foi adicionada aos favoritos.`
    );
  }

  function closePlayer() {
    audio.pause();
    audio.removeAttribute("src");
    audio.removeAttribute("data-track-id");
    audio.load();
    currentTrackIndex = -1;
    updateProgress();
    refreshMusicViews();
    syncPlaybackButtons();
    syncMiniPlayerVisibility();
    if (currentPanel === "player") showAppPanel(returnPanel || "detail");
  }

  async function hashPassword(value) {
    if (window.crypto?.subtle && window.TextEncoder) {
      const bytes = new TextEncoder().encode(value);
      const digest = await window.crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
    }

    let hash = 5381;
    for (const character of value) {
      hash = (hash * 33) ^ character.charCodeAt(0);
    }
    return `local-${hash >>> 0}`;
  }

  document.querySelectorAll("[data-open-register]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      openRegistration();
    });
  });

  document.querySelector("[data-back-home]").addEventListener("click", () => {
    showSiteView(landingView);
    history.replaceState(null, "", location.pathname);
  });

  document.querySelector("[data-show-login]").addEventListener("click", openLogin);
  document
    .querySelector("[data-show-register]")
    .addEventListener("click", openRegistration);

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    registerMessage.textContent = "";

    const data = new FormData(registerForm);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim().toLowerCase();
    const password = String(data.get("password") || "");
    const confirmation = String(data.get("confirmPassword") || "");

    if (password !== confirmation) {
      registerMessage.textContent = "As senhas precisam ser iguais.";
      return;
    }

    if (password.length < 6) {
      registerMessage.textContent = "Sua senha deve ter pelo menos 6 caracteres.";
      return;
    }

    const account = {
      name,
      email,
      passwordHash: await hashPassword(password),
      createdAt: new Date().toISOString(),
    };

    saveAccount(account);
    favorites = readFavorites();
    refreshMusicViews();
    registerForm.reset();
    openApp("home");
    showToast("Acesso criado com sucesso!");
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginMessage.textContent = "";

    const account = readAccount();
    const data = new FormData(loginForm);
    const email = String(data.get("email") || "").trim().toLowerCase();
    const passwordHash = await hashPassword(String(data.get("password") || ""));

    if (!account || account.email !== email || account.passwordHash !== passwordHash) {
      loginMessage.textContent = "E-mail ou senha não conferem com o cadastro.";
      return;
    }

    try {
      sessionStorage.setItem("mda-session", "active");
    } catch {
      // The current view remains usable when storage is unavailable.
    }

    favorites = readFavorites();
    refreshMusicViews();
    loginForm.reset();
    openApp("home");
    showToast("Bem-vinda de volta!");
  });

  appView.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    if (button.dataset.playTrack) {
      selectTrack(button.dataset.playTrack, true, true);
    } else if (button.dataset.favoriteTrack) {
      toggleFavorite(button.dataset.favoriteTrack);
    } else if (button.hasAttribute("data-player-favorite") || button.hasAttribute("data-mini-favorite")) {
      const track = currentTrack();
      if (track) toggleFavorite(track.id);
    } else if (button.hasAttribute("data-play-first")) {
      selectTrack(TRACKS[0].id, true, true);
    } else if (button.hasAttribute("data-toggle-play")) {
      togglePlayback();
    } else if (button.hasAttribute("data-previous")) {
      previousTrack();
    } else if (button.hasAttribute("data-next")) {
      nextTrack();
    } else if (button.hasAttribute("data-open-player")) {
      if (currentTrackIndex >= 0) showAppPanel("player");
    } else if (button.hasAttribute("data-close-player")) {
      closePlayer();
    } else if (button.hasAttribute("data-player-back")) {
      showAppPanel(returnPanel || "detail");
    } else if (button.hasAttribute("data-shuffle")) {
      shuffleEnabled = !shuffleEnabled;
      button.classList.toggle("is-active", shuffleEnabled);
      button.setAttribute("aria-pressed", String(shuffleEnabled));
      button.setAttribute(
        "aria-label",
        shuffleEnabled ? "Desativar ordem aleatória" : "Ativar ordem aleatória"
      );
    } else if (button.hasAttribute("data-repeat")) {
      repeatEnabled = !repeatEnabled;
      audio.loop = repeatEnabled;
      button.classList.toggle("is-active", repeatEnabled);
      button.setAttribute("aria-pressed", String(repeatEnabled));
      button.setAttribute(
        "aria-label",
        repeatEnabled ? "Desativar repetição" : "Repetir faixa"
      );
    } else if (button.dataset.openDetail !== undefined) {
      showAppPanel("detail");
    } else if (button.dataset.appPanel) {
      showAppPanel(button.dataset.appPanel);
    } else if (button.hasAttribute("data-logout")) {
      closePlayer();
      try {
        sessionStorage.removeItem("mda-session");
      } catch {
        // Nothing else is required to finish the local logout.
      }
      openLogin();
    } else if (button.dataset.toast) {
      showToast(button.dataset.toast);
    }
  });

  playerSeek.addEventListener("input", () => {
    if (currentTrackIndex < 0 || audio.readyState < 1 || !Number.isFinite(audio.duration)) return;
    isSeeking = true;
    const target = Math.min(Math.max(Number(playerSeek.value), 0), audio.duration);
    const progress = audio.duration > 0 ? (target / audio.duration) * 100 : 0;
    playerSeek.style.setProperty("--progress", `${Math.min(progress, 100)}%`);
    playerSeek.setAttribute(
      "aria-valuetext",
      `${formatTime(target)} de ${formatTime(audio.duration)}`
    );
    playerCurrentTime.textContent = formatTime(target);
  });

  playerSeek.addEventListener("change", () => {
    if (currentTrackIndex >= 0 && audio.readyState >= 1 && Number.isFinite(audio.duration)) {
      const target = Math.min(Math.max(Number(playerSeek.value), 0), audio.duration);
      try {
        audio.currentTime = target;
      } catch {
        showToast("Aguarde o áudio carregar para avançar.");
      }
    }
    isSeeking = false;
    updateProgress();
  });

  audio.addEventListener("loadedmetadata", () => {
    const track = currentTrack();
    if (!track || !Number.isFinite(audio.duration)) return;
    measuredDurations.set(track.id, audio.duration);
    const durationText = formatTime(audio.duration);
    document
      .querySelectorAll(`[data-duration-for="${track.id}"]`)
      .forEach((node) => {
        node.textContent = durationText;
        node.setAttribute("datetime", `PT${Math.round(audio.duration)}S`);
      });
    updateProgress();
  });

  audio.addEventListener("timeupdate", updateProgress);
  audio.addEventListener("durationchange", updateProgress);
  audio.addEventListener("play", syncPlaybackButtons);
  audio.addEventListener("pause", syncPlaybackButtons);
  audio.addEventListener("ended", () => {
    if (!repeatEnabled) nextTrack();
  });
  audio.addEventListener("error", () => {
    if (currentTrackIndex >= 0) {
      showToast("Não foi possível carregar este áudio.");
      syncPlaybackButtons();
    }
  });

  if ("mediaSession" in navigator) {
    try {
      navigator.mediaSession.setActionHandler("play", playAudio);
      navigator.mediaSession.setActionHandler("pause", () => audio.pause());
      navigator.mediaSession.setActionHandler("previoustrack", previousTrack);
      navigator.mediaSession.setActionHandler("nexttrack", nextTrack);
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (
          Number.isFinite(details.seekTime) &&
          audio.readyState >= 1 &&
          Number.isFinite(audio.duration)
        ) {
          audio.currentTime = Math.min(Math.max(details.seekTime, 0), audio.duration);
          updateProgress();
        }
      });
    } catch {
      // Unsupported handlers do not affect the on-page controls.
    }
  }

  favorites = readFavorites();
  refreshMusicViews();
  syncPlaybackButtons();
  updateProgress();

  let hasActiveSession = false;
  try {
    hasActiveSession = sessionStorage.getItem("mda-session") === "active";
  } catch {
    // Storage may be unavailable in strict private browsing modes.
  }

  if ((location.hash === "#app" || hasActiveSession) && readAccount()) {
    openApp("home");
  } else if (location.hash === "#cadastro") {
    openRegistration();
  } else if (location.hash === "#entrar") {
    openLogin();
  }
})();
