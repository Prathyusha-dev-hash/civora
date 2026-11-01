/**
 * End-to-end workflow test against a RUNNING stack (backend + AI service + MongoDB).
 *
 *   E2E_BASE_URL=http://localhost:5000/api/v1 E2E_STAFF_PASSWORD=... node --test tests/e2e.test.js
 *
 * Creates real users/complaints/files in the configured database, so point it at
 * a dev/test database. Assertions hold with real Gemini output as well as the
 * offline fixture (they check structure and deterministic rules, not model wording).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');

const BASE = (process.env.E2E_BASE_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');
const STAFF_PW = process.env.E2E_STAFF_PASSWORD || 'Password@123';
const RUN = Date.now().toString(36);
// Random spot so repeated runs do not match earlier runs' incidents
const LAT = 12.9 + Math.random() * 0.08;
const LNG = 77.55 + Math.random() * 0.08;

async function api(method, path, { token, json, form, raw = false, headers = {} } = {}) {
  const res = await fetch(path.startsWith('http') ? path : `${BASE}${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(json ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: json ? JSON.stringify(json) : form,
  });
  if (raw) return res;
  const body = await res.json().catch(() => null);
  return { status: res.status, body, data: body?.data };
}

async function login(email, password) {
  const r = await api('POST', '/auth/login', { json: { email, password } });
  assert.equal(r.status, 200, `login ${email}: ${JSON.stringify(r.body)}`);
  return r.data.token;
}

async function potholeJpeg(seed = 0) {
  const svg = `<svg width="640" height="480" xmlns="http://www.w3.org/2000/svg">
    <rect width="640" height="480" fill="rgb(${95 + seed},95,100)"/><rect width="640" height="150" fill="rgb(150,190,230)"/>
    <ellipse cx="320" cy="320" rx="110" ry="55" fill="rgb(35,30,28)"/><rect x="315" y="150" width="10" height="330" fill="white"/></svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
}

async function streetlightJpeg() {
  const svg = `<svg width="480" height="640" xmlns="http://www.w3.org/2000/svg"><rect width="480" height="640" fill="rgb(20,20,40)"/>
    <rect x="230" y="120" width="20" height="520" fill="rgb(120,120,120)"/><circle cx="240" cy="110" r="40" fill="rgb(60,60,60)"/></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** 1-second 16 kHz mono PCM WAV tone (pure JS, no ffmpeg needed). */
function wavTone() {
  const rate = 16000;
  const n = rate;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / rate) * 8000), 44 + i * 2);
  return buf;
}

function complaintForm(fields, { images = [], audio = null } = {}) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
  images.forEach((img, i) => form.append('images', new Blob([img.buffer], { type: img.type }), `photo${i}.${img.type === 'image/png' ? 'png' : 'jpg'}`));
  if (audio) form.append('audio', new Blob([audio], { type: 'audio/wav' }), 'voice.wav');
  return form;
}

const ctx = {};

test('authentication and roles', async () => {
  ctx.officer = await login('officer.sharma@civora.gov', STAFF_PW);
  ctx.waterSup = await login('inspector.patel@civora.gov', STAFF_PW);
  ctx.powerSup = await login('power.supervisor@civora.gov', STAFF_PW);
  ctx.admin = await login('admin@civora.gov', STAFF_PW);

  for (const who of ['a', 'b']) {
    const email = `e2e.${who}.${RUN}@example.com`;
    const r = await api('POST', '/auth/register', { json: { full_name: `E2E Citizen ${who.toUpperCase()}`, email, mobile: '9876543210', password: 'Citizen123', terms_accepted: true } });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.data.user.role, 'CITIZEN');
    ctx[`citizen_${who}`] = await login(email, 'Citizen123');
  }
  assert.equal((await api('GET', '/admin/overview', { token: ctx.citizen_a })).status, 403);
  assert.equal((await api('GET', '/authority/work-orders', { token: ctx.citizen_a })).status, 403);
});

