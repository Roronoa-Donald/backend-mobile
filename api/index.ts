import * as dotenv from 'dotenv';
dotenv.config();

import { buildApp } from '../src/app';

let appInstance: any;

export default async function handler(req: any, res: any) {
  if (!appInstance) {
    appInstance = await buildApp();
    await appInstance.ready();
  }
  appInstance.server.emit('request', req, res);
}
