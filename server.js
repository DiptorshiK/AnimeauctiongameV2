const express = require("express");
const http = require("http");
const crypto = require("crypto");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const rooms = new Map();

app.get("/health", (req, res) =>
  res.json({ ok: true, rooms: rooms.size })
);

const ANIME = {
  naruto: {
    name: "Naruto + Naruto Shippuden",
    icon: "🍥",
    theme: "leaf",
    characters: [
      ["Naruto Uzumaki", 10],
      ["Sasuke Uchiha", 10],
      ["Itachi Uchiha", 9],
      ["Madara Uchiha", 10],
      ["Obito Uchiha", 9],
      ["Kakashi Hatake", 8],
      ["Minato Namikaze", 9],
      ["Pain", 8],
      ["Hashirama Senju", 10],
      ["Might Guy", 8],
      ["Shikamaru Nara", 7],
      ["Gaara", 8],
      ["Jiraiya", 8],
      ["Orochimaru", 8],
      ["Rock Lee", 7]
    ]
  },

  jjk: {
    name: "Jujutsu Kaisen",
    icon: "👁️",
    theme: "cursed",
    characters: [
      ["Satoru Gojo", 10],
      ["Ryomen Sukuna", 10],
      ["Yuta Okkotsu", 9],
      ["Toji Fushiguro", 9],
      ["Suguru Geto", 9],
      ["Kenjaku", 9],
      ["Megumi Fushiguro", 8],
      ["Yuji Itadori", 8],
      ["Maki Zenin", 8],
      ["Mahito", 8],
      ["Kento Nanami", 7],
      ["Choso", 7],
      ["Aoi Todo", 7],
      ["Panda", 6],
      ["Toge Inumaki", 7]
    ]
  },

  aot: {
    name: "Attack on Titan",
    icon: "🧱",
    theme: "walls",
    characters: [
      ["Eren Yeager", 10],
      ["Levi Ackerman", 10],
      ["Mikasa Ackerman", 9],
      ["Armin Arlert", 8],
      ["Erwin Smith", 9],
      ["Reiner Braun", 8],
      ["Annie Leonhart", 8],
      ["Zeke Yeager", 9],
      ["Jean Kirstein", 7],
      ["Hange Zoe", 8],
      ["Pieck Finger", 8],
      ["Porco Galliard", 7],
      ["Sasha Blouse", 7],
      ["Connie Springer", 6]
    ]
  },

  demon_slayer: {
    name: "Demon Slayer",
    icon: "⚔️",
    theme: "breath",
    characters: [
      ["Tanjiro Kamado", 8],
      ["Nezuko Kamado", 8],
      ["Giyu Tomioka", 9],
      ["Kyojuro Rengoku", 9],
      ["Tengen Uzui", 9],
      ["Muichiro Tokito", 8],
      ["Mitsuri Kanroji", 8],
      ["Shinobu Kocho", 8],
      ["Akaza", 9],
      ["Kokushibo", 10],
      ["Muzan Kibutsuji", 10],
      ["Sanemi Shinazugawa", 9],
      ["Gyomei Himejima", 10],
      ["Doma", 9],
      ["Inosuke Hashibira", 7]
    ]
  },

  death_note: {
    name: "Death Note",
    icon: "📓",
    theme: "noir",
    characters: [
      ["Light Yagami", 10],
      ["L", 10],
      ["Ryuk", 9],
      ["Misa Amane", 7],
      ["Near", 8],
      ["Mello", 8],
      ["Rem", 8],
      ["Teru Mikami", 7],
      ["Soichiro Yagami", 7],
      ["Naomi Misora", 8],
      ["Matt", 6]
    ]
  }
};

const codes = () =>
  crypto.randomBytes(3).toString("hex").toUpperCase();

const token = () =>
  crypto.randomBytes(18).toString("hex");

function cleanName(n) {
  return String(n || "").trim().slice(0, 24);
}

function getRoom(code) {
  return rooms.get(String(code || "").toUpperCase());
}

function auth(room, socket, providedToken) {
  const player = room.players.get(socket.id);
  return player && player.token === providedToken ? player : null;
}

function host(room, socket, providedToken) {
  return room.hostId === socket.id &&
    room.hostToken === providedToken;
}

function createQueue(anime) {
  return ANIME[anime].characters
    .map(([name, rating]) => ({
      name,
      rating,
      base: Math.max(1, Math.floor(rating / 2))
    }))
    .sort(() => Math.random() - 0.5);
}

