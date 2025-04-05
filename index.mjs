import fs from 'fs';
import path from 'path';
import express from 'express'
import pinoHttp from 'pino-http';
import { JSONFilePreset } from 'lowdb/node';

const web = path.join(path.resolve(), 'web');

const app = express();

app.use(express.json());
app.use(express.static(web));
app.use(express.urlencoded({ extended: true }));
app.use(pinoHttp({ stream: fs.createWriteStream('./app.log', { flags: 'a' }) }));

app.listen(6000);

