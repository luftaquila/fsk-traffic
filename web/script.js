let notyf = new Notyf({
  ripple: false,
  duration: 3500,
  types: [{
    type: 'warn',
    background: 'orange',
    icon: {
      className: 'fa fa-exclamation-triangle',
      tagName: 'i',
      color: 'white',
    }
  }]
});

let current = "accel";
let entries = undefined;

let controller = {
  port: undefined,
  start: {
    tick: undefined,
    timestamp: undefined,
  },
  clock: undefined,
  green: {
    active: false,
    tick: undefined,
    timestamp: undefined,
  },
  saved: false,
  pending: {
    save: false,
    discard: false,
  },
};

const selector = {
  navigator: document.querySelector('nav'),
  connect: document.querySelectorAll('.connect'),
  light: document.querySelectorAll('.traffic'),
  traffic: {
    green: document.querySelectorAll('.traffic-green'),
    red: document.querySelectorAll('.traffic-red'),
    off: document.querySelectorAll('.traffic-off'),
  },
  clock: {
    all: document.querySelectorAll('.clock'),
    accel: document.querySelector('div#container-accel .clock'),
    gymkhana: document.querySelector('div#container-gymkhana .clock'),
    skidpad: document.querySelector('div#container-skidpad .clock'),
  },
  team: {
    select: document.querySelectorAll('select.select-team'),
    deselect: document.querySelectorAll('button.deselect-team'),
  },
  event: document.querySelector('input.event-name'),
  accel: {
    start: document.getElementById('accel-start'),
    end: document.getElementById('accel-end'),
  },
  gymkhana: {
    1: document.getElementById('gymkhana-1'),
    2: document.getElementById('gymkhana-2'),
  },
  skidpad: document.getElementById('skidpad-lap'),
  save: document.querySelectorAll('.save'),
  discard: document.querySelectorAll('.discard'),
};

