import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const locksetPath = resolve(root, 'docs/00_Governance/ACTIVE_LOCKSET.json');
const protocolPath = resolve(root, 'docs/00_Governance/AGENT_LOCKSET_PROTOCOL.md');

function fail(message) {
  console.error(`LOCKSET_VERIFY_FAILED: ${message}`);
  process.exit(1);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

if (!existsSync(locksetPath)) fail('ACTIVE_LOCKSET.json is missing');
if (!existsSync(protocolPath)) fail('AGENT_LOCKSET_PROTOCOL.md is missing');

const raw = readFileSync(locksetPath, 'utf8');
let lockset;
try {
  lockset = JSON.parse(raw);
} catch (error) {
  fail(`ACTIVE_LOCKSET.json is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
}

if (lockset?.schemaVersion !== 1) fail('unsupported schemaVersion');
if (lockset?.status !== 'ACTIVE') fail('lockset status must be ACTIVE');
if (typeof lockset?.locksetVersion !== 'string' || !lockset.locksetVersion.trim()) fail('locksetVersion is required');
if (!Array.isArray(lockset?.noChangeBoundaries) || lockset.noChangeBoundaries.length === 0) fail('noChangeBoundaries must not be empty');
if (!Array.isArray(lockset?.requirements) || lockset.requirements.length === 0) fail('requirements must not be empty');

const allowedStates = new Set(['LOCKED', 'SUPERSEDED']);
const allowedEvidence = new Set(['test', 'browser', 'source', 'manual']);
const ids = new Set();
const lockedIds = new Set();
const superseded = [];

for (const requirement of lockset.requirements) {
  if (!requirement || typeof requirement !== 'object') fail('every requirement must be an object');
  if (typeof requirement.id !== 'string' || !/^F45-[A-Z]+-[0-9]{3}$/.test(requirement.id)) fail(`invalid requirement id: ${requirement.id}`);
  if (ids.has(requirement.id)) fail(`duplicate requirement id: ${requirement.id}`);
  ids.add(requirement.id);

  if (!allowedStates.has(requirement.state)) fail(`${requirement.id} has unsupported state ${requirement.state}`);
  if (typeof requirement.title !== 'string' || !requirement.title.trim()) fail(`${requirement.id} title is required`);
  if (typeof requirement.statement !== 'string' || !requirement.statement.trim()) fail(`${requirement.id} statement is required`);

  if (requirement.state === 'LOCKED') {
    lockedIds.add(requirement.id);
    if (!Array.isArray(requirement.enforcement) || requirement.enforcement.length === 0) fail(`${requirement.id} must have enforcement evidence`);
  } else {
    superseded.push(requirement);
    if (typeof requirement.supersededBy !== 'string' || !requirement.supersededBy.trim()) fail(`${requirement.id} is SUPERSEDED but supersededBy is missing`);
  }

  for (const evidence of requirement.enforcement ?? []) {
    if (!evidence || typeof evidence !== 'object') fail(`${requirement.id} contains invalid enforcement evidence`);
    if (!allowedEvidence.has(evidence.type)) fail(`${requirement.id} has unsupported enforcement type ${evidence.type}`);
    if (evidence.type === 'manual') {
      if (typeof evidence.note !== 'string' || !evidence.note.trim()) fail(`${requirement.id} manual evidence requires a note`);
      continue;
    }
    if (typeof evidence.path !== 'string' || !evidence.path.trim()) fail(`${requirement.id} ${evidence.type} evidence requires a path`);
    if (!existsSync(resolve(root, evidence.path))) fail(`${requirement.id} references missing evidence path ${evidence.path}`);
  }
}

for (const requirement of superseded) {
  if (!ids.has(requirement.supersededBy)) fail(`${requirement.id} supersededBy points to unknown id ${requirement.supersededBy}`);
  if (!lockedIds.has(requirement.supersededBy)) fail(`${requirement.id} supersededBy must point to a LOCKED replacement`);
}

const requiredBoundaryFragments = ['NGAMSOI', 'REKOD', 'Print', 'Approval', 'Domain', 'Database', 'Programme/Revision'];
for (const fragment of requiredBoundaryFragments) {
  if (!lockset.noChangeBoundaries.some((value) => typeof value === 'string' && value.includes(fragment))) {
    fail(`required no-change boundary missing: ${fragment}`);
  }
}

const canonical = JSON.stringify(canonicalize(lockset));
const hash = createHash('sha256').update(canonical).digest('hex');
console.log(`LOCKSET_VERSION=${lockset.locksetVersion}`);
console.log(`LOCKSET_HASH=${hash}`);
console.log(`LOCKSET_LOCKED_REQUIREMENTS=${lockedIds.size}`);
console.log('LOCKSET_VERIFY=PASS');
