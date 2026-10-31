import { SECTION_ORDER, SECTIONS } from './theme.js';
import { formatDenver } from './schedule.js';

export function createUI(data, sim) {
  const legend = document.querySelector('#legend');
  const feed = document.querySelector('#feed-list');
  const detail = document.querySelector('#detail');
  const clock = document.querySelector('#clock');
  const phase = document.querySelector('#phase');
  const demo = document.querySelector('#demo');
  const speed = document.querySelector('#speed');
  const readout = document.querySelector('#speed-readout');

  const chips = [['All', '#e6c56a'], ...SECTION_ORDER.map((name) => [name, SECTIONS[name].color])];
  for (const [name, color] of chips) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip';
    button.dataset.section = name;
    button.setAttribute('aria-pressed', name === 'All' ? 'true' : 'false');
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = color;
    button.append(swatch, document.createTextNode(name === 'Social Media' ? 'Social' : name));
    button.addEventListener('click', () => {
      sim.setFilter(name);
      for (const chip of legend.querySelectorAll('.chip')) {
        chip.setAttribute('aria-pressed', chip.dataset.section === name ? 'true' : 'false');
      }
      if (sim.selected && name !== 'All') {
        const bot = data.bots.find((item) => item.name === sim.selected);
        if (bot && bot.section !== name) {
          sim.setSelected(null);
          detail.hidden = true;
        }
      }
    });
    legend.append(button);
  }

  demo.addEventListener('click', () => {
    const next = !sim.demo;
    sim.setDemo(next);
    demo.setAttribute('aria-pressed', next ? 'true' : 'false');
    demo.textContent = next ? 'Demo day' : 'Live clock';
    speed.value = String(sim.speed);
    readout.textContent = `${Math.round(sim.speed)}×`;
  });

  speed.addEventListener('input', () => {
    const value = Number(speed.value);
    sim.setSpeed(value);
    readout.textContent = `${Math.round(value)}×`;
  });

  detail.addEventListener('click', (event) => {
    if (event.target.closest('.close')) {
      sim.setSelected(null);
      detail.hidden = true;
    }
  });

  let feedStamp = '';

  return {
    showDetail(name) {
      const bot = data.bots.find((item) => item.name === name);
      if (!bot) return;
      const live = sim.bots.find((item) => item.name === name);
      const routines = data.routines.filter((item) => item.bot === name);
      const outgoing = data.handoffs.filter((item) => item.from === name);
      const incoming = data.handoffs.filter((item) => item.to === name);
      detail.hidden = false;
      detail.innerHTML = `
        <header>
          <div>
            <div class="meta">${bot.section}${bot.lead ? ' · Lead' : ''}${live ? ` · ${live.mode}` : ''}</div>
            <h3>${bot.name}</h3>
            <p class="role">${bot.role}</p>
          </div>
          <button class="close" type="button" aria-label="Close">Close</button>
        </header>
        <div class="cols">
          <div>
            <h2>Routines</h2>
            <ul>${routines.length ? routines.map((item) => `<li>${item.name}${item.paused ? ' (paused)' : ''} — ${item.schedule}</li>`).join('') : '<li>None scheduled</li>'}</ul>
          </div>
          <div>
            <h2>Handoffs</h2>
            <ul>
              ${outgoing.map((item) => `<li>To ${item.to}: ${item.label}</li>`).join('')}
              ${incoming.map((item) => `<li>From ${item.from}: ${item.label}</li>`).join('')}
              ${outgoing.length + incoming.length === 0 ? '<li>None listed</li>' : ''}
            </ul>
          </div>
        </div>`;
    },
    update() {
      const parts = sim.parts();
      clock.textContent = formatDenver(parts);
      clock.dateTime = new Date(parts.ms).toISOString();
      phase.textContent = sim.quiet ? 'Quiet hours' : sim.demo ? 'Demo day' : 'Live';
      const stamp = sim.feed.map((item) => item.time + item.text).join('|');
      if (stamp !== feedStamp) {
        feedStamp = stamp;
        feed.innerHTML = sim.feed.length
          ? sim.feed.map((item) => `<li><time>${item.time}</time>${item.text}</li>`).join('')
          : '<li class="empty">The floor is settling in.</li>';
      }
    },
  };
}
