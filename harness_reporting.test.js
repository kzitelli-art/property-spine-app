"use strict";
// Falsify the sanctioned runner against nonce-created trees, never product
// files. Each child executes assertions; successful exit is not a count.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const assert=require('./tests/assert_reporter');
const runner=path.join(__dirname,'run_harnesses.sh'),reporter=path.join(__dirname,'tests/assert_reporter.js');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'spine-harness-report-'));
const ownedRoot=fs.realpathSync(directory);
const child=path.join(directory,'case.test.js');
function run(source){
  fs.writeFileSync(child,source);
  // Git's bash and Node must be on PATH just as for the sanctioned top-level run.
  const shell=process.env.BASH_EXE||(process.platform==='win32'?'sh.exe':'bash');
  const out=cp.spawnSync(shell,[runner,directory],{encoding:'utf8',timeout:30000,windowsHide:true});
  if(out.error)throw out.error;
  return {status:out.status,output:out.stdout+out.stderr};
}
const load='const assert=require('+JSON.stringify(reporter)+');';
try {
  let out=run(load+'assert.equal(1,1);for(let i=0;i<3;i++)assert.ok(true);');
  assert.equal(out.status,0,'actual completed assertions are green');
  assert.match(out.output,/1 harnesses · 4 passed · 0 failed · 0 red/,'loop executions are counted');
  out=run(load+'assert.equal(1,2,"REPORTER_FAILURE_MARKER");');
  assert.equal(out.status,1,'assertion failure makes runner red');
  assert.match(out.output,/1 harnesses · 0 passed · 1 failed · 1 red/);
  assert.match(out.output,/REPORTER_FAILURE_MARKER/,'failed child output is preserved');
  out=run(load+'assert.equal(1,1);console.error("CHILD_EXIT_MARKER");process.exitCode=7;');
  assert.equal(out.status,1,'nonzero child cannot be hidden by passing assertions');
  assert.match(out.output,/CHILD_EXIT_MARKER/);
  out=run(load+'try{assert.equal(1,2);}catch(_){}');
  assert.equal(out.status,1,'catching a failed assertion cannot make it green');
  out=run(load+'(async()=>{await assert.rejects(async()=>{throw Error("expected");},/expected/);await assert.doesNotReject(async()=>{});})();');
  assert.equal(out.status,0,'settled async assertions are counted');
  assert.match(out.output,/1 harnesses · 2 passed · 0 failed · 0 red/);
  out=run(load+'assert.ok(true);assert.doesNotReject(()=>new Promise(()=>{}));');
  assert.equal(out.status,1,'unfinished async assertion refuses a partial green report');
  assert.match(out.output,/unfinished/);
  for(const [label,source] of [
    ['no report','console.log("work complete");'],
    ['zero claimed assertions','console.log("assertions passed: 0\\nassertions failed: 0");'],
    ['unused reporter',load],
    ['incidental URL','console.log("https://example.test/12/12");'],
    ['incidental date','console.log("Recorded on 9/12/2026");'],
    ['invalid fraction','console.log("12/11");']
  ]){
    out=run(source);assert.equal(out.status,1,label+' is red');assert.match(out.output,/unreadable/);
  }
  for(const summary of ['3/3','Named controls: 3/3','3 passed, 0 failed','3 passed · 0 failed']){
    out=run('console.log('+JSON.stringify(summary)+');');
    assert.equal(out.status,0,'deliberately registered summary syntax: '+summary);
  }
  out=run('console.log("3 passed, 1 failed");');
  assert.equal(out.status,1,'claimed failures remain red even with child exit zero');
} finally {
  // Remove only the exact nonce-created tree whose custody was retained above.
  const resolved=fs.realpathSync(directory);
  if(resolved!==ownedRoot||!resolved.startsWith(fs.realpathSync(os.tmpdir())+path.sep)||!path.basename(resolved).startsWith('spine-harness-report-'))throw Error('Refusing cleanup outside owned harness tree');
  fs.rmSync(resolved,{recursive:true});
}
