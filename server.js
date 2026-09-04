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

/*
=========================================================
430 AUCTION ENTRIES
=========================================================
Naruto          100
JJK             100
Attack on Titan 100
Demon Slayer    100
Death Note       30
TOTAL           430
=========================================================
*/

const ANIME = {

  // =====================================================
  // NARUTO
  // =====================================================

  naruto: {
    name: "Naruto + Naruto Shippuden",
    icon: "🍥",
    theme: "leaf",

    characters: [
      ["Naruto Uzumaki", 10],
      ["Sasuke Uchiha", 10],
      ["Sakura Haruno", 8],
      ["Kakashi Hatake", 9],
      ["Itachi Uchiha", 10],
      ["Madara Uchiha", 10],
      ["Obito Uchiha", 9],
      ["Minato Namikaze", 10],
      ["Hashirama Senju", 10],
      ["Tobirama Senju", 9],
      ["Hiruzen Sarutobi", 8],
      ["Tsunade", 8],
      ["Jiraiya", 9],
      ["Orochimaru", 8],
      ["Kabuto Yakushi", 7],
      ["Pain", 9],
      ["Konan", 7],
      ["Nagato", 9],
      ["Killer B", 8],
      ["Gaara", 8],
      ["Rock Lee", 7],
      ["Might Guy", 9],
      ["Neji Hyuga", 7],
      ["Hinata Hyuga", 7],
      ["Shikamaru Nara", 8],
      ["Choji Akimichi", 6],
      ["Ino Yamanaka", 6],
      ["Kiba Inuzuka", 6],
      ["Shino Aburame", 6],
      ["Tenten", 5],
      ["Sai", 6],
      ["Yamato", 7],
      ["Asuma Sarutobi", 7],
      ["Kurenai Yuhi", 6],
      ["Anko Mitarashi", 5],
      ["Iruka Umino", 5],
      ["Might Duy", 6],
      ["Danzo Shimura", 7],
      ["Kushina Uzumaki", 7],
      ["Fugaku Uchiha", 7],
      ["Mikoto Uchiha", 5],
      ["Shisui Uchiha", 9],
      ["Izuna Uchiha", 7],
      ["Kagami Uchiha", 6],
      ["Sakumo Hatake", 8],
      ["Rin Nohara", 5],
      ["Black Zetsu", 7],
      ["White Zetsu", 5],
      ["Kaguya Otsutsuki", 10],
      ["Hagoromo Otsutsuki", 10],
      ["Hamura Otsutsuki", 9],
      ["Indra Otsutsuki", 9],
      ["Asura Otsutsuki", 9],
      ["Momoshiki Otsutsuki", 10],
      ["Kinshiki Otsutsuki", 8],
      ["Toneri Otsutsuki", 8],
      ["Urashiki Otsutsuki", 8],
      ["Koji Kashin", 8],
      ["Code", 8],
      ["Delta", 8],
      ["Jigen", 9],
      ["Isshiki Otsutsuki", 10],
      ["Kawaki", 8],
      ["Boruto Uzumaki", 8],
      ["Sarada Uchiha", 8],
      ["Mitsuki", 8],
      ["Shinki", 7],
      ["Temari", 7],
      ["Kankuro", 6],
      ["Chiyo", 7],
      ["Sasori", 8],
      ["Deidara", 8],
      ["Kisame Hoshigaki", 8],
      ["Hidan", 7],
      ["Kakuzu", 7],
      ["Zabuza Momochi", 7],
      ["Haku", 6],
      ["Kimimaro", 7],
      ["Jugo", 6],
      ["Suigetsu Hozuki", 6],
      ["Karin Uzumaki", 6],
      ["Shikaku Nara", 7],
      ["Shikamaru Nara (Shippuden)", 8],
      ["Naruto Uzumaki (Sage Mode)", 10],
      ["Naruto Uzumaki (KCM)", 10],
      ["Naruto Uzumaki (Six Paths)", 10],
      ["Sasuke Uchiha (EMS)", 10],
      ["Sasuke Uchiha (Rinnegan)", 10],
      ["Madara Uchiha (Ten-Tails)", 10],
      ["Obito Uchiha (Ten-Tails)", 10],
      ["Might Guy (Eight Gates)", 10],
      ["Kakashi Hatake (Double Mangekyo)", 10],
      ["Hashirama Senju (Sage Mode)", 10],
      ["Minato Namikaze (KCM)", 10],
      ["Itachi Uchiha (Reanimated)", 9],
      ["Nagato (Six Paths)", 9],
      ["Orochimaru (War Arc)", 8],
      ["Kabuto (Sage Mode)", 8]
    ]
  },

  // =====================================================
  // JUJUTSU KAISEN
  // =====================================================

  jjk: {
    name: "Jujutsu Kaisen",
    icon: "👁️",
    theme: "cursed",

    characters: [
      ["Satoru Gojo", 10],
      ["Ryomen Sukuna", 10],
      ["Yuji Itadori", 9],
      ["Megumi Fushiguro", 9],
      ["Yuta Okkotsu", 10],
      ["Maki Zenin", 9],
      ["Toji Fushiguro", 10],
      ["Suguru Geto", 9],
      ["Kenjaku", 10],
      ["Mahito", 8],
      ["Jogo", 8],
      ["Hanami", 7],
      ["Dagon", 8],
      ["Choso", 9],
      ["Kento Nanami", 8],
      ["Aoi Todo", 8],
      ["Toge Inumaki", 7],
      ["Panda", 7],
      ["Nobara Kugisaki", 8],
      ["Kasumi Miwa", 6],
      ["Mai Zenin", 6],
      ["Kokichi Muta", 7],
      ["Mechamaru", 7],
      ["Utahime Iori", 6],
      ["Shoko Ieiri", 7],
      ["Masamichi Yaga", 7],
      ["Kiyotaka Ijichi", 5],
      ["Akari Nitta", 5],
      ["Momo Nishimiya", 6],
      ["Noritoshi Kamo", 7],
      ["Naobito Zenin", 8],
      ["Naoya Zenin", 8],
      ["Ogi Zenin", 6],
      ["Jinichi Zenin", 6],
      ["Ranta Zenin", 5],
      ["Chojuro Zenin", 5],
      ["Nobuaki Zenin", 5],
      ["Reggie Star", 8],
      ["Hajime Kashimo", 10],
      ["Takako Uro", 9],
      ["Ryu Ishigori", 9],
      ["Charles Bernard", 6],
      ["Hana Kurusu", 8],
      ["Angel", 9],
      ["Hiromi Higuruma", 9],
      ["Fumihiko Takaba", 9],
      ["Kirara Hoshi", 7],
      ["Kinji Hakari", 9],
      ["Uraume", 9],
      ["Yuki Tsukumo", 9],
      ["Tengen", 9],
      ["Miguel", 8],
      ["Larue", 7],
      ["Manami Suda", 6],
      ["Mimiko Hasaba", 6],
      ["Nanako Hasaba", 6],
      ["Shiu Kong", 6],
      ["Riko Amanai", 6],
      ["Misato Kuroi", 5],
      ["Yu Haibara", 6],
      ["Haruta Shigemo", 5],
      ["Jiro Awasaka", 6],
      ["Ogami", 6],
      ["Kokun", 5],
      ["Bayer", 5],
      ["Eso", 7],
      ["Kechizu", 6],
      ["Smallpox Deity", 7],
      ["Kurourushi", 8],
      ["Naoya Zenin (Cursed Spirit)", 9],
      ["Finger Bearer", 6],
      ["Grasshopper Curse", 5],
      ["Locust Curse", 5],
      ["Fly Heads", 4],
      ["Ganesha", 7],
      ["Ko-Guy", 5],
      ["Dharma Body", 6],
      ["Sukuna (15 Fingers)", 10],
      ["Sukuna (20 Fingers)", 10],
      ["Sukuna (Heian Form)", 10],
      ["Gojo (Awakened)", 10],
      ["Gojo (Teen)", 9],
      ["Toji Fushiguro (Awakened)", 10],
      ["Maki Zenin (Awakened)", 10],
      ["Yuta Okkotsu (Fully Manifested)", 10],
      ["Yuji Itadori (Awakened)", 10],
      ["Megumi Fushiguro (Mahoraga)", 9],
      ["Mahoraga", 10],
      ["Agito", 9],
      ["Kashimo (Mythical Beast Amber)", 10],
      ["Hakari Kinji (Jackpot)", 9],
      ["Higuruma (Domain Expansion)", 9],
      ["Yuki Tsukumo (Star Rage)", 10],
      ["Kenjaku (Geto Body)", 10],
      ["Geto (Maximum Uzumaki)", 9],
      ["Choso (Awakened)", 9],
      ["Todo (Boogie Woogie)", 8],
      ["Mahito (Instant Spirit Body)", 9],
      ["Jogo (Maximum Meteor)", 9],
      ["Dagon (Domain)", 8]
    ]
  },

  // =====================================================
  // ATTACK ON TITAN
  // =====================================================

  aot: {
    name: "Attack on Titan",
    icon: "🧱",
    theme: "walls",

    characters: [
      ["Eren Yeager", 10],
      ["Levi Ackerman", 10],
      ["Mikasa Ackerman", 9],
      ["Armin Arlert", 9],
      ["Erwin Smith", 9],
      ["Hange Zoe", 8],
      ["Jean Kirstein", 8],
      ["Sasha Blouse", 7],
      ["Connie Springer", 7],
      ["Historia Reiss", 8],
      ["Ymir", 7],
      ["Reiner Braun", 9],
      ["Annie Leonhart", 9],
      ["Zeke Yeager", 9],
      ["Pieck Finger", 8],
      ["Porco Galliard", 8],
      ["Marcel Galliard", 7],
      ["Falco Grice", 8],
      ["Gabi Braun", 7],
      ["Bertholdt Hoover", 8],
      ["Marco Bott", 6],
      ["Floch Forster", 7],
      ["Petra Ral", 7],
      ["Eld Jinn", 6],
      ["Oluo Bozado", 6],
      ["Gunther Schultz", 6],
      ["Moblit Berner", 6],
      ["Mike Zacharias", 8],
      ["Nanaba", 6],
      ["Gelgar", 6],
      ["Daz", 5],
      ["Samuel Linke-Jackson", 5],
      ["Louise", 5],
      ["Rico Brzenska", 6],
      ["Ian Dietrich", 6],
      ["Mitabi Jarnach", 6],
      ["Marlowe Freudenberg", 7],
      ["Hitch Dreyse", 6],
      ["Dot Pixis", 7],
      ["Nile Dok", 7],
      ["Keith Shadis", 7],
      ["Darius Zackly", 6],
      ["Willy Tybur", 6],
      ["Lara Tybur", 7],
      ["Uri Reiss", 7],
      ["Rod Reiss", 6],
      ["Frieda Reiss", 8],
      ["Grisha Yeager", 8],
      ["Carla Yeager", 5],
      ["Dina Fritz", 6],
      ["Eren Kruger", 8],
      ["Tom Ksaver", 7],
      ["Kenny Ackerman", 9],
      ["Kuchel Ackerman", 5],
      ["Levi (No Regrets)", 9],
      ["Erwin (Commander)", 9],
      ["Hange (Commander)", 9],
      ["Eren (Training)", 7],
      ["Eren (Founding Titan)", 10],
      ["Eren (Attack Titan)", 10],
      ["Eren (War Hammer)", 10],
      ["Armin (Colossal Titan)", 10],
      ["Reiner (Armored Titan)", 9],
      ["Annie (Female Titan)", 9],
      ["Zeke (Beast Titan)", 9],
      ["Porco (Jaw Titan)", 8],
      ["Ymir (Jaw Titan)", 8],
      ["Falco (Jaw Titan)", 8],
      ["Pieck (Cart Titan)", 8],
      ["Bertholdt (Colossal Titan)", 9],
      ["Marcel (Jaw Titan)", 8],
      ["Rod Reiss (Titan)", 8],
      ["Grisha (Attack Titan)", 8],
      ["Frieda (Founding Titan)", 9],
      ["Eren (Coordinate)", 10],
      ["Eren (Paths)", 10],
      ["Mikasa (Final Battle)", 10],
      ["Levi (Final Battle)", 10],
      ["Armin (Commander)", 9],
      ["Jean (Commander)", 8],
      ["Connie (Final Battle)", 7],
      ["Sasha (Garrison)", 7],
      ["Historia (Queen)", 8],
      ["Ymir (Scout Regiment)", 7],
      ["Reiner (Final Battle)", 9],
      ["Annie (Awakened)", 9],
      ["Zeke (Royal Blood)", 9],
      ["Pieck (Final Battle)", 8],
      ["Falco (Flying Titan)", 9],
      ["Gabi (Final Battle)", 8],
      ["Floch (Yeagerist Leader)", 8],
      ["Kenny (Captain)", 9],
      ["Mike (Scout Commander)", 8],
      ["Erwin (Charge)", 10],
      ["Levi (Beast Titan Battle)", 10]
    ]
  },

  // =====================================================
  // DEMON SLAYER
  // =====================================================

  demon_slayer: {
    name: "Demon Slayer",
    icon: "⚔️",
    theme: "breath",

    characters: [
      ["Tanjiro Kamado", 9],
      ["Nezuko Kamado", 9],
      ["Zenitsu Agatsuma", 8],
      ["Inosuke Hashibira", 8],
      ["Giyu Tomioka", 9],
      ["Kyojuro Rengoku", 9],
      ["Tengen Uzui", 9],
      ["Muichiro Tokito", 9],
      ["Mitsuri Kanroji", 8],
      ["Shinobu Kocho", 8],
      ["Sanemi Shinazugawa", 9],
      ["Gyomei Himejima", 10],
      ["Obanai Iguro", 8],
      ["Genya Shinazugawa", 8],
      ["Sakonji Urokodaki", 7],
      ["Jigoro Kuwajima", 7],
      ["Kanae Kocho", 8],
      ["Kanao Tsuyuri", 8],
      ["Aoi Kanzaki", 6],
      ["Tamayo", 8],
      ["Yushiro", 7],
      ["Muzan Kibutsuji", 10],
      ["Kokushibo", 10],
      ["Doma", 10],
      ["Akaza", 9],
      ["Hantengu", 9],
      ["Gyokko", 8],
      ["Gyutaro", 8],
      ["Daki", 8],
      ["Kaigaku", 8],
      ["Nakime", 8],
      ["Rui", 7],
      ["Enmu", 7],
      ["Kyogai", 6],
      ["Susamaru", 6],
      ["Yahaba", 6],
      ["Swamp Demon", 6],
      ["Hand Demon", 6],
      ["Temple Demon", 5],
      ["Spider Demon Mother", 6],
      ["Spider Demon Father", 6],
      ["Spider Demon Brother", 6],
      ["Spider Demon Sister", 6],
      ["Mukago", 6],
      ["Wakuraba", 6],
      ["Rokuro", 6],
      ["Kamanue", 5],
      ["Kyogai (Drum Demon)", 6],
      ["Akaza (Upper Three)", 9],
      ["Doma (Upper Two)", 10],
      ["Kokushibo (Upper One)", 10],
      ["Tanjiro (Hinokami Kagura)", 10],
      ["Tanjiro (Sun Breathing)", 10],
      ["Tanjiro (Demon Slayer Mark)", 10],
      ["Tanjiro (Demon Form)", 10],
      ["Nezuko (Awakened)", 9],
      ["Nezuko (Demon Form)", 9],
      ["Zenitsu (Godspeed)", 9],
      ["Zenitsu (Thunderclap)", 9],
      ["Inosuke (Beast Breathing)", 8],
      ["Giyu (Dead Calm)", 9],
      ["Rengoku (Flame Breathing)", 9],
      ["Tengen (Musical Score)", 9],
      ["Muichiro (Demon Slayer Mark)", 9],
      ["Mitsuri (Demon Slayer Mark)", 9],
      ["Sanemi (Demon Slayer Mark)", 10],
      ["Gyomei (Demon Slayer Mark)", 10],
      ["Obanai (Demon Slayer Mark)", 9],
      ["Genya (Demon Form)", 8],
      ["Kanao (Final Battle)", 9],
      ["Akaza (Compass Needle)", 9],
      ["Akaza (Annihilation Type)", 10],
      ["Doma (Ice Techniques)", 10],
      ["Kokushibo (Moon Breathing)", 10],
      ["Muzan (Final Battle)", 10],
      ["Muzan (Demon Form)", 10],
      ["Hantengu (Zohakuten)", 9],
      ["Hantengu (Sekido)", 8],
      ["Hantengu (Karaku)", 8],
      ["Hantengu (Aizetsu)", 8],
      ["Hantengu (Urogi)", 8],
      ["Gyokko (True Form)", 9],
      ["Gyutaro (Awakened)", 9],
      ["Daki (Awakened)", 8],
      ["Kaigaku (Blood Demon Art)", 8],
      ["Rui (Thread Demon)", 7],
      ["Enmu (Dream Manipulation)", 8],
      ["Tamayo (Medicine)", 8],
      ["Yushiro (Blood Demon Art)", 8],
      ["Kanao (Flower Breathing)", 8],
      ["Shinobu (Insect Breathing)", 8],
      ["Kanae (Flower Breathing)", 8],
      ["Rengoku (Final Battle)", 9],
      ["Giyu (Final Battle)", 9],
      ["Sanemi (Final Battle)", 10],
      ["Gyomei (Final Battle)", 10],
      ["Obanai (Final Battle)", 9],
      ["Mitsuri (Final Battle)", 9],
      ["Muichiro (Final Battle)", 9],
      ["Tengen (Entertainment District)", 9],
      ["Tanjiro (Final Battle)", 10],
      ["Nezuko (Human Form)", 8]
    ]
  },

  // =====================================================
  // DEATH NOTE
  // =====================================================

  death_note: {
    name: "Death Note",
    icon: "📓",
    theme: "noir",

    characters: [
      ["Light Yagami", 10],
      ["L", 10],
      ["Ryuk", 9],
      ["Misa Amane", 8],
      ["Near", 9],
      ["Mello", 9],
      ["Rem", 9],
      ["Teru Mikami", 8],
      ["Soichiro Yagami", 8],
      ["Naomi Misora", 8],
      ["Matt", 7],
      ["Touta Matsuda", 7],
      ["Shuichi Aizawa", 7],
      ["Kanzo Mogi", 6],
      ["Hirokazu Ukita", 6],
      ["Watari", 8],
      ["Roger Ruvie", 6],
      ["Aiber", 7],
      ["Wedy", 7],
      ["Raye Penber", 7],
      ["Higuchi Kyosuke", 7],
      ["Kiyomi Takada", 7],
      ["Reiji Namikawa", 7],
      ["Halle Lidner", 7],
      ["Anthony Rester", 7],
      ["Stephen Gevanni", 7],
      ["Rod Ross", 6],
      ["Sidoh", 7],
      ["Gelus", 7],
      ["Midora", 6]
    ]
  }
};