// init UI and event handlers
window.addEventListener("DOMContentLoaded", async () => {
  // load entry list
  try {
    let res = await get('/entry/all');
    entries = Object.entries(res).map(([key, value]) => ({
      num: Number(key), ...value
    }));
    selector.team.select.forEach(el => el.innerHTML = template_team_select());
  } catch (e) {
    notyf.error(`엔트리 목록을 불러오지 못했습니다.<br>${e}`);
    document.querySelectorAll(`nav, div.container`).forEach(el => el.classList.add("disabled"));
  }

  /* navigation sidebar handler ***********************************************/
  document.querySelectorAll('.nav-mode').forEach(elem => {
    if (elem.hasAttribute('onclick')) {
      return;
    }

    elem.addEventListener("click", () => {
      document.querySelectorAll('.nav-mode').forEach(el => el.classList.remove('active'));
      elem.classList.add('active');
      current = elem.id;

      document.querySelectorAll('.container').forEach(el => el.style.display = 'none');
      document.getElementById(`container-${current}`).style.display = 'flex';
    });
  });

  /* title handler ************************************************************/
  document.querySelectorAll(`input.event-name`).forEach(el => {
    el.addEventListener("keyup", () => {
      let mode = el.closest('div.container').id.replace("container-", "");
      document.getElementById(`${mode}-title`).innerText = `${new Date().getFullYear()} FSK ${el.value.trim()}`;
    });
  });

  /* controller connection handler ********************************************/
  document.querySelectorAll(".connect").forEach(elem => elem.addEventListener("click", connect));

  /* record save handler ********************************************/
  document.querySelectorAll(".save").forEach(elem => elem.addEventListener("click", e => save(e)));

  /* record discard handler ********************************************/
  document.querySelectorAll(".discard").forEach(elem => {
    elem.addEventListener("click", async () => {
      if (!controller.saved && !controller.pending.discard) {
        controller.pending.save = false;
        controller.pending.discard = true;

        return notyf.open({
          type: "warn",
          message: "이 경기의 기록을 저장하지 않고 삭제하려면 한 번 더 누르세요."
        });
      }

      controller.pending.discard = false;

      selector.traffic.green.forEach(el => el.classList.remove('disabled'));
      selector.event.classList.remove('disabled');
      selector.navigator.classList.remove('disabled');
      selector.team.select.forEach(el => el.classList.remove('disabled'));
      selector.team.deselect.forEach(el => el.classList.remove('disabled'));

      selector.save.forEach(el => el.classList.add('disabled'));
      selector.discard.forEach(el => el.classList.add('disabled'));

      selector.clock.all.forEach(el => el.innerText = "00:00:00.000");
      document.querySelectorAll('tr.record').forEach(el => el.remove());

      transmit("$X");
    });
  });

  /* record selection handler ***********************************************/
  document.addEventListener("click", e => {
    if (e.target.closest("tr.record")) {
      if (e.target.classList.contains('selected')) {
        e.target.classList.remove('selected');
      } else {
        if (current !== "skidpad") {
          [...(e.target.closest('table')).querySelectorAll('tr td.selected')].forEach(el => el.classList.remove('selected'));
        }

        e.target.classList.add('selected');
      }
    }
  });

  /* team deselection handler ***********************************************/
  document.addEventListener("click", e => {
    let button = e.target.closest("button.deselect-team");

    if (button) {
      button.previousElementSibling.options[0].selected = true;
      button.previousElementSibling.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });

  /* team selection handler *************************************************/
  document.addEventListener("change", e => {
    if (e.target.matches("select.select-team")) {
      let deselect = false;

      if (e.target.value === "팀 선택") {
        deselect = true;
      }

      let entry = entries.find(x => x.num === Number(e.target.value));

      if (!entry && !deselect) {
        return notyf.error("선택한 팀을 엔트리에서 찾을 수 없습니다.");
      }

      let mode = e.target.closest('div.container').id.replace("container-", "");

      switch (mode) {
        case 'accel': {
          let target = document.querySelector(`div#container-accel .entry-team`);

          if (deselect) {
            target.innerHTML = '‎';
            target.attributes["data-num"] = '';
            target.attributes["data-univ"] = '';
            target.attributes["data-team"] = '';
          } else {
            target.innerHTML = `${entry.num} ${entry.univ} ${entry.team}`;
            target.attributes["data-num"] = entry.num;
            target.attributes["data-univ"] = entry.univ;
            target.attributes["data-team"] = entry.team;
          }
          break;
        }

        case 'gymkhana': {
          let teams = [...document.querySelectorAll(`div#container-gymkhana select.select-team`)].map(el => el.value);
          let target = document.getElementById(`entry-${e.target.id.replace("team-lane-", "")}`);

          if (deselect) {
            target.innerHTML = '‎';
            target.attributes["data-num"] = '';
            target.attributes["data-univ"] = '';
            target.attributes["data-team"] = '';

            let tables = [...document.getElementsByClassName(target.closest('.gymkhana-table').classList)];
            tables.forEach(el => el.style.display = "none");
          } else {
            if (teams.filter(x => x === entry.num).length > 1) {
              e.target.options[0].selected = true;
              deselect = true;
              return notyf.error("이미 다른 레인에 선택된 팀입니다.");
            }

            target.innerHTML = `${entry.num} ${entry.univ} ${entry.team}`;
            target.attributes["data-num"] = entry.num;
            target.attributes["data-univ"] = entry.univ;
            target.attributes["data-team"] = entry.team;

            let tables = [...document.getElementsByClassName(target.closest('.gymkhana-table').classList)];
            tables.forEach(el => el.style.display = "table");
          }
          break;
        }

        case 'skidpad': {
          let target = document.querySelector(`div#container-skidpad .entry-team`);

          if (deselect) {
            target.innerHTML = '‎';
            target.attributes["data-num"] = '';
            target.attributes["data-univ"] = '';
            target.attributes["data-team"] = '';
          } else {
            target.innerHTML = `${entry.num} ${entry.univ} ${entry.team}`;
            target.attributes["data-num"] = entry.num;
            target.attributes["data-univ"] = entry.univ;
            target.attributes["data-team"] = entry.team;
          }
          break;
        }
      }
    }
  });

  /* traffic green light handler **********************************************/
  selector.traffic.green.forEach(elem => {
    let container = elem.closest('div.container').id;

    elem.addEventListener("click", () => {
      if (!document.querySelector(`#${container} input.event-name`).value.trim()) {
        return notyf.error('이벤트 이름을 입력하세요.');
      }

      if (![...document.querySelectorAll(`#${container} select.select-team`)].filter(x => x.value !== "팀 선택").length) {
        return notyf.error('참가팀을 선택하세요.');
      }

      transmit("$G");
    });
  });

  /* traffic red light handler ************************************************/
  selector.traffic.red.forEach(elem => {
    elem.addEventListener("click", () => transmit("$R"));
  });

  /* traffic light off handler ************************************************/
  selector.traffic.off.forEach(elem => {
    elem.addEventListener("click", () => transmit("$X"));
  });
});

/*******************************************************************************
 * controller serial communication handler
 ******************************************************************************/
async function connect() {
  if (!("serial" in navigator)) {
    return notyf.error("Web Serial API not supported.");
  }

  try {
    controller.port = await navigator.serial.requestPort({
      filters: [{ usbVendorId: 0x1999, usbProductId: 0x0514, }]
    });

    await controller.port.open({ baudRate: 115200 });
    transmit("$HELLO");
  } catch (e) {
    notyf.error(`컨트롤러 연결에 실패했습니다.<br>${e}`);
  }

  let reader;
  let received = "";

  try {
    reader = controller.port.readable.getReader();

    while (controller.port && controller.port.readable) {
      let { value, done } = await reader.read();

      if (done) {
        break;
      }

      if (value) {
        received += new TextDecoder().decode(value);

        let idx = received.indexOf("!");

        if (idx > -1) {
          parse(received.slice(received.indexOf('$'), idx));
          received = received.slice(idx + 1);
        }
      }
    }
  } catch (e) {
    if (reader) {
      reader.releaseLock();
    }

    if (e.name === "NetworkError") {
      controller.green.active = false;

      if (controller.clock) {
        clearInterval(controller.clock);
      }

      selector.connect.forEach(el => el.classList.add('red'));
      selector.connect.forEach(el => el.classList.remove('disabled', 'green'));

      document.querySelectorAll('.disabled').forEach(el => el.classList.remove('disabled'));
      selector.traffic.green.forEach(el => el.classList.add('disabled'));
      selector.traffic.red.forEach(el => el.classList.add('disabled'));
      selector.traffic.off.forEach(el => el.classList.add('disabled'));

      selector.light.forEach(el => el.style["background-color"] = "grey");
      selector.clock.all.forEach(el => el.innerHTML = "00:00:00.000");

      notyf.error(e.message);
    } else {
      notyf.error(`컨트롤러 데이터 수신에 실패했습니다.<br>${e}`);
    }
  }
}

/*******************************************************************************
 * controller serial parser
 ******************************************************************************/
function parse(data) {
  post('/traffic/controller', { timestamp: new Date(), data: data });

  if (data.startsWith("$E")) {
    notyf.error(`컨트롤러 프로토콜 오류<br>컨트롤러 전원을 껐다 켜세요.`);
  }

  /*************************************************************************
   * greetings!
   *   request : $H
   *   response: $HI
   ************************************************************************/
  else if (data.startsWith("$HI")) {
    selector.connect.forEach(el => el.classList.add('green', 'disabled'));
    selector.connect.forEach(el => el.classList.remove('red'));

    selector.light.forEach(el => el.style["background-color"] = "grey");
    selector.clock.all.forEach(el => el.innerText = "00:00:00.000");

    selector.traffic.green.forEach(el => el.classList.remove('disabled'));
    selector.traffic.red.forEach(el => el.classList.remove('disabled'));
    selector.traffic.off.forEach(el => el.classList.remove('disabled'));

    notyf.success(`컨트롤러 연결 완료`);
  }

  /*************************************************************************
   * green light on
   *   request: $G
   *   response: $OK G <tick>
   ************************************************************************/
  else if (data.startsWith("$OK G")) {
    controller.saved = false;
    controller.green.active = true;
    controller.green.tick = Number(data.slice(6));
    controller.green.timestamp = new Date();

    selector.clock.all.forEach(el => el.innerText = "00:00:00.000");
    document.querySelectorAll('tr.record').forEach(el => el.remove());

    switch (current) {
      case 'accel': {
        controller.start.tick = undefined;
        controller.start.timestamp = undefined;
        break;
      }

      case 'gymkhana': {
        controller.start.tick = controller.green.tick;
        controller.start.timestamp = controller.green.timestamp;
        controller.clock = setInterval(() => {
          selector.clock.gymkhana.innerText = ms_to_clock(new Date() - controller.start.timestamp);
        }, 7);
        break;
      }

      case 'skidpad': {
        controller.start.tick = undefined;
        controller.start.timestamp = undefined;
        break;
      }
    }

    selector.light.forEach(el => el.style["background-color"] = "green");

    selector.event.classList.add('disabled');
    selector.navigator.classList.add('disabled');
    selector.team.select.forEach(el => el.classList.add('disabled'));
    selector.team.deselect.forEach(el => el.classList.add('disabled'));
    selector.traffic.green.forEach(el => el.classList.add('disabled'));
    selector.traffic.red.forEach(el => el.classList.remove('disabled'));
    selector.traffic.off.forEach(el => el.classList.remove('disabled'));
    selector.save.forEach(el => el.classList.remove('disabled'));
    selector.discard.forEach(el => el.classList.remove('disabled'));
  }

  /*************************************************************************
   * red light on / lights off
   *   request: $R / $X
   *   response: $OK <R/X> <tick>
   ************************************************************************/
  else if (data.startsWith("$OK R") || data.startsWith("$OK X")) {
    controller.green.active = false;

    if (controller.clock) {
      clearInterval(controller.clock);
    }

    if (data.startsWith("$OK R")) {
      selector.light.forEach(el => el.style["background-color"] = "rgb(230, 20, 20)");
      selector.traffic.red.forEach(el => el.classList.add('disabled'));
      selector.traffic.off.forEach(el => el.classList.remove('disabled'));
    } else {
      selector.light.forEach(el => el.style["background-color"] = "grey");
      selector.traffic.red.forEach(el => el.classList.remove('disabled'));
      selector.traffic.off.forEach(el => el.classList.add('disabled'));
    }
  }

  /*************************************************************************
   * sensor report
   *   response: $S <sensor> <tick>
   ************************************************************************/
  else if (data.startsWith("$S")) {
    let timestamp = new Date();

    let sensor = Number(data.slice(3, 4));
    let tick = Number(data.slice(5));

    if (!controller.green.active) {
      return;
    }

    switch (current) {
      case 'accel': {
        if (sensor === 1) {
          if (!controller.start.timestamp) {
            controller.start.tick = tick;
            controller.start.timestamp = timestamp;
            controller.clock = setInterval(() => {
              selector.clock.accel.innerText = ms_to_clock(new Date() - controller.start.timestamp);
            }, 7);
          }

          let tr = document.createElement('tr');
          tr.classList.add('record');
          tr.innerHTML = `<td class='blink' data-tick="${tick}">+${ms_to_clock(tick - controller.start.tick)}</td>`;
          selector.accel.start.querySelector('tbody').appendChild(tr);
        } else {
          if (!controller.start.timestamp) {
            return;
          }

          let tr = document.createElement('tr');
          tr.classList.add('record');
          tr.innerHTML = `<td class='blink' data-tick="${tick}">+${ms_to_clock(tick - controller.start.tick)}</td>`;
          selector.accel.end.querySelector('tbody').appendChild(tr);
        }
        break;
      }

      case 'gymkhana': {
        if (!controller.start.timestamp) {
          return;
        }

        let table = selector.gymkhana[sensor];

        if (table.style.display !== "none") {
          let tr = document.createElement('tr');
          tr.classList.add('record');
          tr.innerHTML = `<td class='blink' data-tick="${tick}">+${ms_to_clock(tick - controller.start.tick)}</td>`;
          table.appendChild(tr);
        }
        break;
      }

      case 'skidpad': {
        if (sensor !== 1) {
          return;
        }

        if (!controller.start.timestamp) {
          controller.start.tick = tick;
          controller.start.timestamp = timestamp;
          controller.clock = setInterval(() => {
            selector.clock.skidpad.innerText = ms_to_clock(new Date() - controller.start.timestamp);
          }, 7);
        }

        let tr = document.createElement('tr');
        tr.classList.add('record');
        tr.innerHTML = `<td class='blink' data-tick="${tick}">+${ms_to_clock(tick - controller.start.tick)}</td>`;
        selector.skidpad.querySelector('tbody').appendChild(tr);
        break;
      }
    }
  }
}

/*******************************************************************************
 * record save handler
 ******************************************************************************/
async function save(e) {
  let mode = e.target.closest('div.container').id.replace("container-", "");

  if (controller.saved && !controller.pending.save) {
    controller.pending.save = true;
    controller.pending.discard = false;

    return notyf.open({
      type: "warn",
      message: "이미 이 경기의 기록을 저장했습니다.<br>무시하고 저장하려면 한 번 더 누르세요."
    });
  }

  controller.pending.save = false;

  switch (mode) {
    case 'accel': {
      let start = document.querySelector('#accel-start .selected');
      let end = document.querySelector('#accel-end .selected');
      let entry = document.querySelector(`div#container-accel .entry-team`);

      if (!start || !end) {
        return notyf.error("저장할 출발점과 도착점 기록을 선택하세요.");
      }

      start = start.getAttribute('data-tick');
      end = end.getAttribute('data-tick');

      if (start > end) {
        return notyf.error("도착점 기록이 출발점 기록보다 빠릅니다.");
      }

      let data = {
        name: document.querySelector(`div#container-${mode} .event-name`).value.trim(),
        data: {
          time: new Date(),
          type: "accel",
          lane: "-",
          entry: {
            num: entry.attributes["data-num"],
            univ: entry.attributes["data-univ"],
            team: entry.attributes["data-team"],
          },
          result: end - start,
          detail: `${start - controller.green.tick} ms delayed start`,
        }
      };

      try {
        await post('/traffic/record', data);

        controller.saved = true;
        selector.traffic.green.forEach(el => el.classList.remove('disabled'));
        selector.event.classList.remove('disabled');
        selector.navigator.classList.remove('disabled');
        selector.team.select.forEach(el => el.classList.remove('disabled'));
        selector.team.deselect.forEach(el => el.classList.remove('disabled'));

        notyf.success(`기록을 저장했습니다. (${end - start} ms)`);
      } catch (e) {
        return notyf.error(`기록을 저장하지 못했습니다.<br>${e.message}`);
      }

      break;
    }

    case 'gymkhana': {
      let list = [document.getElementById('gymkhana-1'), document.getElementById('gymkhana-2')];
      list = list.filter(x => x.style.display !== "none");

      let flag = false;

      for (let table of list) {
        if (table.querySelector('.selected')) {
          flag = true;
          break;
        };
      }

      if (!flag) {
        return notyf.error("저장할 기록을 선택하세요.");
      }

      try {
        for (let table of list) {
          let lane = table.id.replace("gymkhana-", "");
          let rec = table.querySelector('.selected');
          let entry = document.getElementById(`entry-${lane}`);

          if (!rec) {
            notyf.open({
              type: "warn",
              message: `${lane}번 레인의 기록이 선택되지 않았습니다.`
            });
            continue;
          }

          rec = rec.getAttribute('data-tick');

          let data = {
            name: document.querySelector(`div#container-${mode} .event-name`).value.trim(),
            data: {
              time: new Date(),
              type: "gymkhana",
              lane: lane,
              entry: {
                num: entry.attributes["data-num"],
                univ: entry.attributes["data-univ"],
                team: entry.attributes["data-team"],
              },
              result: rec - controller.green.tick,
              detail: '-',
            }
          };

          await post('/traffic/record', data);
          notyf.success(`기록을 저장했습니다. (${rec - controller.green.tick} ms)`);
        }

        controller.saved = true;
        selector.traffic.green.forEach(el => el.classList.remove('disabled'));
        selector.event.classList.remove('disabled');
        selector.navigator.classList.remove('disabled');
        selector.team.select.forEach(el => el.classList.remove('disabled'));
        selector.team.deselect.forEach(el => el.classList.remove('disabled'));
      } catch (e) {
        return notyf.error(`기록을 저장하지 못했습니다.<br>${e.message}`);
      }

      break;
    }

    case 'skidpad': {
      let entry = document.querySelector(`div#container-skidpad .entry-team`);
      let records = selector.skidpad.querySelectorAll('.selected');

      console.log(records.length)

      if (!records.length) {
        return notyf.error("저장할 기록을 선택하세요.");
      } else if (records.length % 2) {
        return notyf.error("저장할 기록은 항상 짝수개여야 합니다.");
      }

      let detail = '';
      let total = 0;

      for (let i = 0; i < records.length; i += 2) {
        let start = records[i].getAttribute('data-tick');
        let end = records[i + 1].getAttribute('data-tick');
        total += (end - start);
        detail += `${i ? ' / ' : ''}${i / 2 + 1}: ${end - start} ms`;
      }

      let data = {
        name: document.querySelector(`div#container-${mode} .event-name`).value.trim(),
        data: {
          time: new Date(),
          type: "skidpad",
          lane: '-',
          entry: {
            num: entry.attributes["data-num"],
            univ: entry.attributes["data-univ"],
            team: entry.attributes["data-team"],
          },
          result: total,
          detail: detail,
        }
      };

      try {
        await post('/traffic/record', data);

        controller.saved = true;
        selector.traffic.green.forEach(el => el.classList.remove('disabled'));
        selector.event.classList.remove('disabled');
        selector.navigator.classList.remove('disabled');
        selector.team.select.forEach(el => el.classList.remove('disabled'));
        selector.team.deselect.forEach(el => el.classList.remove('disabled'));

        notyf.success(`기록을 저장했습니다. (${total} ms)`);
      } catch (e) {
        return notyf.error(`기록을 저장하지 못했습니다.<br>${e.message}`);
      }

      break;
    }
  }
}

/*******************************************************************************
 * utility functions                                                           *
 ******************************************************************************/
async function get(url) {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`failed to get: ${res.status}`);
  }

  const type = res.headers.get('content-type');

  if (type && type.includes('application/json')) {
    return await res.json();
  } else {
    return await res.text();
  }
}

async function post(url, data) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    throw new Error(`failed to post: ${await res.text()}`);
  }
}

async function transmit(data) {
  let writer;

  try {
    writer = controller.port.writable.getWriter();
    await writer.write(new TextEncoder().encode(data));
    return true;
  } catch (e) {
    notyf.error(`Failed to transmit: ${e}`);
    return false;
  } finally {
    if (writer) {
      writer.releaseLock();
    }
  }
}

function ms_to_clock(ms) {
  let hours = String(Math.floor(ms / (1000 * 60 * 60))).padStart(2, 0);
  let minutes = String(Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, 0);
  let seconds = String(Math.floor((ms % (1000 * 60)) / 1000)).padStart(2, 0);

  return `${hours}:${minutes}:${seconds}.${String(ms % 1000).padStart(3, 0)}`;
}

function template_team_select(value) {
  let html = "<option selected disabled>팀 선택</option>";

  for (let entry of entries) {
    html += `<option value='${entry.num}' ${entry.num == value ? "selected" : ""}>${entry.num} ${entry.univ} ${entry.team}</option>`;
  }

  return html;
}
