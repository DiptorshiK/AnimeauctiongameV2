const socket = io();

let state = null;
let myId = null;
let creds = null;
let anime = null;

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


const $ = x => document.getElementById(x);

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


/* =========================
   TOAST
========================= */

function toast(x) {
  if (!$("toast")) return;

  $("toast").textContent = x;
  $("toast").style.display = "block";

  clearTimeout(window.to);

  window.to = setTimeout(() => {
    $("toast").style.display = "none";
  }, 2500);
}


/* =========================
   VIEW SWITCHING
========================= */

function show(x) {
  document.querySelectorAll(".view").forEach(v =>
    v.classList.add("hidden")
  );

  if ($(x)) {
    $(x).classList.remove("hidden");
  }
}


/* =========================
   ANIME CARDS
========================= */

function cards() {
  if (!$("animeGrid")) return;

  $("animeGrid").innerHTML = Object.entries(A)
    .map(
      ([k, v]) => `
        <div class="animeCard">
          <div>
            <div
              class="animeArt"
              style="background-image:url('${v[2]}')"
            >
              <div class="animeIcon">${v[0]}</div>
            </div>

            <h3>${v[1]}</h3>

            <p>PRIVATE MULTIPLAYER ROOM</p>
          </div>

          <button onclick="create('${k}')">
            CREATE ROOM →
          </button>
        </div>
      `
    )
    .join("");
}

cards();


/* =========================
   CREATE ROOM
========================= */

function create(k) {
  anime = k;

  const name = prompt("Your name");

  if (!name) return;

  const password = prompt(
    "Room password (optional)",
    ""
  );

  const budget =
    prompt("Starting budget", "100") || 100;

  socket.emit("createRoom", {
    anime: k,
    name,
    budget,
    password
  });
}


/* =========================
   JOIN ROOM
========================= */

function join() {
  const code = $("joinCode").value.trim();
  const name = $("joinName").value.trim();
  const password = $("joinPass").value;

  if (!code || !name) {
    return toast("Enter room code and your name.");
  }

  socket.emit("joinRoom", {
    code,
    name,
    password
  });
}


/* =========================
   HOST ACTION
========================= */

function host(action, payload = {}) {
  if (!creds?.hostToken) {
    return toast("Host permission required.");
  }

  if (!state?.code) {
    return toast("Room not ready.");
  }

  socket.emit("hostAction", {
    code: state.code,
    hostToken: creds.hostToken,
    action,
    payload
  });
}


/* =========================
   BID
========================= */

function bid() {
  if (!state?.code || !creds?.token) return;

  socket.emit("bid", {
    code: state.code,
    token: creds.token
  });
}


/* =========================
   COPY INVITE
========================= */

function copyInvite() {
  if (!$("invite")) return;

  navigator.clipboard
    .writeText($("invite").value)
    .then(() => {
      toast("Invite link copied");
    })
    .catch(() => {
      toast("Could not copy invite link");
    });
}


/* =========================
   NEW AUCTION
========================= */

function newAuction() {
  if (!creds?.hostToken) {
    return toast("Only the host can start a new auction.");
  }

  const ok = confirm(
    "Start a new auction?\n\n" +
    "Budgets will reset and all previous rosters/results will be cleared."
  );

  if (!ok) return;

  host("new");
}


/* =========================
   SOCKET CONNECT
========================= */

socket.on("connect", () => {
  myId = socket.id;

  if ($("topStatus")) {
    $("topStatus").textContent = "CONNECTED";
  }

  const c = localStorage.getItem("aa-creds");

  if (c) {
    try {
      const x = JSON.parse(c);

      creds = x;

      socket.emit("rejoin", x);
    } catch {
      localStorage.removeItem("aa-creds");
    }
  }
});


/* =========================
   CREDENTIALS
========================= */

socket.on("credentials", c => {
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
});


/* =========================
   ERRORS
========================= */

socket.on("errorMsg", toast);


/* =========================
   KICKED
========================= */

socket.on("kicked", () => {
  localStorage.removeItem("aa-creds");

  toast("You were removed from the room.");

  setTimeout(() => {
    location.href = location.pathname;
  }, 1000);
});


/* =========================
   STATE UPDATE
========================= */

socket.on("state", s => {
  state = s;

  render();
});


/* =========================
   MAIN RENDER
========================= */

