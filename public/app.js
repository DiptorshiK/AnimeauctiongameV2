const socket = io();

let state = null;
let myId = null;
let creds = null;
let anime = null;

const portraitCache = new Map();
let portraitRequest = 0;

const A = {
  naruto: [
    "🍥",
    "Naruto + Naruto Shippuden",
    "https://cdn.myanimelist.net/images/anime/13/17405.jpg"
  ],

  jjk: [
    "👁️",
    "Jujutsu Kaisen",
    "https://cdn.myanimelist.net/images/anime/1171/109222.jpg"
  ],

  aot: [
    "🧱",
    "Attack on Titan",
    "https://cdn.myanimelist.net/images/anime/10/47347.jpg"
  ],

  demon_slayer: [
    "⚔️",
    "Demon Slayer",
    "https://cdn.myanimelist.net/images/anime/1286/99889.jpg"
  ],

  death_note: [
    "📓",
    "Death Note",
    "https://cdn.myanimelist.net/images/anime/9/9453.jpg"
  ]
};

const $ = x =>
  document.getElementById(x);

const esc = s =>
  String(s).replace(
    /[&<>"']/g,
    c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[c])
  );

function toast(x) {
  $("toast").textContent = x;
  $("toast").style.display = "block";

  clearTimeout(window.to);

  window.to = setTimeout(() => {
    $("toast").style.display = "none";
  }, 2500);
}

function show(x) {
  document
    .querySelectorAll(".view")
    .forEach(v =>
      v.classList.add("hidden")
    );

  $(x).classList.remove("hidden");
}

// ======================================================
// ANIME CARDS
// ======================================================

function cards() {

  $("animeGrid").innerHTML =
    Object.entries(A)
      .map(([k, v]) => `
        <div class="animeCard">

          <div>

            <div
              class="animeArt"
              style="background-image:url('${v[2]}')"
            >
              <div class="animeIcon">
                ${v[0]}
              </div>
            </div>

            <h3>
              ${v[1]}
            </h3>

            <p>
              PRIVATE MULTIPLAYER ROOM
            </p>

          </div>

          <button
            onclick="create('${k}')"
          >
            CREATE ROOM →
          </button>

        </div>
      `)
      .join("");
}

cards();

// ======================================================
// CREATE
// ======================================================

function create(k) {

  anime = k;

  const name =
    prompt("Your name");

  if (!name) return;

  const password =
    prompt(
      "Room password (optional)",
      ""
    );

  const budget =
    prompt(
      "Starting budget",
      "100"
    ) || 100;

  socket.emit(
    "createRoom",
    {
      anime: k,
      name,
      budget,
      password
    }
  );
}

// ======================================================
// JOIN
// ======================================================

function join() {

  const code =
    $("joinCode")
      .value
      .trim();

  const name =
    $("joinName")
      .value
      .trim();

  const password =
    $("joinPass").value;

  if (!code || !name) {
    return toast(
      "Enter room code and your name."
    );
  }

  socket.emit(
    "joinRoom",
    {
      code,
      name,
      password
    }
  );
}

// ======================================================
// HOST
// ======================================================

function host(
  action,
  payload = {}
) {

  if (
    !creds?.hostToken
  ) {
    return;
  }

  socket.emit(
    "hostAction",
    {
      code: state.code,
      hostToken:
        creds.hostToken,
      action,
      payload
    }
  );
}

// ======================================================
// BID
// ======================================================

function bid() {

  if (
    !state ||
    state.finished ||
    !creds?.token
  ) {
    return;
  }

  socket.emit(
    "bid",
    {
      code: state.code,
      token: creds.token
    }
  );
}

// ======================================================
// NEW AUCTION
// ======================================================

function newAuction() {

  if (
    !creds?.hostToken
  ) {
    return;
  }

  const ok =
    confirm(
      "Start a completely new auction?\n\nAll budgets and rosters will reset."
    );

  if (!ok) return;

  host("new");
}

// ======================================================
// COPY INVITE
// ======================================================

function copyInvite() {

  navigator.clipboard
    .writeText(
      $("invite").value
    );

  toast(
    "Invite link copied"
  );
}

// ======================================================
// SOCKET CONNECT
// ======================================================

