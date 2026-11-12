"use strict";

const Crypt = (() => {
  const width = 480;
  const height = 300;
  const field = { left: 18, right: 462, top: 30, bottom: 282 };
  const saveKey = "ashcrypt.run.v1";
  const slots = ["weapon", "armor", "charm"];
  const slotLabels = { weapon: "Оружие", armor: "Доспех", charm: "Талисман" };
  const slotsIcons = { weapon: "sword", armor: "shield", charm: "seal" };
  const floors = ["Преддверие", "Затопленные залы", "Костяная палата", "Пепельные ходы", "Сердце склепа"];
  const roomNames = ["Галерея обетов", "Разбитый притвор", "Покой без имён", "Тихий придел", "Пустая усыпальница", "Хранилище урн", "Зал дозорных", "Подземный проход"];
  const rarity = [
    { name: "Обычный", color: "#b6b9a7" },
    { name: "Необычный", color: "#83dca6" },
    { name: "Редкий", color: "#8cc9f8" },
    { name: "Реликтовый", color: "#f5b96e" },
  ];
  const names = {
    weapon: ["Ржавый клинок", "Клинок дозорного", "Серп праха", "Солнцерез"],
    armor: ["Стёганый доспех", "Куртка гробокопа", "Панцирь крипты", "Плащ феникса"],
    charm: ["Медный оберег", "Узел тумана", "Око глубин", "Пепельное сердце"],
  };
  const relics = [
    { name: "Тёмное железо", text: "+7 к урону клинка.", icon: "sword", key: "damage", amount: 7 },
    { name: "Костяной покров", text: "+20 к максимальному здоровью.", icon: "shield", key: "hp", amount: 20 },
    { name: "Голод печати", text: "+10% заряда Печати за убийство.", icon: "seal", key: "charge", amount: 10 },
    { name: "След углей", text: "Рывок восстанавливается на 0,24 с быстрее.", icon: "dash", key: "dash", amount: .24 },
    { name: "Быстрая рука", text: "Удар восстанавливается на 0,07 с быстрее.", icon: "sword", key: "speed", amount: .07 },
    { name: "Красная соль", text: "+2 зелья и +12 к лечению зельем.", icon: "potion", key: "heal", amount: 12 },
    { name: "Белое пламя", text: "+25 к урону Печати.", icon: "ash", key: "seal", amount: 25 },
  ];
  const enemyTypes = {
    rat: { name: "Пепельный крыс", health: 16, speed: 52, damage: 9, radius: 8, reach: 16, wind: .48 },
    guard: { name: "Костяной дозорный", health: 34, speed: 33, damage: 15, radius: 10, reach: 21, wind: .64 },
    wisp: { name: "Блуждающий огонь", health: 21, speed: 30, damage: 11, radius: 9, reach: 116, wind: .66, ranged: true },
    keeper: { name: "Костяной привратник", health: 230, speed: 30, damage: 22, radius: 15, reach: 36, wind: .85, boss: true },
    heart: { name: "Сердце склепа", health: 395, speed: 34, damage: 25, radius: 18, reach: 41, wind: .78, boss: true },
  };
  const directions = [
    { name: "north", dx: 0, dy: -1, x: 240, y: field.top },
    { name: "east", dx: 1, dy: 0, x: field.right, y: 154 },
    { name: "south", dx: 0, dy: 1, x: 240, y: field.bottom },
    { name: "west", dx: -1, dy: 0, x: field.left, y: 154 },
  ];

  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const angle = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
  const signedAngle = (value) => Math.atan2(Math.sin(value), Math.cos(value));
  const currentRoom = (run) => run.rooms[run.room];

  function random(run) {
    run.rng = (run.rng + 0x6d2b79f5) >>> 0;
    let t = Math.imul(run.rng ^ (run.rng >>> 15), run.rng | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  const pick = (run, list) => list[Math.floor(random(run) * list.length)];
  const seeded = (seed) => seed >>> 0 || 1;

  function newRun(seed = Math.random() * 0xffffffff) {
    const run = {
      version: 1, seed: seeded(seed), rng: seeded(seed), floor: 0, room: 0, rooms: [],
      time: 0, kills: 0, ash: 0, charge: 0, potions: 2, looted: 0, nextId: 1,
      gear: { weapon: { id: 0, slot: "weapon", tier: 0, level: 0, stat: 21 }, armor: null, charm: null },
      bag: [], relics: { damage: 0, hp: 0, charge: 0, dash: 0, speed: 0, heal: 0, seal: 0 },
      player: { x: 240, y: 227, hp: 100, aim: -Math.PI / 2, attack: 0, dash: 0, dashUntil: 0, hurt: 0, dashAngle: 0 },
      choice: null, result: null,
      log: [{ text: "Ты спускаешься в склеп.", icon: "door" }, { text: "Убийства заряжают Печать.", icon: "seal" }],
    };
    startFloor(run);
    return run;
  }

  function report(run, text, icon = "ash") {
    run.log.unshift({ text, icon });
    run.log.length = Math.min(run.log.length, 10);
  }

  function neighbor(rooms, room, direction) {
    return rooms.findIndex((candidate) => candidate.x === room.x + direction.dx && candidate.y === room.y + direction.dy);
  }

  function makeEnemy(run, type, x, y) {
    const spec = enemyTypes[type];
    const hp = spec.health + (spec.boss ? 0 : run.floor * 8);
    return { id: run.nextId++, type, x, y, hp, maxHp: hp, until: 0, aim: Math.PI / 2, mode: "idle", hurt: 0, cooldown: .35 + random(run) * .45, combo: 0 };
  }

  function startFloor(run) {
    const grid = [{ x: 0, y: 0 }];
    while (grid.length < 5) {
      const frontier = [];
      grid.forEach((room) => directions.forEach((direction) => {
        if (neighbor(grid, room, direction) < 0) frontier.push({ x: room.x + direction.dx, y: room.y + direction.dy });
      }));
      grid.push(pick(run, frontier));
    }
    const depths = [0];
    const queue = [0];
    for (let head = 0; head < queue.length; head += 1) {
      const index = queue[head];
      for (const direction of directions) {
        const linked = neighbor(grid, grid[index], direction);
        if (linked >= 0 && depths[linked] === undefined) {
          depths[linked] = depths[index] + 1;
          queue.push(linked);
        }
      }
    }
    const exit = depths.lastIndexOf(Math.max(...depths));
    const spawnPoints = [[240, 91], [350, 128], [137, 167], [309, 226], [170, 108], [381, 204]];
    run.rooms = grid.map((point, index) => {
      const boss = index === exit && [2, 4].includes(run.floor);
      const title = boss ? (run.floor === 2 ? "Трон привратника" : "Сердце склепа")
        : index === 0 ? (run.floor === 0 ? "Вход в склеп" : "Пролом в стене")
        : index === exit ? "Каменный спуск" : pick(run, roomNames);
      const count = boss ? 3 : Math.min(6, 3 + Math.floor((run.floor + index) / 3));
      const enemies = spawnPoints.slice(0, count).map(([x, y], i) => {
        let type = boss && i === 0 ? (run.floor === 2 ? "keeper" : "heart") : pick(run, ["rat", "guard", "wisp"]);
        if (run.floor === 0 && index === 0) type = ["guard", "rat", "rat"][i];
        return makeEnemy(run, type, x + (index ? random(run) * 14 - 7 : 0), y + (index ? random(run) * 14 - 7 : 0));
      });
      const y = index % 2 ? 178 : 124;
      const props = [{ x: 92, y, style: "pillar" }, { x: 389, y: 300 - y, style: "pillar" }];
      if (index !== 0) props.push({ x: 185, y: 216, style: "urn" }, { x: 291, y: 73, style: "urn" });
      return { ...point, title, exit: index === exit, boss, seen: index === 0, clear: false, props, enemies, drops: [], missiles: [] };
    });
    run.room = 0;
    Object.assign(run.player, { x: 240, y: 227, aim: -Math.PI / 2, hurt: run.time + .4, dashUntil: 0, attack: 0 });
  }

  function stats(run) {
    return {
      damage: run.gear.weapon.stat + run.relics.damage,
      maxHp: 100 + (run.gear.armor?.stat ?? 0) + run.relics.hp,
      charge: 24 + (run.gear.charm?.stat ?? 0) + run.relics.charge,
      attackTime: Math.max(.18, .40 - run.relics.speed),
      dashTime: Math.max(.48, 1.12 - run.relics.dash),
      heal: 42 + run.relics.heal,
      sealDamage: 59 + 9 * run.floor + run.relics.seal,
    };
  }

  function blocked(room, x, y, radius) {
    return room.props.some((prop) => {
      const size = prop.style === "pillar" ? 10 : 7;
      return Math.hypot(x - prop.x, y - prop.y) < radius + size;
    });
  }

  function move(room, object, dx, dy, radius) {
    const x = clamp(object.x + dx, field.left + radius, field.right - radius);
    const y = clamp(object.y + dy, field.top + radius, field.bottom - radius);
    if (!blocked(room, x, object.y, radius)) object.x = x;
    if (!blocked(room, object.x, y, radius)) object.y = y;
  }

  function itemName(item) {
    return names[item.slot][item.tier];
  }

  function makeItem(run, guaranteed = false) {
    const chance = random(run) + run.floor * .037 + (guaranteed ? .13 : 0);
    const tier = chance > 1.03 ? 3 : chance > .84 ? 2 : chance > .55 ? 1 : 0;
    const slot = pick(run, slots);
    const level = run.floor + 1;
    const jitter = Math.floor(random(run) * 4);
    const stat = { weapon: 20 + level * 6 + tier * 7, armor: 10 + level * 7 + tier * 9, charm: 3 + level + tier * 3 }[slot] + jitter;
    return { id: run.nextId++, slot, tier, level, stat };
  }

  function drop(run, room, x, y, type, item = null) {
    room.drops.push({ id: run.nextId++, x: clamp(x, 38, 442), y: clamp(y, 46, 263), type, item });
  }

  function kill(run, room, enemy, fx) {
    run.kills += 1;
    run.ash += 4 + Math.floor(random(run) * 4) + (enemyTypes[enemy.type].boss ? 18 : 0);
    run.charge = Math.min(100, run.charge + stats(run).charge);
    fx("death", { x: enemy.x, y: enemy.y });
    const last = room.enemies.every((foe) => foe.hp <= 0);
    const boss = enemyTypes[enemy.type].boss;
    if (last || boss || random(run) < .17) drop(run, room, enemy.x, enemy.y, "gear", makeItem(run, last || boss));
    if (boss || random(run) < .10) drop(run, room, enemy.x + 17, enemy.y + 8, "potion");
    if (last) {
      room.clear = true;
      room.missiles.length = 0;
      report(run, "Комната зачищена. Двери открыты.", "check");
      if (floorClear(run)) report(run, run.floor === 4 ? "Склеп повержен. Подойди к печати выхода." : "Этаж зачищен. Путь вниз открыт.", "stairs");
      fx("clear", {});
    }
  }

  function hitEnemy(run, room, enemy, amount, fx, critical = false) {
    enemy.hp = Math.max(0, enemy.hp - amount);
    enemy.hurt = run.time + .14;
    fx("hit", { x: enemy.x, y: enemy.y, amount, critical });
    if (!enemy.hp) kill(run, room, enemy, fx);
  }

  function attack(run, fx, autoAim) {
    const player = run.player;
    if (run.time < player.attack || run.time < player.dashUntil) return;
    const room = currentRoom(run);
    const range = 44;
    if (autoAim) {
      const targets = room.enemies.filter((enemy) => enemy.hp > 0 && dist(enemy, player) < range + enemyTypes[enemy.type].radius);
      targets.sort((a, b) => dist(a, player) - dist(b, player));
      if (targets[0]) player.aim = angle(player, targets[0]);
    }
    player.attack = run.time + stats(run).attackTime;
    fx("swing", { x: player.x, y: player.y, angle: player.aim });
    for (const enemy of room.enemies) {
      if (!enemy.hp || dist(player, enemy) > range + enemyTypes[enemy.type].radius) continue;
      if (dist(player, enemy) > 13 && Math.abs(signedAngle(angle(player, enemy) - player.aim)) > 1.13) continue;
      const critical = random(run) < .08;
      hitEnemy(run, room, enemy, Math.round(stats(run).damage * (critical ? 1.65 : 1)), fx, critical);
      const a = angle(player, enemy);
      move(room, enemy, Math.cos(a) * 8, Math.sin(a) * 8, enemyTypes[enemy.type].radius);
    }
  }

  function seal(run, fx) {
    if (run.charge < 100) return;
    run.charge = 0;
    const room = currentRoom(run);
    const player = run.player;
    const radius = 99;
    fx("seal", { x: player.x, y: player.y, radius });
    report(run, "Ты высвобождаешь Пепельную печать.", "seal");
    for (const enemy of room.enemies) {
      if (enemy.hp > 0 && dist(enemy, player) < radius + enemyTypes[enemy.type].radius) {
        hitEnemy(run, room, enemy, stats(run).sealDamage, fx, true);
      }
    }
    room.missiles = room.missiles.filter((missile) => dist(missile, player) > radius);
  }

  function potion(run, fx) {
    if (!run.potions || run.player.hp >= stats(run).maxHp) return;
    run.potions -= 1;
    const amount = Math.min(stats(run).heal, stats(run).maxHp - run.player.hp);
    run.player.hp += amount;
    fx("heal", { x: run.player.x, y: run.player.y, amount });
  }

  const floorClear = (run) => run.rooms.every((room) => room.clear);
  const stairs = { x: 240, y: 96 };

  function interactable(run) {
    const room = currentRoom(run);
    const player = run.player;
    const nearby = room.drops.filter((item) => dist(player, item) < 34).sort((a, b) => dist(player, a) - dist(player, b));
    if (nearby.length) return { type: "drop", value: nearby[0] };
    if (room.exit && floorClear(run) && dist(player, stairs) < 39) return { type: "stairs" };
    if (room.clear) {
      const door = directions.find((direction) => neighbor(run.rooms, room, direction) >= 0 && dist(player, direction) < 36);
      if (door) return { type: "door", value: door };
    }
    return null;
  }

  function go(run, direction, fx) {
    const to = neighbor(run.rooms, currentRoom(run), direction);
    if (to < 0) return;
    run.room = to;
    currentRoom(run).seen = true;
    const destination = directions.find((door) => door.dx === -direction.dx && door.dy === -direction.dy);
    run.player.x = destination.x + direction.dx * 25;
    run.player.y = destination.y + direction.dy * 25;
    run.player.hurt = run.time + .6;
    run.player.dashUntil = 0;
    fx("room", {});
  }

  function interact(run, fx) {
    const action = interactable(run);
    if (!action) return;
    if (action.type === "door") {
      go(run, action.value, fx);
      return;
    }
    if (action.type === "stairs") {
      if (run.floor === floors.length - 1) run.result = "win";
      else {
        const available = relics.map((_, index) => index);
        run.choice = [0, 16, 25].map((cost) => {
          const i = Math.floor(random(run) * available.length);
          return { index: available.splice(i, 1)[0], cost };
        });
      }
      return;
    }
    const room = currentRoom(run);
    const item = action.value;
    if (item.type === "potion") {
      run.potions += 1;
      report(run, "Подобрано зелье.", "potion");
    } else {
      if (run.bag.length >= 8) {
        fx("notice", { text: "Рюкзак полон. Разбери предмет." });
        return;
      }
      run.bag.push(item.item);
      run.looted += 1;
      report(run, `Подобрано: ${itemName(item.item)}.`, slotsIcons[item.item.slot]);
    }
    room.drops.splice(room.drops.indexOf(item), 1);
    fx("loot", {});
  }

  function choose(run, index, fx) {
    const option = run.choice?.[index];
    if (!option || run.ash < option.cost) return false;
    const relic = relics[option.index];
    run.ash -= option.cost;
    run.relics[relic.key] += relic.amount;
    if (relic.key === "heal") run.potions += 2;
    run.player.hp = Math.min(stats(run).maxHp, run.player.hp + Math.round(stats(run).maxHp * .28));
    run.floor += 1;
    run.choice = null;
    startFloor(run);
    report(run, `Грань Печати: ${relic.name}.`, "seal");
    fx("floor", {});
    return true;
  }

  function equip(run, id) {
    const index = run.bag.findIndex((item) => item.id === id);
    if (index < 0) return false;
    const item = run.bag[index];
    const old = run.gear[item.slot];
    run.bag.splice(index, 1);
    if (old) run.bag.splice(index, 0, old);
    run.gear[item.slot] = item;
    run.player.hp = Math.min(run.player.hp, stats(run).maxHp);
    report(run, `Экипировано: ${itemName(item)}.`, slotsIcons[item.slot]);
    return true;
  }

  function salvage(run, id) {
    const index = run.bag.findIndex((item) => item.id === id);
    if (index < 0) return false;
    const [item] = run.bag.splice(index, 1);
    const amount = 3 + item.level + item.tier * 4;
    run.ash += amount;
    report(run, `Предмет разобран. +${amount} праха.`, "ash");
    return true;
  }

  function hurtPlayer(run, damage, fx) {
    const player = run.player;
    if (run.time < player.hurt || run.time < player.dashUntil) return;
    player.hp = Math.max(0, player.hp - damage);
    player.hurt = run.time + .61;
    fx("hurt", { x: player.x, y: player.y, amount: damage });
    if (!player.hp) run.result = "dead";
  }

  function missile(run, room, enemy, aim, speed, damage) {
    room.missiles.push({
      x: enemy.x + Math.cos(aim) * 8, y: enemy.y + Math.sin(aim) * 8,
      dx: Math.cos(aim) * speed, dy: Math.sin(aim) * speed, damage, until: run.time + 3.4,
    });
  }

  function enemyTurn(run, room, enemy, dt, fx) {
    if (!enemy.hp) return;
    const spec = enemyTypes[enemy.type];
    const player = run.player;
    const distance = dist(enemy, player);
    const damage = spec.damage + run.floor * 2;
    if (enemy.mode === "wind") {
      if (run.time < enemy.until) return;
      enemy.mode = "recover";
      enemy.until = run.time + (spec.boss ? .56 : .44);
      enemy.cooldown = enemy.until + .35;
      if (spec.ranged) {
        missile(run, room, enemy, enemy.aim, 107, damage);
      } else if (spec.boss && enemy.combo % 3 === 0) {
        const shots = enemy.type === "heart" ? 11 : 8;
        for (let i = 0; i < shots; i += 1) missile(run, room, enemy, enemy.aim + i * Math.PI * 2 / shots, 109, damage);
      } else if (distance < spec.reach + 8) {
        const aligned = Math.abs(signedAngle(angle(enemy, player) - enemy.aim)) < 1.25;
        if (spec.boss || aligned || distance < 13) hurtPlayer(run, damage, fx);
      }
      return;
    }
    if (enemy.mode === "recover" && run.time < enemy.until) return;
    enemy.mode = "idle";
    enemy.aim = angle(enemy, player);
    if (run.time >= enemy.cooldown && (distance < spec.reach || spec.boss && enemy.combo % 3 === 2 && distance < 150)) {
      enemy.mode = "wind";
      enemy.until = run.time + spec.wind;
      enemy.combo += 1;
      return;
    }
    if (distance > (spec.ranged ? 77 : spec.radius + 4)) {
      const old = { x: enemy.x, y: enemy.y };
      const speed = spec.speed * dt;
      move(room, enemy, Math.cos(enemy.aim) * speed, Math.sin(enemy.aim) * speed, spec.radius);
      if (dist(old, enemy) < speed * .45) {
        const detour = enemy.aim + (enemy.id % 2 ? 1.32 : -1.32);
        move(room, enemy, Math.cos(detour) * speed, Math.sin(detour) * speed, spec.radius);
      }
    }
  }

  function updateMissiles(run, room, dt, fx) {
    for (let i = room.missiles.length - 1; i >= 0; i -= 1) {
      const shot = room.missiles[i];
      shot.x += shot.dx * dt;
      shot.y += shot.dy * dt;
      const hits = dist(run.player, shot) < 9;
      if (hits) hurtPlayer(run, shot.damage, fx);
      if (hits || run.time > shot.until || shot.x < field.left || shot.x > field.right || shot.y < field.top || shot.y > field.bottom || blocked(room, shot.x, shot.y, 3)) room.missiles.splice(i, 1);
    }
  }

  function step(run, input, dt, fx = () => {}) {
    if (run.result || run.choice) return;
    const room = currentRoom(run);
    const player = run.player;
    run.time += dt;
    const length = Math.hypot(input.x, input.y);
    if (input.aim) player.aim = angle(player, input.aim);
    else if (length) player.aim = Math.atan2(input.y, input.x);
    if (input.dash && run.time >= player.dash) {
      player.dashAngle = length ? Math.atan2(input.y, input.x) : player.aim;
      player.dash = run.time + stats(run).dashTime;
      player.dashUntil = run.time + .17;
      fx("dash", { x: player.x, y: player.y });
    }
    if (run.time < player.dashUntil) {
      move(room, player, Math.cos(player.dashAngle) * dt * 246, Math.sin(player.dashAngle) * dt * 246, 6);
    } else if (length) {
      const speed = 91 * dt / length;
      move(room, player, input.x * speed, input.y * speed, 6);
    }
    if (input.interact) interact(run, fx);
    if (run.result || run.choice || currentRoom(run) !== room) return;
    if (input.potion) potion(run, fx);
    if (input.seal) seal(run, fx);
    if (input.attack) attack(run, fx, !input.aim);
    for (const enemy of room.enemies) enemyTurn(run, room, enemy, dt, fx);
    updateMissiles(run, room, dt, fx);
  }

  function restore(raw) {
    if (raw?.version !== 1 || !Array.isArray(raw.rooms) || raw.rooms.length !== 5 ||
        !Number.isInteger(raw.floor) || raw.floor < 0 || raw.floor >= floors.length ||
        !Number.isInteger(raw.room) || !raw.rooms[raw.room] || !Array.isArray(raw.bag) ||
        !raw.player || !raw.gear?.weapon || !raw.relics || !Array.isArray(raw.log)) return null;
    return raw;
  }

  return {
    width, height, field, floors, directions, slots, slotLabels, slotsIcons, rarity, relics, enemyTypes,
    saveKey, stairs, newRun, restore, currentRoom, neighbor, stats, dist, floorClear, itemName, interactable,
    choose, equip, salvage, step,
  };
})();

if (typeof module !== "undefined") module.exports = Crypt;