// =========================================================
// HELPERS
// =========================================================

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

  return player && player.token === providedToken
    ? player
    : null;
}

function host(room, socket, providedToken) {
  return (
    room.hostId === socket.id &&
    room.hostToken === providedToken
  );
}

function createQueue(anime) {
  return ANIME[anime].characters
    .map(([name, rating]) => ({
      name,
      rating,
      base: Math.max(
        1,
        Math.floor(rating / 2)
      )
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

    players: [
      ...room.players.values()
    ].map(p => ({
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
  io.to(room.code).emit(
    "state",
    pub(room)
  );
}

function err(socket, message) {
  socket.emit(
    "errorMsg",
    message
  );
}

// =========================================================
// SOCKET.IO
// =========================================================

io.on("connection", socket => {

  // =======================================================
  // CREATE ROOM
  // =======================================================

  socket.on(
    "createRoom",
    ({
      anime,
      name,
      budget,
      increment,
      timer,
      password
    }) => {

      if (!ANIME[anime]) {
        return err(
          socket,
          "Choose an anime."
        );
      }

      name = cleanName(name);

      if (!name) {
        return err(
          socket,
          "Enter your name."
        );
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

        budget: Math.max(
          10,
          Number(budget) || 100
        ),

        increment: Math.max(
          1,
          Number(increment) || 1
        ),

        timerSeconds: Math.max(
          5,
          Number(timer) || 12
        ),

        password:
          String(password || "")
            .slice(0, 40),

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

      room.players.set(
        socket.id,
        player
      );

      rooms.set(code, room);

      socket.join(code);

      socket.emit(
        "credentials",
        {
          code,
          token: player.token,
          hostToken: room.hostToken
        }
      );

      emit(room);
    }
  );

  // =======================================================
  // JOIN ROOM
  // =======================================================

  socket.on(
    "joinRoom",
    ({
      code,
      name,
      password
    }) => {

      const room = getRoom(code);

      if (!room) {
        return err(
          socket,
          "Room not found."
        );
      }

      if (room.locked) {
        return err(
          socket,
          "This room is locked."
        );
      }

      if (room.started) {
        return err(
          socket,
          "Auction already started; joining is closed."
        );
      }

      if (
        room.password !==
        String(password || "")
      ) {
        return err(
          socket,
          "Wrong room password."
        );
      }

      name = cleanName(name);

      if (!name) {
        return err(
          socket,
          "Enter your name."
        );
      }

      const player = {
        id: socket.id,
        token: token(),
        name,
        budget: room.budget,
        roster: [],
        online: true
      };

      room.players.set(
        socket.id,
        player
      );

      socket.join(room.code);

      socket.emit(
        "credentials",
        {
          code: room.code,
          token: player.token,
          hostToken: null
        }
      );

      emit(room);
    }
  );

  // =======================================================
  // HOST ACTIONS
  // =======================================================

  socket.on(
    "hostAction",
    ({
      code,
      hostToken,
      action,
      payload = {}
    }) => {

      const room = getRoom(code);

 