function pub(room) {
  return {
    code: room.code,
    anime: room.anime,
    started: room.started,
    locked: room.locked,
    paused: room.paused,
    finished: room.finished,

    budget: room.budget,
    increment: room.increment,
    timerSeconds: room.timerSeconds,

    hostId: room.hostId,

    index: room.index,
    total: room.queue.length,

    players: [...room.players.values()].map(p => ({
      id: p.id,
      name: p.name,
      budget: p.budget,
      roster: p.roster,
      online: p.online
    })),

    current: room.current
      ? {
          name: room.current.name,
          rating: room.current.rating,
          base: room.current.base,
          bid: room.current.bid,
          bidderId: room.current.bidderId,
          bidderName: room.current.bidderName,
          timeLeft: room.current.timeLeft
        }
      : null,

    history: room.history.slice(-20)
  };
}

function emit(room) {
  io.to(room.code).emit("state", pub(room));
}

function err(socket, message) {
  socket.emit("errorMsg", message);
}

io.on("connection", socket => {

  // =========================
  // CREATE ROOM
  // =========================

  socket.on(
    "createRoom",
    ({ anime, name, budget, increment, timer, password }) => {

      if (!ANIME[anime]) {
        return err(socket, "Choose an anime.");
      }

      name = cleanName(name);

      if (!name) {
        return err(socket, "Enter your name.");
      }

      let code;

      do {
        code = codes();
      } while (rooms.has(code));

      const room = {
        code,
        anime,

        hostId: socket.id,
        hostToken: token(),

        started: false,
        locked: false,
        paused: false,
        finished: false,

        budget: Math.max(10, Number(budget) || 100),
        increment: Math.max(1, Number(increment) || 1),
        timerSeconds: Math.max(5, Number(timer) || 12),

        password: String(password || "").slice(0, 40),

        players: new Map(),

        index: -1,
        current: null,

        history: [],
        timer: null,

        queue: createQueue(anime)
      };

      const player = {
        id: socket.id,
        token: token(),
        name,
        budget: room.budget,
        roster: [],
        online: true
      };

      room.players.set(socket.id, player);

      rooms.set(code, room);

      socket.join(code);

      socket.emit("credentials", {
        code,
        token: player.token,
        hostToken: room.hostToken
      });

      emit(room);
    }
  );

  // =========================
  // JOIN ROOM
  // =========================

  socket.on(
    "joinRoom",
    ({ code, name, password }) => {

      const room = getRoom(code);

      if (!room) {
        return err(socket, "Room not found.");
      }

      if (room.locked) {
        return err(socket, "This room is locked.");
      }

      if (room.started) {
        return err(
          socket,
          "Auction already started; joining is closed."
        );
      }

      if (room.password !== String(password || "")) {
        return err(socket, "Wrong room password.");
      }

      name = cleanName(name);

      if (!name) {
        return err(socket, "Enter your name.");
      }

      const player = {
        id: socket.id,
        token: token(),
        name,
        budget: room.budget,
        roster: [],
        online: true
      };

      room.players.set(socket.id, player);

      socket.join(room.code);

      socket.emit("credentials", {
        code: room.code,
        token: player.token,
        hostToken: null
      });

      emit(room);
    }
  );

  // =========================
  // HOST ACTIONS
  // =========================

  socket.on(
    "hostAction",
    ({ code, hostToken, action, payload = {} }) => {

      const room = getRoom(code);

      if (!room || !host(room, socket, hostToken)) {
        return err(socket, "Host permission required.");
      }

      // START
      if (action === "start") {

        if (room.started && !room.finished) {
          return;
        }

        room.started = true;
        room.finished = false;
        room.locked = true;
        room.paused = false;

        next(room);
      }

      // LOCK / UNLOCK
      else if (action === "lock") {

        room.locked = !!payload.value;
      }

      // PAUSE / RESUME
      else if (action === "pause") {

        room.paused = !!payload.value;

        if (!room.paused) {
          restartTimer(room);
        }
      }

      // SKIP
      else if (action === "skip") {

        if (room.current) {
          settle(room, true);
        } else {
          next(room);
        }
      }

      // END AUCTION
      else if (action === "end") {

        clearInterval(room.timer);

        room.finished = true;
        room.started = false;
        room.paused = false;
        room.current = null;

        emit(room);
      }

      // =========================
      // NEW AUCTION
      // =========================

      else if (action === "new") {

        clearInterval(room.timer);

        room.started = false;
        room.locked = false;
        room.paused = false;
        room.finished = false;

        room.index = -1;
        room.current = null;

        room.history = [];

        // Create a completely new randomized character queue
        room.queue = createQueue(room.anime);

        // Reset every player's budget and roster
        room.players.forEach(player => {
          player.budget = room.budget;
          player.roster = [];
        });

        emit(room);
      }

      // KICK PLAYER
      else if (action === "kick") {

        const player = room.players.get(payload.id);

        if (
          player &&
          player.id !== room.hostId
        ) {

          io.to(player.id).emit("kicked");

          room.players.delete(player.id);

          const playerSocket =
            io.sockets.sockets.get(player.id);

          if (playerSocket) {
            playerSocket.leave(room.code);
          }
        }
      }

      // SETTINGS
      else if (
        action === "settings" &&
        !room.started
      ) {

        room.budget = Math.max(
          10,
          Number(payload.budget) || 100
        );

        room.increment = Math.max(
          1,
          Number(payload.increment) || 1
        );

        room.timerSeconds = Math.max(
          5,
          Number(payload.timer) || 12
        );

        room.password =
          String(payload.password || "").slice(0, 40);

        room.players.forEach(player => {
          player.budget = room.budget;
        });
      }

      emit(room);
    }
  );

  // =========================
  // BID
  // =========================

  socket.on(
    "bid",
    ({ code, token: playerToken }) => {

      const room = getRoom(code);

      const player =
        room &&
        auth(room, socket, playerToken);

      if (
        !player ||
        !room.current ||
        room.paused ||
        room.finished
      ) {
        return;
      }

      const amount =
        room.current.bid + room.increment;

      if (amount > player.budget) {
        return err(
          socket,
          "Not enough budget."
        );
      }

      room.current.bid = amount;

      room.current.bidderId = player.id;

      room.current.bidderName = player.name;

      room.current.timeLeft =
        room.timerSeconds;

      emit(room);
    }
  );

  // =========================
  // REJOIN
  // =========================

  socket.on(
    "rejoin",
    ({ code, token: playerToken }) => {

      const room = getRoom(code);

      if (!room) {
        return;
      }

      for (const player of room.players.values()) {

        if (player.token === playerToken) {

          room.players.delete(player.id);

          player.id = socket.id;
          player.online = true;

          room.players.set(socket.id, player);

          socket.join(code);

          socket.emit("credentials", {
            code,
            token: playerToken,
            hostToken:
              room.hostId === socket.id
                ? room.hostToken
                : null
          });

          emit(room);

          return;
        }
      }

      err(
        socket,
        "Session expired. Rejoin the room."
      );
    }
  );

  // =========================
  // DISCONNECT
  // =========================

  socket.on("disconnect", () => {

    for (const room of rooms.values()) {

      const player =
        room.players.get(socket.id);

      if (player) {

        player.online = false;

        emit(room);
      }
    }
  });
});

