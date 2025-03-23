const { event } = window.__TAURI__;
const { invoke } = window.__TAURI__.tauri;

let notyf = new Notyf({ ripple: false, duration: 3500 });

let current = "record";

let controller = {
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
    record: document.querySelector('div#container-record .clock'),
    lap: document.querySelector('div#container-lap .clock'),
  },
  team: {
    select: document.querySelectorAll('select.select-team'),
    deselect: document.querySelectorAll('button.deselect-team'),
  },
  event: document.querySelector('input.event-name'),
  record: {
    start: document.getElementById('record-start'),
    end: document.getElementById('record-end'),
  }
};

window.addEventListener("DOMContentLoaded", async () => {
  setup();
});

/*******************************************************************************
 * serial data handler                                                         *
 ******************************************************************************/
event.listen('serial-data', async event => {
  let rcv = event.payload;
  rcv = rcv.slice(rcv.indexOf('$')).match(/\$[^$]+!/g).map(x => x.slice(0, -1));

  // no protocol message found
  if (!rcv) {
    return;
  }

  // handle all protocol messages
  for (let str of rcv) {
    console.log(`${Number(new Date())} ${str}`);

    await invoke('append_file', {
      name: "fsk-log.json",
      data: JSON.stringify({
        date: new Date(),
        data: str,
      }, null, 2) + '\n'
    });

    if (str.startsWith("$E")) {
      notyf.error(`컨트롤러 프로토콜 오류<br>컨트롤러 전원을 껐다 켜세요.`);
    }

    /*************************************************************************
     * greetings!
     *   request : $H
     *   response: $HI
     ************************************************************************/
    else if (str.startsWith("$HI")) {
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
    else if (str.startsWith("$OK G")) {
      controller.green.active = true;
      controller.green.tick = Number(str.slice(6));
      controller.green.timestamp = new Date();

      selector.clock.all.forEach(el => el.innerText = "00:00:00.000");
      document.querySelectorAll('tr.record').forEach(el => el.remove());

      switch (current) {
        case 'record': {
          controller.start.tick = undefined;
          controller.start.timestamp = undefined;
          break;
        }

        case 'lap': {
          controller.start.tick = controller.green.tick;
          controller.start.timestamp = controller.green.timestamp;
          controller.clock = setInterval(() => {
            selector.clock.lap.innerText = ms_to_clock(new Date() - controller.start.timestamp);
          }, 7);
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
    }

    /*************************************************************************
     * red light on / lights off
     *   request: $R / $X
     *   response: $OK <R/X> <tick>
     ************************************************************************/
    else if (str.startsWith("$OK R") || str.startsWith("$OK X")) {
      controller.green.active = false;

      if (controller.clock) {
        clearInterval(controller.clock);
      }

      selector.event.classList.remove('disabled');
      selector.navigator.classList.remove('disabled');
      selector.team.select.forEach(el => el.classList.remove('disabled'));
      selector.team.deselect.forEach(el => el.classList.remove('disabled'));
      selector.traffic.green.forEach(el => el.classList.remove('disabled'));

      if (str.startsWith("$OK R")) {
        selector.light.forEach(el => el.style["background-color"] = "rgb(230, 20, 20)");
        selector.traffic.red.forEach(el => el.classList.add('disabled'));
        selector.traffic.off.forEach(el => el.classList.remove('disabled'));
      } else {
        selector.light.forEach(el => el.style["background-color"] = "grey");
        selector.traffic.red.forEach(el => el.classList.remove('disabled'));
        selector.traffic.off.forEach(el => el.classList.add('disabled'));
      }
      // selector.team.select.forEach(el => el.dispatchEvent(new Event("change", { bubbles: true })));
    }

    /*************************************************************************
     * sensor report
     *   response: $S <sensor> <tick>
     ************************************************************************/
    else if (str.startsWith("$S")) {
      let timestamp = new Date();

      let sensor = Number(str.slice(3, 4));
      let tick = Number(str.slice(5));

      if (!controller.green.active) {
        return;
      }

      let container = `div#container-${current}`;

      switch (current) {
        case 'record': {
          if (sensor === 1) {
            if (!controller.start.timestamp) {
              controller.start.tick = tick;
              controller.start.timestamp = timestamp;
              controller.clock = setInterval(() => {
                selector.clock.record.innerText = ms_to_clock(new Date() - controller.start.timestamp);
              }, 7);
            }

            let tr = document.createElement('tr');
            tr.classList.add('record');
            tr.innerHTML = `<td class='blink' data-tick="${tick}">+${ms_to_clock(tick - controller.start.tick)}</td>`;
            selector.record.start.querySelector('tbody').appendChild(tr);
          } else {
            if (!controller.start.timestamp) {
              return;
            }

            let tr = document.createElement('tr');
            tr.classList.add('record');
            tr.innerHTML = `<td class='blink' data-tick="${tick}">+${ms_to_clock(tick - controller.start.tick)}</td>`;
            selector.record.end.querySelector('tbody').appendChild(tr);
          }
          break;
        }

        case 'lap': {
          if (!controller.start.timestamp) {
            return;
          }

          let tr = document.createElement('tr');
          tr.classList.add('record');
          tr.innerHTML = `<td class='blink' data-tick="${tick}">+${ms_to_clock(tick - controller.start.tick)}</td>`;
          document.getElementById(`lap-${sensor}`).appendChild(tr);
          break;
        }

        default:
          return;
      }
    }
  }
});

/*******************************************************************************
 * serial failure handler                                                      *
 ******************************************************************************/
event.listen('serial-error', async event => {
  controller.green.active = false;

  if (controller.clock) {
    clearInterval(timer.clock);
  }

  selector.connect.forEach(el => el.classList.add('red'));
  selector.connect.forEach(el => el.classList.remove('disabled', 'green'));

  document.querySelectorAll('.disabled').forEach(el => el.classList.remove('disabled'));
  selector.traffic.green.forEach(el => el.classList.add('disabled'));
  selector.traffic.red.forEach(el => el.classList.add('disabled'));
  selector.traffic.off.forEach(el => el.classList.add('disabled'));

  selector.light.forEach(el => el.style["background-color"] = "grey");
  selector.clock.all.forEach(el => el.innerHTML = "00:00:00.000");

  notyf.error(event.payload);
  console.error(event.payload);
});

/*******************************************************************************
 * UI drawers and event handlers                                                           *
 ******************************************************************************/
async function setup() {
  // set team select options and entry table
  await refresh_entries();
  selector.team.select.forEach(el => el.innerHTML = template_team_select());
  setup_entry();
  setup_log_viewer();

  /* navigation sidebar handler ***********************************************/
  document.querySelectorAll('.nav-mode').forEach(elem => {
    elem.addEventListener("click", () => {
      document.querySelectorAll('.nav-mode').forEach(el => el.classList.remove('active'));
      elem.classList.add('active');
      current = elem.id;

      document.querySelectorAll('.container').forEach(el => el.style.display = 'none');
      document.getElementById(`container-${current}`).style.display = 'flex';

      if (current === "log") {
        update_log_viewer();
      }
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
  document.querySelectorAll(".connect").forEach(elem => {
    elem.addEventListener("click", async () => {
      try {
        controller.device = await invoke('serial_connect');
        invoke('serial_request', { data: "$HELLO" });
      } catch (e) {
        notyf.error(`컨트롤러 연결에 실패했습니다.<br>${e}`);
      }
    });
  });

/*******************************************************************************
 * dynamic DOM event handler
 ******************************************************************************/
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

      let entry = entries.find(x => x.number === e.target.value);

      if (!entry && !deselect) {
        return notyf.error("선택한 팀을 엔트리에서 찾을 수 없습니다.");
      }

      let mode = e.target.closest('div.container').id.replace("container-", "");

      switch (mode) {
        case 'record': {
          document.querySelector(`div#container-record .entry-team`).innerHTML =
            deselect ? '‎' : `${entry.number} ${entry.univ} ${entry.team}`;
          break;
        }

        case 'lap': {
          let teams = [...document.querySelectorAll(`div#container-lap select.select-team`)].map(el => el.value);
          let target = document.getElementById(`entry-${e.target.id.replace("team-lane-", "")}`);

          if (deselect) {
            target.innerHTML = '‎';
            let tables = [...document.getElementsByClassName(target.closest('.lap-table').classList)];
            tables.forEach(el => el.style.display = "none");
          } else {
            if (teams.filter(x => x === entry.number).length > 1) {
              e.target.options[0].selected = true;
              deselect = true;
              return notyf.error("이미 다른 레인에 선택된 팀입니다.") ;
            }
            
            target.innerHTML = `${entry.number} ${entry.univ} ${entry.team}`;
            let tables = [...document.getElementsByClassName(target.closest('.lap-table').classList)];
            tables.forEach(el => el.style.display = "table");
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

      invoke('serial_request', { data: `$G` });
    });
  });

  /* traffic red light handler ************************************************/
  selector.traffic.red.forEach(elem => {
    elem.addEventListener("click", () => {
      invoke('serial_request', { data: `$R` });
    });
  });

  /* traffic light off handler ************************************************/
  selector.traffic.off.forEach(elem => {
    elem.addEventListener("click", () => {
      invoke('serial_request', { data: `$X` });
    });
  });

  /* entry list handler *******************************************************/
  document.getElementById("entry-add").addEventListener("click", async () => {
    let entry = document.getElementById("entry-add-number").value.trim();
    let univ = document.getElementById("entry-add-univ").value.trim();
    let team = document.getElementById("entry-add-team").value.trim();

    if (!entry || !univ || !team) {
      return notyf.error("추가할 엔트리 정보에 누락된 값이 있습니다.");
    }

    if (entries.find(x => Number(x.number) === Number(entry))) {
      return notyf.error("이미 존재하는 엔트리 번호입니다.");
    }

    entry_table.rows.add([entry, univ, team, '']);
    entry_table.columns.sort(0, "asc");

    update_entry_table("엔트리가 추가되었습니다.", "엔트리를 추가하지 못했습니다.");

    document.getElementById("entry-add-number").value = "";
    document.getElementById("entry-add-univ").value = "";
    document.getElementById("entry-add-team").value = "";
    document.getElementById("entry-add-number").focus();
  });
}

let log_table = undefined;
let entry_table = undefined;
let record_table = undefined;

function setup_entry() {
  entry_table = new simpleDatatables.DataTable("#entry-table", {
    columns: [
      { select: 0, sort: "asc" },
      { select: 1 },
      { select: 2 },
      {
        select: 3, sortable: false, type: "string", render: (value, td, row, cell) => {
          return `<span class="delete-entry btn red small" onclick="delete_entry(${row})">
            <i class="fa fw fa-delete-left" style="margin-right: 0px;"></i></span>`;
        }
      },
    ],
    data: {
      headings: [
        { text: "엔트리", data: "number" },
        { text: "학교", data: "univ" },
        { text: "팀", data: "team" },
        { text: "삭제", data: "del" }
      ],
    },
    perPage: 100,
    perPageSelect: [10, 20, 50, 100],
  });

  simpleDatatables.makeEditable(entry_table, { contextMenu: false });

  entry_table.insert(entries.map(x => { x.del = ""; return x }));
  entry_table.on("editable.save.cell", async (newValue, oldValue, row, column) => {
    if (newValue === oldValue) {
      return;
    }

    if (controller.running) {
      let cols = entry_table.data.data[row].cells.map(c => c.data);
      cols[column] = oldValue;
      entry_table.rows.updateRow(row, cols);
      return notyf.error("계측 중에는 엔트리를 변경할 수 없습니다.");
    }

    update_entry_table("변경사항이 저장되었습니다.", "변경사항을 저장하지 못했습니다.");
  });

  /* prevent editor doubleclick event for the delete entry buttons ************/
  document.getElementById("entry-table").addEventListener("dblclick", e => {
    if (e.target.classList.contains('delete-entry') || e.target.querySelector(".delete-entry")) {
      e.stopImmediatePropagation();
    }
  });
}

function setup_log_viewer() {
  record_table = new simpleDatatables.DataTable("#record-table", {
    columns: [
      { select: 0, sort: "asc" },
      { select: 1 },
      { select: 2 },
    ],
    data: {
      headings: [
        { text: "타임스탬프", data: "date" },
        { text: "엔트리", data: "number" },
        { text: "학교", data: "univ" },
        { text: "팀", data: "team" },
        { text: "레인", data: "lane" },
        { text: "경기", data: "type" },
        { text: "기록", data: "result" },
        { text: "비고", data: "note" },
      ],
    },
    perPage: 100,
    perPageSelect: [10, 20, 50, 100],
  });

  log_table = new simpleDatatables.DataTable("#log-table", {
    columns: [
      { select: 0, sort: "asc", type: "date", format: "YYYY-MM-DD HH:mm:ss" },
      { select: 1 },
    ],
    data: {
      headings: [
        { text: "타임스탬프", data: "date" },
        { text: "데이터", data: "data" }
      ],
    },
    perPage: 100,
    perPageSelect: [10, 20, 50, 100],
  });

  document.getElementById('file').addEventListener("change", async event => {
    record_table.data.data = [];
    record_table.update(true);

    log_table.data.data = [];
    log_table.update(true);

    document.getElementById('file-record-box').style.display = "block";
    document.getElementById('file-log-box').style.display = "none";

    if (event.target.value === "파일 선택") {
      return;
    }

    try {
      let data = await invoke('read_file', { name: event.target.value });

      if (event.target.value === "fsk-log.json") {
        data = JSON.parse(`[${data.toString().replace(/^}/gm, '},').slice(0, -2)}]`);
        document.getElementById('file-record-box').style.display = "none";
        document.getElementById('file-log-box').style.display = "block";
        log_table.data.data = [];
        log_table.insert(data.map(x => { return { date: date_to_string(new Date(x.date)), data: x.data } }));
      } else {
        data = JSON.parse(`[${data.toString().replace(/^}/gm, '},').slice(0, -2)}]`);
        document.getElementById('file-record-box').style.display = "block";
        document.getElementById('file-log-box').style.display = "none";
        record_table.data.data = [];
        record_table.insert(data.map(x => {
          let name, note;

          switch (x.type) {
            case "record":
              name = "기록 측정";
              note = `${x.result.delay} ms delay`;
              break;

            case "competitive":
              name = "동시 경주";
              note = '-';
              break;

            case "lap":
              name = "랩 타임 측정";
              note = `Rank ${x.result.rank} (+${x.result.diff} ms)`;
              break;


            default:
              name = "알 수 없음";
              note = '-';
              break;
          }

          return {
            date: date_to_string(new Date(x.time)),
            number: x.entry.number,
            univ: x.entry.univ,
            team: x.entry.team,
            lane: x.lane,
            type: name,
            result: `${x.result.ms} ms`,
            note: note,
          };
        }));
      }
    } catch (e) {
      notyf.error(`파일을 읽어오지 못했습니다.<br>${e}`);
    }
  });
}

async function update_log_viewer() {
  try {
    let files = await invoke('get_file_list');
    let html = "<option selected disabled>파일 선택</option>";

    for (let file of files) {
      html += `<option value='${file}'>${file}</option>`;
    }

    let select = document.getElementById('file');
    select.innerHTML = html;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  } catch (e) {
    return notyf.error(`파일 목록을 가져오지 못했습니다.<br>${e}`);
  }
}

/*******************************************************************************
 * utility functions                                                           *
 ******************************************************************************/
let entries = undefined;

async function refresh_entries() {
  try {
    entries = JSON.parse(await invoke('read_file', { name: "fsk-entry.json" }));
  } catch (e) {
    if (e.toString().includes("os error 2")) {
      notyf.error(`엔트리 파일을 찾을 수 없습니다.<br>${e.toString()}`);
    } else {
      notyf.error(`엔트리 파일이 손상되었습니다.<br>${e.toString()}`);
    }
    document.querySelectorAll(`nav, div.container`).forEach(el => el.classList.add("disabled"));
  }
}

function ms_to_clock(ms) {
  let hours = String(Math.floor(ms / (1000 * 60 * 60))).padStart(2, 0);
  let minutes = String(Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, 0);
  let seconds = String(Math.floor((ms % (1000 * 60)) / 1000)).padStart(2, 0);

  return `${hours}:${minutes}:${seconds}.${String(ms % 1000).padStart(3, 0)}`;
}

function date_to_string(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, 0)}-${String(date.getDate()).padStart(2, 0)} ${String(date.getHours()).padStart(2, 0)}:${String(date.getMinutes()).padStart(2, 0)}:${String(date.getSeconds()).padStart(2, 0)}`;
}

function template_team_select(value) {
  let html = "<option selected disabled>팀 선택</option>";

  for (let entry of entries) {
    html += `<option value='${entry.number}' ${entry.number == value ? "selected" : ""}>${entry.number} ${entry.univ} ${entry.team}</option>`;
  }

  return html;
}

function delete_entry(row) {
  entry_table.rows.remove(row);
  update_entry_table("엔트리가 삭제되었습니다.", "엔트리를 삭제하지 못했습니다.");
}

async function update_entry_table(success_msg, error_msg) {
  let edited = entry_table.data.data.map(x => x.cells.map(y => y.text));
  edited = edited.map(entry => { return { number: entry[0], univ: entry[1], team: entry[2] } });
  edited = edited.sort((a, b) => Number(a.number) - Number(b.number));

  try {
    await invoke('write_entry', { data: JSON.stringify(edited, null, 2) });
    await refresh_entries();

    document.querySelectorAll('select.select-team').forEach(el => {
      el.innerHTML = template_team_select(el.value);
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });

    notyf.success(success_msg);
  } catch (e) {
    notyf.error(`${error_msg}<br>${e}`);
  }
}