socket.on(
  "connect",
  () => {

    myId =
      socket.id;

    $("topStatus")
      .textContent =
      "CONNECTED";

    const c =
      localStorage.getItem(
        "aa-creds"
      );

    if (c) {

      try {

        const x =
          JSON.parse(c);

        creds = x;

        socket.emit(
          "rejoin",
          x
        );

      } catch {

        localStorage.removeItem(
          "aa-creds"
        );
      }
    }
  }
);

// ======================================================
// CREDENTIALS
// ======================================================

socket.on(
  "credentials",
  c => {

    creds = c;

    localStorage.setItem(
      "aa-creds",
      JSON.stringify(c)
    );

    history.replaceState(
      {},
      "",
      `?room=${c.code}`
    );
  }
);

// ======================================================
// ERRORS
// ======================================================

socket.on(
  "errorMsg",
  toast
);

// ======================================================
// KICKED
// ======================================================

socket.on(
  "kicked",
  () => {

    localStorage.removeItem(
      "aa-creds"
    );

    toast(
      "You were removed from the room."
    );

    setTimeout(
      () =>
        location.href =
          location.pathname,
      1000
    );
  }
);

// ======================================================
// STATE
// ======================================================

socket.on(
  "state",
  s => {

    state = s;

    render();
  }
);

// ======================================================
// RENDER
// ======================================================

function render() {

  if (!state) return;

  anime =
    state.anime;

  if (state.finished) {

    show("finish");

    finish();

    return;
  }

  if (!state.started) {

    show("lobby");

    lobby();

    return;
  }

  show("auction");

  auction();
}

// ======================================================
// LOBBY
// ======================================================

function lobby() {

  $("lobbyAnime")
    .textContent =
    A[state.anime][1]
      .toUpperCase();

  $("roomCode")
    .textContent =
    state.code;

  $("invite")
    .value =
    location.origin +
    location.pathname +
    `?room=${state.code}`;

  $("count")
    .textContent =
    `(${state.players.length})`;

  $("start").style.display =
    creds?.hostToken
      ? "block"
      : "none";

  $("lobbySub")
    .textContent =
    state.locked
      ? "Room locked"
      : "Waiting for players…";

  $("lobbyPlayers")
    .innerHTML =
    state.players
      .map(
        p => `
          <div class="person">

            <b>
              ${esc(p.name)}
              ${p.id === state.hostId
                ? "👑"
                : ""}
            </b>

            <span
              class="${
                p.online
                  ? "online"
                  : ""
              }"
            >
              ${
                p.online
                  ? "● ONLINE"
                  : "○ OFFLINE"
              }

              · 💰 ${p.budget}
            </span>

            ${
              creds?.hostToken &&
              p.id !== state.hostId
                ? `
                  <button
                    class="adminBtn"
                    onclick="kick('${p.id}')"
                  >
                    REMOVE
                  </button>
                `
                : ""
            }

          </div>
        `
      )
      .join("");

  if (creds?.hostToken) {

    $("settings").innerHTML = `

      <h3>
        HOST SETTINGS
      </h3>

      <label>
        STARTING BUDGET
      </label>

      <input
        id="sb"
        value="${state.budget}"
        type="number"
      >

      <label>
        BID INCREMENT
      </label>

      <input
        id="si"
        value="${state.increment}"
        type="number"
      >

      <label>
        TIMER (SECONDS)
      </label>

      <input
        id="st"
        value="${state.timerSeconds}"
        type="number"
      >

      <label>
        ROOM PASSWORD
      </label>

      <input
        id="sp"
        type="password"
      >

      <button
        onclick="saveSettings()"
      >
        SAVE SETTINGS
      </button>

      <p
        style="
          color:#81899b;
          font-size:11px
        "
      >
        Host controls unlock automatically once the auction starts.
      </p>
    `;

  } else {

    $("settings").innerHTML = `
      <h3>
        WAITING FOR HOST
      </h3>

      <p
        style="
          color:#8e96a9;
          font-size:12px;
          line-height:1.6
        "
      >
        The host controls the auction.
        Keep this page open.
      </p>
    `;
  }
}

// ======================================================
// SETTINGS
// ======================================================

function saveSettings() {

  host(
    "settings",
    {
      budget:
        $("sb").value,

      increment:
        $("si").value,

      timer:
        $("st").value,

      password:
        $("sp").value
    }
  );
}

// ======================================================
// KICK
// ======================================================

function kick(id) {

  host(
    "kick",
    {
      id
    }
  );
}

