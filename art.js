"use strict";

const CryptArt = (() => {
  const iconPaths = {
    logo: "M12 2 21 8v8l-9 6-9-6V8l9-6Zm0 3.5L16.8 12 12 18.5 7.2 12 12 5.5Zm0 0v13M4 9l3.2 3m9.6 0L20 9",
    compass: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM16 8l-2 6-6 2 2-6 6-2Z",
    map: "M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15",
    skull: "M20 11c0-5-3-8-8-8s-8 3-8 8c0 3 2 5 4 6v4h8v-4c2-1 4-3 4-6ZM8 12h.1m7.9 0h.1M10 18v3m4-3v3m-2-7-1 2h2",
    ash: "M12 2c2 5-3 7-3 10-1-1-2-2-2-4-5 6-4 13 5 13s10-8 4-14c0 3-1 4-2 5 1-4-1-7-2-10Zm0 13c2 2 3 4 0 5-2-1-3-3 0-5Z",
    door: "M4 21h16M7 21V9a5 5 0 0 1 10 0v12m-7-1V9a2 2 0 0 1 4 0v11m-1-6h.1",
    sword: "M5 19 16 8m-9 4 5 5m-7-1 3 3-2 2-3-3 2-2Zm4-1 7-10 5-2-2 5-10 7Z",
    heart: "M12 20 4 12a5 5 0 0 1 8-6 5 5 0 0 1 8 6l-8 8Z",
    seal: "M12 2 21 7v10l-9 5-9-5V7l9-5Zm0 4 5 6-5 6-5-6 5-6Zm-3 6h6m-3-4v8",
    potion: "M9 3h6m-5 0v7l-5 6a3 3 0 0 0 2.4 5h9.2a3 3 0 0 0 2.4-5l-5-6V3m-7 12h10",
    bag: "M7 9h10l3 10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2L7 9Zm1 0-2-6h12l-2 6m-8 6h8",
    shield: "M12 2 20 6v7c0 4-4 7-8 9-4-2-8-5-8-9V6l8-4Zm-3 10 2 2 4-4",
    scroll: "M7 3h11a3 3 0 0 1 3 3v2h-5m0-2v12a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-2h11v2a2 2 0 0 0 3 1m-9-3V6a3 3 0 0 1 3-3m0 7h3m-3 3h3",
    stairs: "M3 19h6v-5h5V9h6V4m-1 15h2m-1-3v6",
    check: "M4 12l5 5L20 6",
    dash: "M3 7h10m-9 5h16m-6-5 6 5-6 5m-10 0h6",
    hand: "M6 12V8a1.5 1.5 0 0 1 3 0v3-6a1.5 1.5 0 0 1 3 0v6-5a1.5 1.5 0 0 1 3 0v5-3a1.5 1.5 0 0 1 3 0v7c0 5-3 7-7 7-2 0-4-1-5-3l-3-5c-1-3 1-4 3-2Z",
    help: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9 9a3 3 0 1 1 4.4 2.7c-1.2.6-1.4 1-1.4 2.3m0 3h.1",
    pause: "M8 5v14m8-14v14",
    sound: "M3 9h4l5-4v14l-5-4H3V9Zm12 0c2 2 2 4 0 6m3-9c4 4 4 8 0 12",
    mute: "M3 9h4l5-4v14l-5-4H3V9Zm13 0 5 6m0-6-5 6",
    close: "M5 5l14 14M19 5 5 19",
  };
  const paths = Object.fromEntries(Object.entries(iconPaths).map(([key, value]) => [key, new Path2D(value)]));
  const glyph = (name, extra = "") => `<span data-icon="${name}" ${extra}></span>`;
  const iconKeys = new Set(Object.keys(paths));

  function paintIcons(root = document) {
    const elements = [...root.querySelectorAll("[data-icon]")];
    if (root.matches?.("[data-icon]")) elements.unshift(root);
    for (const element of elements) {
      const key = element.dataset.icon;
      const color = getComputedStyle(element).color;
      if (!paths[key] || element.dataset.rendered === key + color) continue;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 56;
      canvas.className = "glyph";
      canvas.setAttribute("aria-hidden", "true");
      const ctx = canvas.getContext("2d");
      ctx.scale(56 / 24, 56 / 24);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.55;
      ctx.lineJoin = ctx.lineCap = "round";
      ctx.stroke(paths[key]);
      element.replaceChildren(canvas);
      element.dataset.rendered = key + color;
      if (element.tagName === "SPAN") element.setAttribute("aria-hidden", "true");
    }
  }

  const sprites = {
    player: {
      colors: { x: "#151b1d", b: "#394b4d", s: "#758783", i: "#bcc9b6", g: "#fae2b0", o: "#bd683b", a: "#883d2a", w: "#edf2dc" },
      rows: [".....xxxxx.....","....xbsisbx....","...xbsiiisbx...","...xsgiigsbx...","...xbxxxxxix...","....xsssxx.....","..xxoixisaxx...","..xoaisisaoix..","..xaaibsbaoix..","..xaoxsssxabxx.","..xaooxsxaax...","...xooaxaoax...","....xaxbxsx....",".....xsxbx.....","....xssxxsx....","....xxxxxxx...."],
    },
    rat: {
      colors: { x: "#211818", d: "#572829", r: "#894842", a: "#b36e5f", i: "#e6a28a", w: "#f4d9aa" },
      rows: ["..............","..xx.....xx...","..xrxxxxxrx...","..xarrrraax...","...xdrrdx.....","...xwddwx.....","...xrrarx.....","..xdiaardx....","..xddrrddxx...","...xddadxrx...","...xxdx..xrxx.","....xx....xxx."],
    },
    guard: {
      colors: { x: "#191b18", d: "#4d4940", s: "#7d7a61", i: "#b7b196", w: "#e5ddbb", r: "#fa965d" },
      rows: [".....xxxxx.....","....xdiiidx....","...xdiwwwidx...","...xwiiwiiwx...","...xiixrxiwx...","...xwxxixiwx...","....xiiiwxx....",".....xixdx.....","..xxsxdxisxx...","..xiidwwdiix...","..xdsdiidsdx...","..x.xsiisx.x...","..x..xwwx...x..",".....xdxix.....","....xdxxixx....","....xxxxxwx...."],
    },
    wisp: {
      colors: { x: "#12242c", d: "#1d545a", s: "#428982", i: "#7ac9a0", w: "#d8eab9", r: "#f6f4d1" },
      rows: ["........x.......",".....x.xsx......","....xsxixdx.....","...xdsiiiix.....","...xdwiwiwdx....","..xdswwwwisx....","..xsirwsrisix...","..xdiwwwiwidx...","...xsiwwisix....","...xdsiiisdx....","....xdsdsdx.....",".....xdxdx......",".....x.x........"],
    },
    keeper: {
      colors: { x: "#161715", d: "#504434", s: "#7d6a4b", i: "#b6a47c", w: "#e6d5a7", r: "#f7985f", a: "#913d2c" },
      rows: ["xx.........xx","xix.......xix","xwix.xxx.xiwx",".xwxxiiiixwx.",".xxiwiiiwixx.","..xiwdidwix..","..xiwrwrwix..","...xwwwwwx...","..xxwidiwxx..",".xaaxwxxxax..","xaxsswddssxax","xaxidwidsixax","x.xsiiwiisx.x",".x..xiiix..x.","...xssxssx...","...xxx.xxx..."],
    },
    heart: {
      colors: { x: "#251a16", d: "#512520", s: "#93402d", i: "#dc7750", w: "#f5aa66", r: "#ffe0a0", a: "#68382c" },
      rows: ["...xx.....xx...","...xix...xix...","..xdwxx.xxwdx..",".xdiiwsxswiidx.",".xdwrrrrrrwdx..",".xwsrwwiwrwix..","xdisiwrrwisidx.","xsiwwirriwwisx.","xdiiirrriiidx..",".xdiiwrwiidx...",".xasiiwiisax...",".xdasiiisadx...","..xdsisdsdx....","...xdxdxdx.....","....x.x.x......"],
    },
  };

  function makeSprite({ colors, rows }) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(...rows.map((row) => row.length));
    canvas.height = rows.length;
    const ctx = canvas.getContext("2d");
    rows.forEach((row, y) => [...row].forEach((key, x) => {
      if (!colors[key]) return;
      ctx.fillStyle = colors[key];
      ctx.fillRect(x, y, 1, 1);
    }));
    return canvas;
  }

  const spriteImages = Object.fromEntries(Object.entries(sprites).map(([key, value]) => [key, makeSprite(value)]));
  const background = new Image();
  background.src = "assets/crypt.webp";
  const biomes = ["#00000000", "#18768f30", "#a7883a29", "#753c812d", "#a84a2e36"];
  const doorColor = { open: "#b6d790", lock: "#cc7f61", shut: "#4e4e41" };
  const fog = [];
  for (let i = 0; i < 40; i += 1) fog.push({ x: Math.random() * 480, y: Math.random() * 300, phase: Math.random() * 10, size: Math.random() + .4 });
  const ellipse = (ctx, x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  function drawBackground(ctx, run, time) {
    if (background.complete && background.naturalWidth) ctx.drawImage(background, 0, 0, Crypt.width, Crypt.height);
    else {
      ctx.fillStyle = "#242f2c";
      ctx.fillRect(0, 0, Crypt.width, Crypt.height);
    }
    ctx.fillStyle = biomes[run.floor];
    ctx.fillRect(0, 0, Crypt.width, Crypt.height);
    const shade = ctx.createRadialGradient(240, 151, 90, 240, 150, 265);
    shade.addColorStop(0, "#070b0900");
    shade.addColorStop(1, "#090a09ae");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, Crypt.width, Crypt.height);
    for (const particle of fog) {
      const amount = .20 + Math.sin(particle.phase + time / 830) * .18;
      const y = (particle.y - time / 160 % 300 + 300) % 300;
      ctx.fillStyle = `rgba(238,180,120,${amount})`;
      ctx.fillRect(particle.x, y, particle.size, particle.size);
    }
  }

  function drawDoors(ctx, run, room) {
    for (const door of Crypt.directions) {
      const connected = Crypt.neighbor(run.rooms, room, door) >= 0;
      const color = !connected ? doorColor.shut : room.clear ? doorColor.open : doorColor.lock;
      ctx.save();
      ctx.translate(door.x + door.dx * 7, door.y + door.dy * 7);
      ctx.rotate(Math.atan2(door.dy, door.dx) + Math.PI / 2);
      ctx.fillStyle = "#161c1a";
      ctx.fillRect(-19, -9, 38, 16);
      ctx.strokeStyle = "#686554";
      ctx.strokeRect(-19.5, -9.5, 39, 17);
      if (connected && room.clear) {
        ctx.fillStyle = "#52664a";
        ctx.fillRect(-15, 1, 30, 4);
      } else {
        ctx.fillStyle = "#3e3b32";
        ctx.fillRect(-17, -5, 34, 3);
        for (let x = -14; x <= 14; x += 7) {
          ctx.fillStyle = connected ? "#86604e" : "#545447";
          ctx.fillRect(x, -9, 2, 15);
        }
      }
      if (connected) {
        ctx.fillStyle = color;
        ctx.fillRect(-2.5, 3, 5, 5);
      }
      ctx.restore();
    }
  }

  function drawProp(ctx, prop) {
    const x = Math.round(prop.x);
    const y = Math.round(prop.y);
    if (prop.style === "pillar") {
      ellipse(ctx, x + 3, y + 4, 15, 7, "#0b1111a0");
      ctx.fillStyle = "#11191b";
      ctx.fillRect(x - 11, y - 20, 22, 26);
      ctx.fillStyle = "#3c4544";
      ctx.fillRect(x - 8, y - 20, 16, 24);
      ctx.fillStyle = "#61685d";
      ctx.fillRect(x - 10, y - 21, 20, 5);
      ctx.fillRect(x - 10, y - 2, 20, 4);
      ctx.fillStyle = "#202a29";
      ctx.fillRect(x + 4, y - 16, 4, 15);
      ctx.fillStyle = "#827c60";
      ctx.fillRect(x - 9, y - 21, 16, 1);
      ctx.fillStyle = "#547463";
      ctx.fillRect(x - 1, y - 13, 2, 6);
      ctx.fillRect(x - 3, y - 11, 6, 2);
    } else {
      ellipse(ctx, x + 2, y + 3, 9, 4, "#111416aa");
      ctx.fillStyle = "#2b1d19";
      ctx.fillRect(x - 6, y - 10, 12, 12);
      ctx.fillStyle = "#6b4631";
      ctx.fillRect(x - 5, y - 9, 10, 10);
      ctx.fillStyle = "#9c6845";
      ctx.fillRect(x - 4, y - 10, 8, 3);
      ctx.fillRect(x - 5, y - 5, 10, 1);
    }
  }

  function drawStairs(ctx, run, room, time) {
    if (!room.exit || !room.clear) return;
    const { x, y } = Crypt.stairs;
    const ready = Crypt.floorClear(run);
    ellipse(ctx, x, y, 33, 19, ready ? "#91b17d28" : "#20232689");
    ctx.fillStyle = "#1a2120";
    ctx.fillRect(x - 17, y - 12, 34, 25);
    ctx.strokeStyle = ready ? "#b0c286" : "#696755";
    ctx.strokeRect(x - 17.5, y - 12.5, 35, 26);
    for (let row = 0; row < 5; row += 1) {
      const inset = row * 1.6;
      ctx.fillStyle = ready ? (row % 2 ? "#4b5a45" : "#626b50") : "#363c34";
      ctx.fillRect(x - 14 + inset, y - 9 + row * 4, 28 - 2 * inset, 3);
    }
    if (ready) {
      ctx.strokeStyle = `rgba(174,221,157,${.45 + Math.sin(time / 280) * .25})`;
      ctx.strokeRect(x - 21, y - 16, 42, 33);
    }
  }

  function drawDrop(ctx, drop, player, time) {
    const near = Crypt.dist(player, drop) < 34;
    const color = drop.type === "potion" ? "#ec8e79" : Crypt.rarity[drop.item.tier].color;
    const dy = Math.sin(time / 240 + drop.id) * 2;
    ellipse(ctx, drop.x, drop.y + 4, 8, 4, "#121914ae");
    ctx.save();
    ctx.translate(Math.round(drop.x), Math.round(drop.y + dy));
    ctx.fillStyle = color;
    ctx.globalAlpha = .25;
    ctx.fillRect(-7, -9, 14, 14);
    ctx.globalAlpha = 1;
    ctx.fillRect(-4, -6, 8, 8);
    ctx.fillStyle = "#272923";
    ctx.fillRect(-2, -4, 4, 4);
    ctx.strokeStyle = color;
    if (near) ctx.strokeRect(-8.5, -10.5, 17, 17);
    ctx.restore();
  }

  function telegraph(ctx, run, enemy) {
    if (!enemy.hp || enemy.mode !== "wind") return;
    const spec = Crypt.enemyTypes[enemy.type];
    const progress = 1 - Math.max(0, enemy.until - run.time) / spec.wind;
    const radial = spec.boss && enemy.combo % 3 === 0;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(enemy.aim);
    ctx.fillStyle = `rgba(232,99,65,${.15 + progress * .24})`;
    ctx.strokeStyle = `rgba(242,133,94,${.37 + progress * .54})`;
    ctx.lineWidth = 1.1;
    if (spec.ranged) {
      ctx.fillRect(4, -3, spec.reach + 24, 6);
      ctx.strokeRect(4, -3, spec.reach + 24, 6);
    } else {
      ctx.beginPath();
      const circle = spec.boss;
      if (!circle) ctx.moveTo(0, 0);
      ctx.arc(0, 0, radial ? 51 : spec.reach + 8, circle ? 0 : -1.25, circle ? Math.PI * 2 : 1.25);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawActor(ctx, run, actor, type, time, moving) {
    const sprite = spriteImages[type];
    const isPlayer = type === "player";
    const boss = !isPlayer && Crypt.enemyTypes[type].boss;
    const size = isPlayer ? 1.45 : boss ? 2.05 : type === "rat" ? 1.25 : 1.42;
    const lift = type === "wisp" ? 5 + Math.sin(time / 180 + actor.id) * 2 : moving ? Math.abs(Math.sin(time / 80)) * 1.4 : 0;
    const x = Math.round(actor.x);
    const y = Math.round(actor.y);
    ellipse(ctx, x, y + 2, (isPlayer ? 9 : boss ? 13 : 7), 4, "#0b1211b8");
    ctx.save();
    ctx.translate(x, y - Math.round(lift));
    if (Math.cos(actor.aim) < -.22) ctx.scale(-1, 1);
    if (actor.hurt > run.time && !isPlayer) ctx.filter = "brightness(1.6)";
    if (isPlayer && actor.dashUntil > run.time) ctx.globalAlpha = .56;
    ctx.drawImage(sprite, -Math.round(sprite.width * size / 2), -Math.round(sprite.height * size) + 2, Math.round(sprite.width * size), Math.round(sprite.height * size));
    ctx.restore();
    if (isPlayer) {
      const marker = y - 29 - Math.round(lift);
      ctx.fillStyle = run.charge >= 100 ? "#b7f5b5" : "#f2cf92";
      ctx.fillRect(x - 4, marker, 9, 2);
      ctx.fillRect(x - 2, marker + 2, 5, 1);
      ctx.fillRect(x, marker + 3, 1, 1);
    } else {
      const barWidth = boss ? 39 : 17;
      const barY = y - sprite.height * size - lift - 4;
      ctx.fillStyle = "#211917";
      ctx.fillRect(x - barWidth / 2 - 1, barY - 1, barWidth + 2, 4);
      ctx.fillStyle = boss ? "#f5ae6c" : "#e5826e";
      ctx.fillRect(x - barWidth / 2, barY, Math.max(1, barWidth * actor.hp / actor.maxHp), 2);
    }
  }

  function drawEffects(ctx, run, effects) {
    for (let i = effects.length - 1; i >= 0; i -= 1) {
      const e = effects[i];
      const life = (run.time - e.start) / e.duration;
      if (life > 1) {
        effects.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - life);
      if (e.type === "swing" || e.type === "seal") {
        ctx.beginPath();
        const arc = e.type === "swing";
        const radius = arc ? 29 + 17 * life : e.radius * (.22 + .78 * life);
        ctx.arc(e.x, e.y, radius, arc ? e.angle - 1.1 + .40 * life : 0, arc ? e.angle + 1.1 + .22 * life : Math.PI * 2);
        ctx.strokeStyle = arc ? "#ffe7af" : "#c0f7ad";
        ctx.lineWidth = arc ? 3.5 : 4;
        ctx.stroke();
      } else if (e.amount) {
        ctx.font = "bold 10px Segoe UI, sans-serif";
        ctx.textAlign = "center";
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#191c15";
        ctx.fillStyle = e.type === "heal" ? "#a6e1a2" : e.type === "hurt" ? "#ffa392" : e.critical ? "#ffe5a6" : "#fbf3db";
        const text = (e.type === "heal" ? "+" : "−") + e.amount;
        ctx.strokeText(text, e.x, e.y - 24 - life * 14);
        ctx.fillText(text, e.x, e.y - 24 - life * 14);
      } else {
        ctx.fillStyle = e.type === "dash" ? "#d8d2ab" : "#dc9977";
        for (let n = 0; n < 7; n += 1) {
          const a = n * .9;
          ctx.fillRect(e.x + Math.cos(a) * life * 20, e.y - 4 + Math.sin(a) * life * 18, 2, 2);
        }
      }
      ctx.restore();
    }
  }

  function drawWorld(ctx, run, effects, time, moving) {
    const room = Crypt.currentRoom(run);
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.imageSmoothingEnabled = false;
    drawBackground(ctx, run, time);
    drawDoors(ctx, run, room);
    drawStairs(ctx, run, room, time);
    room.enemies.forEach((enemy) => telegraph(ctx, run, enemy));
    room.drops.forEach((drop) => drawDrop(ctx, drop, run.player, time));
    const actors = [...room.enemies.filter((enemy) => enemy.hp > 0), ...room.props, run.player].sort((a, b) => a.y - b.y);
    for (const actor of actors) {
      if (actor.style) drawProp(ctx, actor);
      else drawActor(ctx, run, actor, actor === run.player ? "player" : actor.type, time, actor === run.player && moving);
    }
    for (const shot of room.missiles) {
      ellipse(ctx, shot.x, shot.y, 5, 5, "#f2936144");
      ctx.fillStyle = "#f6a068";
      ctx.fillRect(Math.round(shot.x - 2), Math.round(shot.y - 2), 4, 4);
      ctx.fillStyle = "#fff0c4";
      ctx.fillRect(Math.round(shot.x - 1), Math.round(shot.y - 1), 2, 2);
    }
    drawEffects(ctx, run, effects);
  }

  function drawMap(canvas, run) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#60705c58";
    for (let x = 12; x < w; x += 15) for (let y = 12; y < h; y += 15) ctx.fillRect(x, y, 2, 2);
    const xs = run.rooms.map((room) => room.x);
    const ys = run.rooms.map((room) => room.y);
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
    const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    const distance = Math.min(69, 160 / Math.max(1, Math.max(...ys) - Math.min(...ys)));
    const size = Math.min(27, distance * .56);
    const points = run.rooms.map((room) => ({ x: w / 2 + (room.x - cx) * distance, y: h / 2 + (room.y - cy) * distance }));
    run.rooms.forEach((room, i) => {
      Crypt.directions.slice(0, 2).forEach((direction) => {
        const j = Crypt.neighbor(run.rooms, room, direction);
        if (j < 0) return;
        ctx.strokeStyle = room.clear || run.rooms[j].clear ? "#808d61" : "#475645";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(points[i].x, points[i].y);
        ctx.lineTo(points[j].x, points[j].y);
        ctx.stroke();
      });
    });
    run.rooms.forEach((room, i) => {
      const { x, y } = points[i];
      const selected = i === run.room;
      ctx.fillStyle = selected ? "#335f49" : room.clear ? "#414b32" : "#1a221b";
      ctx.strokeStyle = selected ? "#a4e4b8" : room.clear ? "#869064" : "#53604e";
      ctx.lineWidth = 2.5;
      ctx.fillRect(x - size / 2, y - size / 2, size, size);
      ctx.strokeRect(x - size / 2, y - size / 2, size, size);
      if (room.exit) {
        ctx.fillStyle = "#d9ae72";
        ctx.fillRect(x - 5, y + 2, 10, 3);
        ctx.fillRect(x - 2, y - 2, 7, 3);
        ctx.fillRect(x + 2, y - 6, 3, 4);
      } else if (selected) ellipse(ctx, x, y, 3.5, 3.5, "#cfefd1");
    });
  }

  return { drawWorld, drawMap, glyph, paintIcons, iconKeys };
})();