function render() {
  if (!state) return;

  anime = state.anime;

  /*
    FINISHED AUCTION
  */

  if (state.finished) {
    show("finish");
    finish();
    return;
  }


  /*
    LOBBY / NEW AUCTION
  */

  if (!state.started) {
    show("lobby");
    lobby();
    return;
  }


  /*
    ACTIVE AUCTION
  */

  show("auction");
  auction();
}


/* =========================
   LOBBY
========================= */

function lobby() {
  if (!$("lobbyAnime")) return;

  $("lobbyAnime").textContent =
    A[state.anime][1].toUpperCase();

  $("roomCode").textContent =
    state.code;

  $("invite").value =
    location.origin +
    location.pathname +
    `?room=${state.code}`;

  $("count").textContent =
    `(${state.players.length})`;


  /*
    HOST START BUTTON
  */

  $("start").style.display =
    creds?.hostToken ? "block" : "none";


  /*
    LOBBY STATUS
  */

  $("lobbySub").textContent =
    state.locked
      ? "Room locked"
      : "Waiting for players…";


  /*
    PLAYERS
  */

  $("lobbyPlayers").innerHTML =
    state.players
      .map(
        p => `
          <div class="person">

            <b>
              ${esc(p.name)}
              ${p.id === state.hostId ? "👑" : ""}
            </b>

            <span class="${p.online ? "online" : ""}">
              ${p.online ? "● ONLINE" : "○ OFFLINE"}
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


  /*
    HOST SETTINGS
  */

  if (creds?.hostToken) {
    $("settings").innerHTML = `
      <h3>HOST SETTINGS</h3>

      <label>STARTING BUDGET</label>
      <input
        id="sb"
        value="${state.budget}"
      >

      <label>BID INCREMENT</label>
      <input
        id="si"
        value="${state.increment}"
      >

      <label>TIMER (SECONDS)</label>
      <input
        id="st"
        value="${state.timerSeconds}"
      >

      <label>ROOM PASSWORD</label>
      <input
        id="sp"
        type="password"
      >

      <button onclick="saveSettings()">
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
      <h3>WAITING FOR HOST</h3>

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


/* =========================
   SAVE SETTINGS
========================= */

function saveSettings() {
  if (!$("sb") || !$("si") || !$("st")) return;

  host("settings", {
    budget: $("sb").value,
    increment: $("si").value,
    timer: $("st").value,
    password: $("sp")?.value || ""
  });
}


/* =========================
   KICK PLAYER
========================= */

function kick(id) {
  host("kick", {
    id
  });
}


/* =========================
   AUCTION SCREEN
========================= */

function auction() {
  if (!state) return;

  const me =
    state.players.find(
      p => p.id === myId
    );


  /*
    HEADER
  */

  $("auctionAnime").textContent =
    A[state.anime][1];

  $("progress").textContent =
    `${Math.min(
      state.index + 1,
      state.total
    )} / ${state.total}`;

  $("roomSmall").textContent =
    state.code;


  /*
    WALLET
  */

  $("wallet").textContent =
    me
      ? `💰 ${me.budget}`
      : "—";


  /*
    PLAYERS
  */

  $("sidePlayers").innerHTML =
    state.players
      .map(
        p => `
          <div class="playerMini">

            <b>
              ${esc(p.name)}
              ${p.id === state.hostId ? " 👑" : ""}
            </b>

            <span>
              ${p.budget}
            </span>

          </div>
        `
      )
      .join("");


  /*
    HISTORY
  */

  $("history").innerHTML =
    state.history
      .slice()
      .reverse()
      .map(
        x => `
          <div class="sale">

            <b>
              ${esc(x.name)}
            </b>

            <span>
              ${
                x.bidderName === "Unsold"
                  ? "UNSOLD"
                  : `💰 ${x.bid} · ${esc(x.bidderName)}`
              }
            </span>

          </div>
        `
      )
      .join("");


  /*
    MY ROSTER
  */

  $("myRoster").innerHTML =
    me?.roster?.length
      ? me.roster
          .map(
            x => `
              <div class="rosterItem">

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


  /*
    NO CURRENT CHARACTER
  */

  if (!state.current) {
    $("bidBtn").disabled = true;

    if ($("hostBar")) {
      $("hostBar").innerHTML =
        creds?.hostToken
          ? `
            <button
              class="adminBtn"
              onclick="host('end')"
            >
              END AUCTION
            </button>
          `
          : "";
    }

    return;
  }


  /*
    CURRENT CHARACTER
  */

  $("charName").textContent =
    state.current.name;

  $("rating").textContent =
    `POWER ${state.current.rating}/10`;

  $("rarity").textContent =
    state.current.rating >= 9
      ? "LEGENDARY"
      : state.current.rating >= 8
      ? "ELITE"
      : "RARE";

  $("base").textContent =
    state.current.base;

  $("timer").textContent =
    state.current.timeLeft;

  $("bid").textContent =
    state.current.bid;

  $("bidder").textContent =
    state.current.bidderName
      ? `Leading: ${esc(state.current.bidderName)}`
      : "No bids yet";

  $("nextBid").textContent =
    state.current.bid +
    state.increment;


  /*
    BID BUTTON
  */

  const can =
    me &&
    state.current.bid +
      state.increment <=
      me.budget &&
    !state.paused &&
    !state.finished;

  $("bidBtn").disabled =
    !can;


  /*
    PORTRAIT
  */

  loadPortrait(
    state.current.name
  );


  /*
    HOST CONTROLS
  */

  if (creds?.hostToken) {
    $("hostBar").innerHTML = `

      <button
        class="adminBtn"
        onclick="host('pause',{value:${!state.paused}})"
      >
        ${state.paused ? "RESUME" : "PAUSE"}
      </button>

      <button
        class="adminBtn"
        onclick="host('skip')"
      >
        SKIP / NEXT
      </button>

      <button
        class="adminBtn"
        onclick="host('lock',{value:${!state.locked}})"
      >
        ${state.locked ? "UNLOCK" : "LOCK ROOM"}
      </button>

      <button
        class="adminBtn"
        onclick="host('end')"
      >
        END AUCTION
      </button>

    `;
  } else {
    $("hostBar").innerHTML =
      state.paused
        ? "<small>AUCTION PAUSED BY HOST</small>"
        : "";
  }
}


/* =========================
   CHARACTER PORTRAIT
========================= */

function loadPortrait(name) {
  const img = $("portrait");
  const fallback = $("portraitFallback");

  if (!img || !fallback) return;

  fallback.textContent =
    A[state.anime][0];

  img.classList.remove("loaded");

  const q =
    encodeURIComponent(name);


  img.onload = () => {
    $("portraitWrap")
      ?.classList
      ?.add("loaded");

    img.parentElement
      ?.classList
      ?.add("loaded");
  };


  img.onerror = () => {
    img.parentElement
      ?.classList
      ?.remove("loaded");
  };


  /*
    Jikan API
  */

  img.src =
    `https://api.jikan.moe/v4/characters?q=${q}&limit=1`;


  fetch(
    `https://api.jikan.moe/v4/characters?q=${q}&limit=1`
  )
    .then(r => r.json())
    .then(d => {

      const u =
        d?.data?.[0]
          ?.images
          ?.jpg
          ?.large_image_url ||
        d?.data?.[0]
          ?.images
          ?.jpg
          ?.image_url;

      if (u) {
        img.src = u;

        img.parentElement
          ?.classList
          ?.add("loaded");
      }
    })
    .catch(() => {});
}


/* =========================
   FINISH SCREEN
========================= */

function finish() {

  $("final").innerHTML = `

    <div class="finalGrid">

      ${state.players
        .map(
          p => `

            <div class="finalCard">

              <h3>
                ${esc(p.name)}
                ${p.id === state.hostId ? "👑" : ""}
              </h3>

              <p>
                💰 ${p.budget} remaining
                <br>

                ${
                  p.roster?.length
                    ? p.roster
                        .map(
                          x =>
                            `${esc(x.name)} — ${x.price}`
                        )
                        .join("<br>")
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
              text-align:center;
              margin-top:25px
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
        : `

          <p
            style="
              text-align:center;
              color:#8e96a9;
              margin-top:25px
            "
          >
            Waiting for the host to start a new auction…
          </p>

        `
    }

  `;
}


/* =========================
   ROOM FROM URL
========================= */

const q =
  new URLSearchParams(
    location.search
  ).get("room");

if (q) {
  $("joinCode").value =
    q.toUpperCase();

  $("joinName").focus();
  }