// ======================================================
// AUCTION
// ======================================================

function auction() {

  const me =
    state.players.find(
      p =>
        p.id === myId
    );

  $("auctionAnime")
    .textContent =
    A[state.anime][1];

  $("progress")
    .textContent =
    `${Math.min(
      state.index + 1,
      state.total
    )} / ${state.total}`;

  $("roomSmall")
    .textContent =
    state.code;

  $("wallet")
    .textContent =
    me
      ? `💰 ${me.budget}`
      : "—";

  // PLAYERS

  $("sidePlayers")
    .innerHTML =
    state.players
      .map(
        p => `
          <div
            class="playerMini"
          >

            <b>
              ${esc(p.name)}
              ${
                p.id === state.hostId
                  ? " 👑"
                  : ""
              }
            </b>

            <span>
              ${p.budget}
            </span>

          </div>
        `
      )
      .join("");

  // HISTORY

  $("history")
    .innerHTML =
    state.history
      .slice()
      .reverse()
      .map(
        x => `
          <div
            class="sale"
          >

            <b>
              ${esc(x.name)}
            </b>

            <span>
              ${
                x.bidderName ===
                "Unsold"

                  ? "UNSOLD"

                  : `💰 ${x.bid}
                     · ${esc(
                       x.bidderName
                     )}`
              }
            </span>

          </div>
        `
      )
      .join("");

  // MY ROSTER

  $("myRoster")
    .innerHTML =
    me?.roster?.length

      ? me.roster
          .map(
            x => `
              <div
                class="rosterItem"
              >

                <b>
                  ${esc(x.name)}
                </b>

                <span>
                  Rating ${x.rating}
                  · Paid ${x.price}
                </span>

              </div>
            `
          )
          .join("")

      : `
        <p
          style="
            color:#8e96a9;
            font-size:12px
          "
        >
          No characters yet.
        </p>
      `;

  if (!state.current) {

    $("bidBtn").disabled = true;

    return;
  }

  // CHARACTER

  $("charName")
    .textContent =
    state.current.name;

  $("rating")
    .textContent =
    `POWER ${state.current.rating}/10`;

  $("rarity")
    .textContent =
    state.current.rating >= 9
      ? "LEGENDARY"
      : state.current.rating >= 8
        ? "ELITE"
        : "RARE";

  $("base")
    .textContent =
    state.current.base;

  $("timer")
    .textContent =
    state.current.timeLeft;

  $("bid")
    .textContent =
    state.current.bid;

  $("bidder")
    .textContent =
    state.current.bidderName
      ? `Leading: ${esc(
          state.current.bidderName
        )}`
      : "No bids yet";

  $("nextBid")
    .textContent =
    state.current.bid +
    state.increment;

  const canBid =
    me &&
    state.current.bid +
      state.increment <=
      me.budget &&
    !state.paused &&
    !state.finished;

  $("bidBtn").disabled =
    !canBid;

  // PORTRAIT

  loadPortrait(
    state.current.name
  );

  // HOST BAR

  if (creds?.hostToken) {

    $("hostBar").innerHTML = `

      <button
        class="adminBtn"
        onclick="
          host(
            'pause',
            {
              value:${!state.paused}
            }
          )
        "
      >
        ${
          state.paused
            ? "RESUME"
            : "PAUSE"
        }
      </button>

      <button
        class="adminBtn"
        onclick="
          host('skip')
        "
      >
        SKIP / NEXT
      </button>

      <button
        class="adminBtn"
        onclick="
          host(
            'lock',
            {
              value:${!state.locked}
            }
          )
        "
      >
        ${
          state.locked
            ? "UNLOCK"
            : "LOCK ROOM"
        }
      </button>

      <button
        class="adminBtn"
        onclick="
          host('end')
        "
      >
        END AUCTION
      </button>

    `;

  } else {

    $("hostBar").innerHTML =
      state.paused
        ? `
          <small>
            AUCTION PAUSED BY HOST
          </small>
        `
        : "";
  }
}

// ======================================================
// PORTRAIT SYSTEM
// ======================================================

function portraitName(name) {

  return String(name || "")
    .replace(
      /\s*\([^)]*\)\s*$/g,
      ""
    )
    .trim();
}

function normalizePortraitName(name) {

  return String(name || "")
    .toLowerCase()
    .replace(
      /[^a-z0-9]/g,
      ""
    );
}

