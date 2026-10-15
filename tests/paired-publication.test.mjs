import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectPair } from '../scripts/validate-pair.mjs';
import { REQUIRED_RESEARCH_SOURCES as sources } from '../scripts/validate-research.mjs';
const now = Date.now(), stamp = new Date(now).toISOString();
const research = { generated_at: stamp, source_status: Object.fromEntries(sources.map(s=>[s,'ok'])), items: sources.map(source=>({source,title:'title',url:'https://example.com',date:stamp,score:0})) };
const x = {fetched_at:stamp,posts:[{id:'1',text:'post',url:'https://x.com/a/status/1',author:{username:'a'},created_at:stamp,engagement_score:0}]};
test('paired publication requires fresh, valid inputs from the current run',()=>{
 assert.deepEqual(inspectPair(research,x,stamp,now),[]);
 for(const bad of [undefined,{}, {...x,fetched_at:'2026-01-01'}, {...x,posts:[]}, {...x,posts:[{}]}])
   assert.ok(inspectPair(research,bad,stamp,now).length);
 assert.ok(inspectPair({...research,generated_at:'2026-01-01'},x,stamp,now).length);
});

import { spawnSync } from 'node:child_process';
test('publisher refuses missing configured interpreter before any network operation',()=>{
 const env = {...process.env}; delete env.RESEARCH_PYTHON;
 const result = spawnSync('bash',['scripts/refresh-research.sh'],{cwd:new URL('..',import.meta.url),env,encoding:'utf8'});
 assert.notEqual(result.status,0);
 assert.match(result.stderr,/RESEARCH_PYTHON/);
});

import { mkdtempSync, writeFileSync, chmodSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
test('macOS Bash 3.2 preflight blocks invalid inputs before interpreter or network',()=>{
 const dir = mkdtempSync(join(tmpdir(),'pulse-preflight-'));
 const marker = join(dir,'invoked');
 const stub = join(dir,'stub');
 writeFileSync(stub, `#!/bin/sh\n: > '${marker}'\nexit 91\n`); chmodSync(stub,0o755);
 for (const command of ['git','node','python3']) {
   writeFileSync(join(dir,command), `#!/bin/sh\n: > '${marker}'\nexit 92\n`);
   chmodSync(join(dir,command),0o755);
 }
 const input = join(dir,'input.json'); writeFileSync(input,'{}');
 const empty = join(dir,'empty.json'); writeFileSync(empty,'');
 const base = {...process.env,PATH:`${dir}:/usr/bin:/bin`,RESEARCH_PYTHON:stub,RESEARCH_SHA:'a'.repeat(40),X_INPUT:input,RUN_STARTED_AT:new Date().toISOString(),GITHUB_TOKEN:'test-presence-only'};
 for (const overrides of [
   {RESEARCH_PYTHON:''}, {RESEARCH_PYTHON:'./python'},
   {X_INPUT:''}, {X_INPUT:'./input.json'}, {X_INPUT:empty}, {X_INPUT:join(dir,'missing')},
   {RESEARCH_SHA:'bad'}, {GITHUB_TOKEN:''}
 ]) {
   const result = spawnSync('/bin/bash',['scripts/refresh-research.sh'],{cwd:new URL('..',import.meta.url),env:{...base,...overrides},encoding:'utf8'});
   assert.notEqual(result.status,0,JSON.stringify(overrides));
   assert.equal(existsSync(marker),false,'preflight must not invoke interpreter/network tools');
 }
});
