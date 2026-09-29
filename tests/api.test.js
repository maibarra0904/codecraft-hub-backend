const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { app } = require('../app');

const TEST_PORT = 5098;
const BASE_URL = `http://localhost:${TEST_PORT}`;
const DATA_FILE = path.join(__dirname, '..', 'courses.json');

let serverInstance;
let initialDataBackup;

function request(method, reqPath, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(reqPath, BASE_URL);
    const reqOptions = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Accept': 'application/json',
        ...headers,
      },
    };

    if (body) {
      reqOptions.headers['Content-Type'] = 'application/json';
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: json,
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

before(async () => {
  if (fs.existsSync(DATA_FILE)) {
    initialDataBackup = fs.readFileSync(DATA_FILE, 'utf8');
  }

  await new Promise((resolve) => {
    serverInstance = app.listen(TEST_PORT, () => {
      resolve();
    });
  });
});

after(async () => {
  if (initialDataBackup) {
    fs.writeFileSync(DATA_FILE, initialDataBackup, 'utf8');
  }

  await new Promise((resolve) => {
    serverInstance.close(() => {
      resolve();
    });
  });
});

test('GET / - should return API status and CORS headers', async () => {
  const res = await request('GET', '/');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'Online');
  assert.equal(res.headers['access-control-allow-origin'], '*');
});

test('GET /api/courses - should retrieve all courses with count', async () => {
  const res = await request('GET', '/api/courses');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(Array.isArray(res.body.courses));
  assert.equal(res.body.count, res.body.courses.length);
  assert.ok(res.body.courses.length > 0);
});

let createdId = null;

test('POST /api/courses - should add a course with required fields', async () => {
  const newCourse = {
    name: 'Python Basics',
    description: 'Learn Python fundamentals and syntax',
    target_date: '2026-12-31',
    status: 'Not Started',
  };

  const res = await request('POST', '/api/courses', newCourse);
  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.message, 'Course added successfully');
  assert.ok(res.body.course.id);
  assert.equal(res.body.course.name, newCourse.name);
  assert.equal(res.body.course.status, 'Not Started');
  assert.ok(res.body.course.created_at);

  createdId = res.body.course.id;
});

test('POST /api/courses - should reject if required fields are missing', async () => {
  const res = await request('POST', '/api/courses', { name: 'Only Name' });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.ok(res.body.error.includes('Missing required fields'));
});

test('POST /api/courses - should reject invalid status values', async () => {
  const res = await request('POST', '/api/courses', {
    name: 'Invalid Status Course',
    description: 'Testing validation error for status',
    target_date: '2026-10-10',
    status: 'UnknownStatus',
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.ok(res.body.error.includes('Status must be one of'));
});

test('GET /api/courses/:id - should get specific course by ID', async () => {
  assert.ok(createdId, 'createdId should exist');
  const res = await request('GET', `/api/courses/${createdId}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.course.id, createdId);
});

test('GET /api/courses/:id - should return 404 for nonexistent course', async () => {
  const res = await request('GET', '/api/courses/999999');
  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
});

test('PUT /api/courses/:id - should update a course', async () => {
  assert.ok(createdId, 'createdId should exist');
  const res = await request('PUT', `/api/courses/${createdId}`, {
    status: 'In Progress',
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.course.status, 'In Progress');
});

test('GET /api/courses/stats - should return statistics by status', async () => {
  const res = await request('GET', '/api/courses/stats');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(typeof res.body.data.total === 'number');
  assert.ok(res.body.data.by_status);
  assert.ok('Not Started' in res.body.data.by_status);
  assert.ok('In Progress' in res.body.data.by_status);
  assert.ok('Completed' in res.body.data.by_status);
});

test('GET /api/courses/search?q=Python - should find matching courses', async () => {
  const res = await request('GET', '/api/courses/search?q=Python');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.courses.length > 0);
  assert.ok(res.body.courses.some(c => c.name.includes('Python')));
});

test('DELETE /api/courses/:id - should delete the course', async () => {
  assert.ok(createdId, 'createdId should exist');
  const res = await request('DELETE', `/api/courses/${createdId}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.message, 'Course deleted successfully');

  const checkRes = await request('GET', `/api/courses/${createdId}`);
  assert.equal(checkRes.status, 404);
});