// =========================
// TIMER
// =========================

function restartTimer(room) {

  clearInterval(room.timer);

  if (
    !room.current ||
    room.paused ||
    room.finished
  ) {
    return;
  }

  room.timer = setInterval(() => {

    if (
      !room.current ||
      room.paused
    ) {
      return;
    }

    room.current.timeLeft--;

    if (room.current.timeLeft <= 0) {

      settle(room, false);

    } else {

      emit(room);
    }

  }, 1000);
}

// =========================
// NEXT CHARACTER
// =========================

function next(room) {

  clearInterval(room.timer);

  if (
    room.index + 1 >=
    room.queue.length
  ) {

    room.finished = true;
    room.started = false;
    room.current = null;

    emit(room);

    return;
  }

  room.index++;

  const character =
    room.queue[room.index];

  room.current = {
    ...character,

    bid: character.base,

    bidderId: null,

    bidderName: null,

    timeLeft: room.timerSeconds
  };

  restartTimer(room);

  emit(room);
}

// =========================
// SETTLE CHARACTER
// =========================

function settle(room, forced) {

  clearInterval(room.timer);

  const character = room.current;

  if (
    character &&
    character.bidderId
  ) {

    const player =
      room.players.get(
        character.bidderId
      );

    if (
      player &&
      character.bid <= player.budget
    ) {

      player.budget -= character.bid;

      player.roster.push({
        name: character.name,
        rating: character.rating,
        price: character.bid
      });

      room.history.push({
        name: character.name,
        bid: character.bid,
        bidderName: player.name
      });
    }

  } else if (character) {

    room.history.push({
      name: character.name,
      bid: 0,
      bidderName: "Unsold"
    });
  }

  room.current = null;

  if (forced) {

    next(room);

  } else {

    setTimeout(() => {

      if (
        !room.finished &&
        !room.current
      ) {
        next(room);
      }

    }, 1200);
  }

  emit(room);
}

// =========================
// CLEAN EMPTY ROOMS
// =========================

setInterval(() => {

  for (const [code, room] of rooms) {

    if (room.players.size === 0) {

      clearInterval(room.timer);

      rooms.delete(code);
    }
  }

}, 10 * 60 * 1000);

// =========================
// START SERVER
// =========================

server.listen(
  process.env.PORT || 3000,
  () => {
    console.log(
      "Anime Auction V2 running"
    );
  }
);
