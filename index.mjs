import fs from 'fs';
import path from 'path';
import express from 'express'
import pinoHttp from 'pino-http';
import { JSONFilePreset } from 'lowdb/node';

const pwd = path.resolve();
const db = {
  log: await JSONFilePreset(path.join(pwd, 'db-log.json'), []),
};

const app = express();
app.use(express.json());
app.use(express.static(path.join(pwd, 'web')));
app.use(express.urlencoded({ extended: true }));
app.use(pinoHttp({ stream: fs.createWriteStream('./app.log', { flags: 'a' }) }));

app.listen(6000);

// return record list
app.get('/record/list', async (req, res) => {
  let records = await fs.promises.readdir(pwd);
  records = records
    .filter((file) => file.startsWith('db-') && file.endsWith('.json'))
    .map((file) => file.replace('db-', '').replace('.json', ''));
  res.json(records);
});

// return specific record
app.get('/record', async (req, res) => {
  let name = req.query.name.trim();

  if (!db[name]) {
    db[name] = await JSONFilePreset(path.join(pwd, `db-${name}.json`), []);
  }

  await db[name].read();
  res.json(db[name].data);
});

// add record
app.post('/record', async (req, res) => {
  let name = `FSK ${new Date().getFullYear()} ${req.body.name}`;

  if (!db[name]) {
    db[name] = await JSONFilePreset(path.join(pwd, `db-${name}.json`), []);
  }

  await db[name].read();
  db[name].data.push(req.body.data);
  await db[name].write();
  res.status(201).send();
});

// return controller log
app.get('/log', async (req, res) => {
  await db.log.read();
  res.json(db.log.data);
});

// add controller log
app.post('/log', async (req, res) => {
  req.body.timestamp = new Date();
  await db.log.read();
  db.log.data.push(req.body);
  await db.log.write();
  res.status(201).send();
});

// delete controller log
app.delete('/log', async (req, res) => {
  db.log.data = [];
  await db.log.write();
  res.status(200).send();
});
