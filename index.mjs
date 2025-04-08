import fs from 'fs';
import express from 'express'
import pinoHttp from 'pino-http';
import Database from 'better-sqlite3';

// init db
const db = new Database('./data/traffic.db');

db.exec(`CREATE TABLE IF NOT EXISTS controller (
  timestamp TEXT NOT NULL,
  data TEXT NOT NULL
);`);

process.on('exit', () => db.close());
process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));

const app = express();
app.use(express.json());
app.use(express.static('./web'));
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  if (req.headers.authorization) {
    req.headers.authuser = Buffer.from(req.headers.authorization.split(' ')[1], 'base64').toString('utf-8').split(':')[0];
  }
  next();
});
app.use(pinoHttp({ stream: fs.createWriteStream('./data/traffic.log', { flags: 'a' }) }));

app.listen(7000);

// return record list
app.get('/record/list', async (req, res) => {
  try {
    const statement = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    const tables = statement.all();
    res.json(tables.map(table => table.name));
  } catch (e) {
    return res.status(500).send(`DB 오류: ${e}`);
  }
});

// return specific record
app.get('/record', async (req, res) => {
  const name = req.query.name.trim();

  try {
    let statement = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`);
    const table = statement.get(name);

    if (!table) {
      return res.status(400).send('존재하지 않는 기록입니다.');
    }

    statement = db.prepare(`SELECT * FROM '${name}'`);
    const records = statement.all();
    res.json(records);
  } catch (e) {
    return res.status(500).send(`DB 오류: ${e}`);
  }
});

// add record
app.post('/record', async (req, res) => {
  const name = `FSK ${new Date().getFullYear()} ${req.body.name.trim()}`;

  try {
    let statement = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`);
    const table = statement.get(name);

    if (!table) {
      db.exec(`CREATE TABLE IF NOT EXISTS '${name}' (
        time TEXT NOT NULL,
        num INTEGER NOT NULL,
        univ TEXT NOT NULL,
        team TEXT NOT NULL,
        lane INTEGER,
        type TEXT NOT NULL,
        result INTEGER NOT NULL,
        detail TEXT
      );`);
    }

    const data = req.body.data;

    statement = db.prepare(`INSERT INTO '${name}' (time, num, univ, team, lane, type, result, detail) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    statement.run(data.time, data.entry.num, data.entry.univ, data.entry.team, data.lane, data.type, data.result, data.detail);

    res.status(201).send();
  } catch (e) {
    return res.status(500).send(`DB 오류: ${e}`);
  }
});

// add controller log
app.post('/controller', async (req, res) => {
  try {
    const statement = db.prepare('INSERT INTO controller (timestamp, data) VALUES (?, ?)');
    statement.run(req.body.timestamp, req.body.data);

    res.status(201).send();
  } catch (e) {
    return res.status(500).send(`DB 오류: ${e}`);
  }
});