test('photo analysis preview: valid, unsupported, empty, oversized, unrelated and unclear images', async () => {
  const analyze = (buf, type, name, fields = {}, token = ctx.citizen_a) => {
    const form = new FormData();
    if (buf) form.append('image', new Blob([buf], { type }), name);
    for (const [k, v] of Object.entries({ category: 'roads', description: 'Deep pothole in the left lane', ...fields })) form.append(k, v);
    return api('POST', '/ai/analyze-image', { token, form });
  };
  const STATUSES = ['CIVIC_ISSUE', 'NOT_CIVIC', 'UNCLEAR'];

  for (const [label, buf, type] of [['jpeg', await potholeJpeg(7), 'image/jpeg'], ['png', await streetlightJpeg(), 'image/png']]) {
    const r = await analyze(buf, type, `photo.${label}`);
    assert.equal(r.status, 200, `${label}: ${JSON.stringify(r.body)}`);
    const d = r.data;
    assert.ok(STATUSES.includes(d.status), `${label} status ${d.status}`);
    for (const k of ['visible_observations', 'evidence', 'uncertainties', 'warnings', 'image_findings']) assert.ok(Array.isArray(d[k]), `${label} ${k}`);
    assert.ok(d.confidence >= 0 && d.confidence <= 1 && d.disclaimer);
    if (d.status === 'CIVIC_ISSUE') {
      assert.ok(d.suggested_department && ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'].includes(d.visual_severity) && d.target_sla_hours > 0);
    } else {
      assert.equal(d.suggested_department, null);
      assert.ok(d.warnings.length > 0, `${label} non-civic result must explain why`);
    }
  }

  const plain = await sharp({ create: { width: 400, height: 300, channels: 3, background: { r: 240, g: 200, b: 170 } } }).jpeg().toBuffer();
  const unrelated = await analyze(plain, 'image/jpeg', 'u.jpg', { description: 'irrelevant-photo-test' });
  assert.equal(unrelated.status, 200, JSON.stringify(unrelated.body));
  assert.notEqual(unrelated.data.status, 'CIVIC_ISSUE');
  assert.ok(unrelated.data.warnings.length > 0);

  const blurred = await sharp(await potholeJpeg(3)).blur(60).jpeg().toBuffer();
  const unclear = await analyze(blurred, 'image/jpeg', 'b.jpg', { description: 'blurry-photo-test' });
  assert.equal(unclear.status, 200, JSON.stringify(unclear.body));
  assert.notEqual(unclear.data.status, 'CIVIC_ISSUE');

  const gif = Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(64)]);
  assert.equal((await analyze(gif, 'image/gif', 'x.gif')).status, 422, 'GIF is not a supported evidence format');
  assert.equal((await analyze(Buffer.from('plain text, not an image'), 'image/jpeg', 'fake.jpg')).status, 422);
  assert.equal((await analyze(Buffer.alloc(0), 'image/jpeg', 'empty.jpg')).status, 422);
  assert.equal((await analyze(null)).status, 422, 'missing file');
  const big = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(11 * 1024 * 1024)]);
  const tooBig = await analyze(big, 'image/jpeg', 'big.jpg');
  assert.ok([413, 422].includes(tooBig.status), `oversized image: ${tooBig.status}`);
  assert.equal((await analyze(await potholeJpeg(), 'image/jpeg', 'p.jpg', {}, null)).status, 401);

  // Severity preview accepts the photo findings
  const sev = await api('POST', '/ai/assess-severity', {
    token: ctx.citizen_a,
    json: { category: 'roads', description: 'Deep pothole in the left lane', image_findings: [{ detected_issue: 'pothole', visual_severity: 'HIGH', is_relevant: true, junk: 'x' }] },
  });
  assert.equal(sev.status, 200, JSON.stringify(sev.body));
  assert.ok(sev.data.severity_level);
});

