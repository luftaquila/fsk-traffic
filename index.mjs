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
app.use(pinoHttp({
  stream: fs.createWriteStream('./data/traffic.log', { flags: 'a' }),
  customProps: (req, res) => ({ reqBody: req.body }),
}));

app.listen(7000);

// return record list
app.get('/record/list', (req, res) => {
  try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
    res.json(tables.map(table => table.name));
  } catch (e) {
    return res.status(500).send(`DB 오류: ${e}`);
  }
});

// return specific record
app.get('/record', (req, res) => {
  try {
    res.json(db.prepare(`SELECT * FROM '${req.query.name.trim()}'`).all());
  } catch (e) {
    return res.status(500).send(`DB 오류: ${e}`);
  }
});

// add record
app.post('/record', (req, res) => {
  const name = `FSK ${new Date().getFullYear()} ${req.body.name.trim()}`;

  try {
    db.transaction(() => {
      const table = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`).get(name);

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

      db.prepare(`INSERT INTO '${name}' (time, num, univ, team, lane, type, result, detail) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(data.time, data.entry.num, data.entry.univ, data.entry.team, data.lane, data.type, data.result, data.detail);
    })();

    res.status(201).send();
  } catch (e) {
    return res.status(500).send(`DB 오류: ${e}`);
  }
});

// add controller log
app.post('/controller', (req, res) => {
  try {
    db.prepare('INSERT INTO controller (timestamp, data) VALUES (?, ?)').run(req.body.timestamp, req.body.data);
    res.status(201).send();
  } catch (e) {
    return res.status(500).send(`DB 오류: ${e}`);
  }
});
