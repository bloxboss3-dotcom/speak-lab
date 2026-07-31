import { loadConfig } from './config.js';
import { createClient } from './coach.js';
import { createServer } from './server.js';

const config = loadConfig();
const client = createClient(config);
const app = createServer(config, client);

app.listen(config.port, () => {
  console.log(`SpeakLab proxy listening on :${config.port}`);
  console.log(`  model:            ${config.model}`);
  console.log(`  refusal fallback: ${config.refusalFallback ? 'on' : 'off'}`);
  console.log(`  client secret:    ${config.clientSecret ? 'required' : 'NOT SET (anyone who finds this URL can spend your credits)'}`);
});