test('citizen A submits a Hindi text complaint with a photo', async () => {
  ctx.img1 = await potholeJpeg();
  const r = await api('POST', '/incidents', {
    token: ctx.citizen_a,
    form: complaintForm(
      { category: 'roads', input_method: 'text', original_language: 'hi', original_text: 'मुख्य चौराहे के पास गहरा गड्ढा है जिससे गाड़ियां फिसल रही हैं', english_translation: 'TAMPERED CLIENT TRANSLATION', location: { lat: LAT, lng: LNG, address: `E2E Junction ${RUN}` } },
      { images: [{ buffer: ctx.img1, type: 'image/jpeg' }] }
    ),
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const d = r.data;
  ctx.ticketA = d.ticket_number;
  assert.match(d.ticket_number, /^CIV-\d{6}$/);
  assert.equal(d.original_language, 'hi');
  assert.equal(d.original_text, 'मुख्य चौराहे के पास गहरा गड्ढा है जिससे गाड़ियां फिसल रही हैं');
  assert.equal(d.translation_status, 'TRANSLATED');
  assert.notEqual(d.english_translation, 'TAMPERED CLIENT TRANSLATION', 'server must not trust client translation');
  assert.equal(d.status, 'ASSIGNED');
  assert.equal(d.assigned_department, 'Roadways & Infrastructure');
  assert.ok(['LOW', 'MODERATE', 'HIGH', 'CRITICAL'].includes(d.severity_level));
  assert.ok(d.sla_deadline && d.work_order_id && d.master_incident_id);
  assert.equal(d.images.length, 1);
  assert.equal(d.redacted_images.length, 1, 'redacted copy should be generated');
  assert.ok(['COMPLETED', 'PARTIAL', 'FALLBACK'].includes(d.ai_status));
  assert.ok(!d.original_image_url.startsWith('blob:'));
  ctx.imageUrlA = d.original_image_url;
  ctx.redactedUrlA = d.redacted_image_url;
  ctx.masterA = d.master_incident_id;
});

test('stored files are retrievable, byte-identical and signature-protected', async () => {
  const res = await api('GET', ctx.imageUrlA.startsWith('http') ? ctx.imageUrlA : BASE.replace('/api/v1', '') + ctx.imageUrlA, { raw: true });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'image/jpeg');
  assert.ok(Buffer.from(await res.arrayBuffer()).equals(ctx.img1), 'served bytes must equal uploaded bytes');

  const tampered = (BASE.replace('/api/v1', '') + ctx.imageUrlA).replace(/sig=[^&]+/, 'sig=AAAA');
  assert.equal((await api('GET', tampered, { raw: true })).status, 403);

  // Public (anonymous) tracking view: no unredacted photo, no reporter identity
  const pub = await api('GET', `/incidents/${ctx.ticketA}`);
  assert.equal(pub.status, 200);
  assert.equal(pub.data.original_image_url, null);
  assert.ok(pub.data.redacted_image_url);
  assert.equal(pub.data.reporter, undefined);
});

test('pre-submission duplicate check finds the nearby incident', async () => {
  const r = await api('POST', '/incidents/duplicates/check', { token: ctx.citizen_b, json: { lat: LAT + 0.0002, lng: LNG, category: 'roads', englishTranslation: 'Deep pothole near the main crossing, vehicles slipping', originalLanguage: 'en' } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.ok(r.data.duplicates.some((x) => x.ticket_number === ctx.ticketA), JSON.stringify(r.data));
});

test('citizen B voice complaint with the same photo is grouped, not merged', async () => {
  ctx.audio = wavTone();
  const r = await api('POST', '/incidents', {
    token: ctx.citizen_b,
    form: complaintForm(
      { category: 'roads', input_method: 'audio', original_language: 'hi', original_text: 'मुख्य सड़क पर बहुत बड़ा गड्ढा है', transcription_status: 'transcribed', location: { lat: LAT + 0.0003, lng: LNG + 0.0001, address: 'Near E2E Junction' } },
      { images: [{ buffer: ctx.img1, type: 'image/jpeg' }], audio: ctx.audio }
    ),
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const d = r.data;
  ctx.ticketB = d.ticket_number;
  assert.notEqual(d.ticket_number, ctx.ticketA, 'each citizen complaint keeps its own record');
  assert.equal(d.master_incident_id, ctx.masterA);
  assert.equal(d.is_primary_report, false);
  assert.equal(d.duplicate_count, 1);
  assert.equal(d.linked_report_count, 2);
  assert.equal(d.input_method, 'audio');
  assert.ok(d.has_audio && d.original_audio_reference);

  const audioRes = await api('GET', BASE.replace('/api/v1', '') + d.original_audio_reference, { raw: true, headers: { Range: 'bytes=0-99' } });
  assert.equal(audioRes.status, 206, 'audio must support range requests for playback');
  assert.equal(audioRes.headers.get('content-type'), 'audio/wav');
});

test('a different problem at the same spot becomes its own incident', async () => {
  const r = await api('POST', '/incidents', {
    token: ctx.citizen_a,
    form: complaintForm(
      { category: 'lighting', input_method: 'text', original_language: 'en', original_text: 'Streetlight pole near the junction has been dark for a week', location: { lat: LAT, lng: LNG } },
      { images: [{ buffer: await streetlightJpeg(), type: 'image/png' }] }
    ),
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.notEqual(r.data.master_incident_id, ctx.masterA);
  assert.equal(r.data.assigned_department, 'Power & Grid Authority');
  assert.equal(r.data.translation_status, 'NOT_APPLICABLE');
  ctx.ticketLight = r.data.ticket_number;
});

test('validation rejects bad submissions', async () => {
  const bad = await api('POST', '/incidents', { token: ctx.citizen_a, json: { category: 'nope', original_text: 'short', location: { lat: 999, lng: 0 } } });
  assert.equal(bad.status, 422);
  const fakeImage = await api('POST', '/incidents', {
    token: ctx.citizen_a,
    form: complaintForm({ category: 'roads', original_text: 'Valid long description here', location: { lat: LAT, lng: LNG } }, { images: [{ buffer: Buffer.from('<?php echo 1; ?> not an image'), type: 'image/jpeg' }] }),
  });
  assert.equal(fakeImage.status, 422);
  const noAudio = await api('POST', '/incidents', { token: ctx.citizen_a, json: { category: 'roads', input_method: 'audio', original_text: 'transcript only text', location: { lat: LAT, lng: LNG } } });
  assert.equal(noAudio.status, 422);
});

test('authority queue is department-scoped and shows grouped reports', async () => {
  const roads = await api('GET', '/authority/work-orders', { token: ctx.officer });
  assert.equal(roads.status, 200);
  const wo = roads.data.find((w) => w.master_incident_id === ctx.masterA);
  assert.ok(wo, 'roads officer must see the roads work order');
  assert.equal(wo.linked_report_count, 2);
  ctx.wo = wo.id;
  assert.ok(!roads.data.some((w) => w.ticket_number === ctx.ticketLight), 'lighting order must not appear for roads');

  const water = await api('GET', '/authority/work-orders', { token: ctx.waterSup });
  assert.ok(!water.data.some((w) => w.id === ctx.wo));
  assert.equal((await api('PATCH', `/authority/work-orders/${ctx.wo}/status`, { token: ctx.waterSup, json: { status: 'IN_PROGRESS' } })).status, 403);

  const power = await api('GET', '/authority/work-orders', { token: ctx.powerSup });
  assert.ok(power.data.some((w) => w.ticket_number === ctx.ticketLight));

  const detail = await api('GET', `/authority/work-orders/${ctx.wo}`, { token: ctx.officer });
  assert.equal(detail.data.linked_reports.length, 2);
  assert.ok(detail.data.original_image_url);
});

test('work order lifecycle with dispute and citizen sign-off', async () => {
  const t = ctx.officer;
  assert.equal((await api('PATCH', `/authority/work-orders/${ctx.wo}/status`, { token: t, json: { status: 'RESOLVED' } })).status, 422, 'cannot self-resolve');
  let r = await api('PATCH', `/authority/work-orders/${ctx.wo}/status`, { token: t, json: { status: 'EN_ROUTE', officer_name: 'Inspector R. Sharma' } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  r = await api('PATCH', `/authority/work-orders/${ctx.wo}/status`, { token: t, json: { status: 'IN_PROGRESS' } });
  assert.equal(r.data.status, 'IN_PROGRESS');
  r = await api('POST', `/authority/work-orders/${ctx.wo}/progress`, { token: t, json: { note: 'Excavation completed, asphalt compacting underway.' } });
  assert.equal(r.data.progress_notes.length, 1);
  assert.equal((await api('GET', `/incidents/${ctx.ticketB}`, { token: ctx.citizen_b })).data.status, 'IN_PROGRESS');

  const proof = async () => {
    const form = new FormData();
    form.append('resolution_image', new Blob([await potholeJpeg(40)], { type: 'image/jpeg' }), 'done.jpg');
    form.append('notes', 'Pothole filled with grade-A bitumen.');
    return api('POST', `/authority/work-orders/${ctx.wo}/resolution-proof`, { token: t, form });
  };
  r = await proof();
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.data.status, 'PENDING_VERIFICATION');
  assert.ok(r.data.resolution_proof_url && r.data.ai_verification);
  assert.equal((await api('GET', `/incidents/${ctx.ticketA}`, { token: ctx.citizen_a })).data.status, 'PENDING_VERIFICATION');

  const notes = await api('GET', '/notifications', { token: ctx.citizen_b });
  assert.ok(notes.data.some((n) => n.type === 'RESOLUTION_SUBMITTED' && n.action_required && n.resolution_proof_url));
  assert.ok(notes.data.every((n) => !n.recipient_user_id || n.complaint_id !== ctx.ticketLight), 'citizen B must not see A\'s other tickets');

  // Only the reporting citizen may sign off
  assert.equal((await api('POST', `/incidents/${ctx.ticketA}/feedback`, { token: ctx.citizen_b, json: { confirmed: true } })).status, 403);

  r = await api('POST', `/incidents/${ctx.ticketB}/feedback`, { token: ctx.citizen_b, json: { confirmed: false, feedback_notes: 'Loose stones only, not compacted.' } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.data.status, 'DISPUTED_REWORK_REQUIRED');
  const reopened = await api('GET', `/authority/work-orders/${ctx.wo}`, { token: t });
  assert.equal(reopened.data.status, 'IN_PROGRESS');

  r = await proof();
  assert.equal(r.data.status, 'PENDING_VERIFICATION');
  r = await api('POST', `/incidents/${ctx.ticketA}/feedback`, { token: ctx.citizen_a, json: { confirmed: true, feedback_notes: 'Road is smooth now.' } });
  assert.equal(r.data.status, 'CLOSED_VERIFIED');
  for (const [tk, tok] of [[ctx.ticketA, ctx.citizen_a], [ctx.ticketB, ctx.citizen_b]]) {
    assert.equal((await api('GET', `/incidents/${tk}`, { token: tok })).data.status, 'CLOSED_VERIFIED');
  }
  assert.equal((await api('GET', `/authority/work-orders/${ctx.wo}`, { token: t })).data.status, 'RESOLVED');
});

test('escalation reassigns department', async () => {
  const r = await api('POST', `/authority/work-orders/${(await api('GET', `/incidents/${ctx.ticketLight}`, { token: ctx.admin })).data.work_order_id}/escalate`, {
    token: ctx.powerSup,
    json: { reason: 'Underground cable fault needs specialist crew.', target_department: 'Public Works Specialist Unit' },
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.data.status, 'ESCALATED');
  assert.equal(r.data.department, 'Public Works Specialist Unit');
});

test('admin analytics reflect live data', async () => {
  const o = await api('GET', '/admin/overview', { token: ctx.admin });
  assert.equal(o.status, 200);
  assert.ok(o.data.total_incidents >= 3 && o.data.duplicate_reports >= 1 && o.data.resolved_count >= 2);
  const hs = await api('GET', '/admin/hotspots', { token: ctx.admin });
  assert.ok(hs.data.some((h) => h.incident_count >= 3 && Math.abs(h.center.lat - LAT) < 0.01));
  const depts = await api('GET', '/admin/metrics/departments', { token: ctx.admin });
  assert.ok(depts.data.find((d) => d.department === 'Roadways & Infrastructure').resolved_this_month >= 1);
  const logs = await api('GET', `/admin/audit-logs?ticket=${ctx.ticketA}`, { token: ctx.admin });
  const actions = new Set(logs.data.map((l) => l.action));
  for (const a of ['COMPLAINT_SUBMITTED', 'AI_ANALYSIS_COMPLETED', 'RESOLUTION_CONFIRMED']) assert.ok(actions.has(a), `missing audit ${a}`);
  const list = await api('GET', '/incidents', { token: ctx.admin });
  const b = list.data.find((x) => x.ticket_number === ctx.ticketB);
  assert.equal(b.duplicate_count, 1);
  const full = await api('GET', `/incidents/${ctx.ticketA}`, { token: ctx.admin });
  assert.equal(full.data.linked_reports.length, 2);
  assert.ok(full.data.ai_analysis && full.data.ai_analysis.duplicate);
});