async function loadPortrait(name) {

  const img =
    $("portrait");

  const fallback =
    $("portraitFallback");

  if (!img || !fallback) {
    return;
  }

  fallback.textContent =
    A[state.anime][0];

  const request =
    ++portraitRequest;

  /*
   * For entries such as:
   *
   * Naruto Uzumaki (Sage Mode)
   *
   * search for:
   *
   * Naruto Uzumaki
   */

  const baseName =
    portraitName(name);

  const key =
    `${state.anime}:${baseName}`;

  // CACHE

  if (
    portraitCache.has(key)
  ) {

    const cached =
      portraitCache.get(key);

    if (
      request !==
      portraitRequest
    ) {
      return;
    }

    img.onload = () => {
      if (
        request ===
        portraitRequest
      ) {
        img.parentElement
          ?.classList
          .add("loaded");
      }
    };

    img.src =
      cached;

    return;
  }

  img.parentElement
    ?.classList
    .remove("loaded");

  try {

    const q =
      encodeURIComponent(
        baseName
      );

    /*
     * IMPORTANT:
     *
     * limit=10 instead of limit=1.
     *
     * We then select the EXACT
     * character name.
     */

    const response =
      await fetch(
        `https://api.jikan.moe/v4/characters?q=${q}&limit=10`
      );

    if (!response.ok) {
      throw new Error(
        "Jikan request failed"
      );
    }

    const data =
      await response.json();

    if (
      request !==
      portraitRequest
    ) {
      return;
    }

    const results =
      data?.data || [];

    const wanted =
      normalizePortraitName(
        baseName
      );

    // =================================================
    // EXACT MATCH FIRST
    // =================================================

    let character =
      results.find(
        x =>
          normalizePortraitName(
            x?.name
          ) === wanted
      );

    // =================================================
    // PARTIAL MATCH SECOND
    // =================================================

    if (!character) {

      character =
        results.find(x => {

          const n =
            normalizePortraitName(
              x?.name
            );

          return (
            n.includes(wanted) ||
            wanted.includes(n)
          );
        });
    }

    // No correct character found

    if (!character) {

      img.parentElement
        ?.classList
        .remove("loaded");

      return;
    }

    const url =
      character
        ?.images
        ?.jpg
        ?.large_image_url ||
      character
        ?.images
        ?.jpg
        ?.image_url;

    if (!url) {
      return;
    }

    portraitCache.set(
      key,
      url
    );

    if (
      request !==
      portraitRequest
    ) {
      return;
    }

    img.onload = () => {

      if (
        request ===
        portraitRequest
      ) {

        img.parentElement
          ?.classList
          .add("loaded");
      }
    };

    img.onerror = () => {

      img.parentElement
        ?.classList
        .remove("loaded");
    };

    img.src = url;

  } catch (e) {

    if (
      request !==
      portraitRequest
    ) {
      return;
    }

    img.parentElement
      ?.classList
      .remove("loaded");
  }
}

// ======================================================
// FINISH SCREEN
// ======================================================

function finish() {

  $("final")
    .innerHTML = `

      <div
        class="finalGrid"
      >

        ${state.players
          .map(
            p => `

              <div
                class="finalCard"
              >

                <h3>
                  ${esc(p.name)}
                  ${
                    p.id ===
                    state.hostId
                      ? " 👑"
                      : ""
                  }
                </h3>

                <p>
                  💰 ${p.budget}
                  remaining
                  <br>

                  ${
                    p.roster.length

                      ? p.roster
                          .map(
                            x =>
                              `${esc(
                                x.name
                              )}
                              — ${x.price}`
                          )
                          .join(
                            "<br>"
                          )

                      : "No characters won"
                  }
                </p>

              </div>

            `
          )
          .join("")}

      </div>

      ${
        creds?.hostToken
          ? `
            <div
              style="
                margin-top:24px;
                text-align:center;
              "
            >

              <button
                class="adminBtn"
                onclick="newAuction()"
              >
                🔄 NEW AUCTION
              </button>

            </div>
          `
          : ""
      }

    `;
}

// ======================================================
// ROOM URL
// ======================================================

const q =
  new URLSearchParams(
    location.search
  ).get("room");

if (q) {

  $("joinCode").value =
    q.toUpperCase();

  $("joinName").focus();
                }
