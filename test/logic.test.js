import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { denverParts, isQuiet, parseWhen, crossed, stampWeekly, DEMO_START_MS, formatDenver } from '../src/schedule.js';
import { buildPlan, contains } from '../src/layout.js';
import { findPath } from '../src/nav.js';

const data = JSON.parse(readFileSync(new URL('../data/bots.json', import.meta.url)));

test('denver clock and quiet hours', () => {
  const morning = denverParts(DEMO_START_MS);
  assert.equal(morning.weekday, 1);
  assert.equal(morning.hour, 6);
  assert.equal(morning.minute, 20);
  assert.equal(formatDenver(morning), 'Mon 6:20 AM MT');
  assert.equal(isQuiet(morning, data.quietHours), false);
  assert.equal(isQuiet({ minutes: 21 * 60 }, data.quietHours), true);
  assert.equal(isQuiet({ minutes: 4 * 60 + 59 }, data.quietHours), true);
  assert.equal(isQuiet({ minutes: 5 * 60 }, data.quietHours), false);
  assert.equal(isQuiet({ minutes: 20 * 60 + 59 }, data.quietHours), false);
});

test('schedule phrases', () => {
  const mon = parseWhen('Mon 8:44 AM');
  assert.equal(mon.minutes, 8 * 60 + 44);
  assert.ok(mon.weekdays.has(1));
  const weekdays = parseWhen('Weekdays 6:30 AM');
  assert.equal(weekdays.minutes, 6 * 60 + 30);
  assert.deepEqual([...weekdays.weekdays], [1, 2, 3, 4, 5]);
  const fri = parseWhen('Mon and Fri', 9 * 60 + 30);
  assert.equal(fri.minutes, 9 * 60 + 30);
  assert.ok(fri.weekdays.has(1) && fri.weekdays.has(5));
  const wed = parseWhen('Wed 3:30 PM');
  assert.equal(wed.minutes, 15 * 60 + 30);
  assert.ok(wed.weekdays.has(3));
  const monthly = parseWhen('Monthly, 1st', 9 * 60);
  assert.equal(monthly.monthly, true);
  assert.equal(monthly.minutes, 9 * 60);
  const daily = parseWhen('14:05');
  assert.equal(daily.minutes, 14 * 60 + 5);
  assert.equal(daily.weekdays, null);
  const iso = parseWhen('2026-06-01T10:15:00-06:00');
  assert.equal(iso.type, 'instant');
  assert.equal(Number.isNaN(iso.at), false);
});

test('crossing a scheduled minute fires once', () => {
  const spec = parseWhen('Mon 8:44 AM');
  const prev = { ...denverParts(Date.parse('2026-06-01T14:43:00Z')), minutes: 8 * 60 + 43 };
  prev.minutes = 8 * 60 + 43;
  const now = { ...prev, ms: prev.ms + 60000, minutes: 8 * 60 + 44 };
  assert.equal(crossed(spec, prev, now), true);
  const later = { ...now, ms: now.ms + 60000, minutes: 8 * 60 + 45 };
  assert.equal(crossed(spec, now, later), false);
  const tuesday = denverParts(Date.parse('2026-06-02T14:44:00Z'));
  const before = { ...tuesday, ms: tuesday.ms - 60000, minutes: tuesday.minutes - 1 };
  assert.equal(crossed(spec, before, tuesday), false);
});

test('weekly routines are staggered on Monday', () => {
  const routines = [
    { bot: 'Ratings Bot', name: 'Letterboxd top 5', when: parseWhen('Weekly') },
    { bot: 'Insights Bot', name: 'Weekly stats', when: parseWhen('Weekly') },
  ];
  stampWeekly(routines);
  const insights = routines.find((r) => r.bot === 'Insights Bot');
  const ratings = routines.find((r) => r.bot === 'Ratings Bot');
  assert.equal(insights.when.minutes, 11 * 60);
  assert.equal(ratings.when.minutes, 11 * 60 + 30);
});

test('every bot has a desk and a route across the office', () => {
  const plan = buildPlan();
  const names = data.bots.map((bot) => bot.name);
  assert.deepEqual(Object.keys(plan.homes).sort(), [...names].sort());
  for (const bot of data.bots) {
    const home = plan.homes[bot.name];
    assert.equal(home.section, bot.section);
    const room = plan.rooms.find((item) => item.section === bot.section);
    assert.ok(contains(room, home.x, home.z, 0.4), `${bot.name} desk is outside ${bot.section}`);
    assert.equal(plan.nav.blockedWorld(home.x, home.z), false, `${bot.name} desk is blocked`);
  }
  for (const poi of plan.pois) {
    assert.equal(plan.nav.blockedWorld(poi.x, poi.z), false, `${poi.id} is blocked`);
  }
  const samples = [
    ['Job Bot', 'Interview Bot'],
    ['Nutrition Bot', 'movie'],
    ['Manager Bot', 'cafe'],
    ['Scout Bot', 'theater'],
    ['Social Bot', 'kitchen'],
    ['Life Bot', 'trading'],
    ['Work Bot', 'jobs-meet'],
  ];
  for (const [fromName, target] of samples) {
    const from = plan.homes[fromName];
    const goal = plan.homes[target] || plan.pois.find((poi) => poi.id === target);
    const path = findPath(plan.nav, from, goal);
    assert.ok(path && path.length > 1, `no path ${fromName} -> ${target}`);
    for (const point of path) {
      assert.equal(plan.nav.blockedWorld(point.x, point.z), false);
    }
  }
});
