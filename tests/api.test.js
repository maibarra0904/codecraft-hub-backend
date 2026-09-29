const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { app } = require('../server');

const TEST_PORT = 5099;
const BASE_URL = `http://localhost:${TEST_PORT}`;
const DATA_FILE = path.join(__dirname, '..', 'data', 'courses.json');

let serverInstance;
let initialDataBackup;

// Helper to make HTTP requests
function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
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
  // Backup courses.json before tests
  if (fs.existsSync(DATA_FILE)) {
    initialDataBackup = fs.readFileSync(DATA_FILE, 'utf8');
  }

  // Start server on test port
  await new Promise((resolve) => {
    serverInstance = app.listen(TEST_PORT, () => {
      resolve();
    });
  });
});

after(async () => {
  // Restore initial data
  if (initialDataBackup) {
    fs.writeFileSync(DATA_FILE, initialDataBackup, 'utf8');
  }

  // Close server
  await new Promise((resolve) => {
    serverInstance.close(() => {
      resolve();
    });
  });
});

test('GET / - should return API welcome info and CORS headers', async () => {
  const res = await request('GET', '/');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'Online');
  assert.equal(res.headers['access-control-allow-origin'], '*');
});

test('GET /api/courses - should return list of courses with success and count', async () => {
  const res = await request('GET', '/api/courses');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(Array.isArray(res.body.data));
  assert.equal(res.body.count, res.body.data.length);
  assert.ok(res.body.data.length > 0);
});

test('GET /api/courses with search query - should filter matching courses', async () => {
  const res = await request('GET', '/api/courses?search=React');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.data.some((c) => c.title.includes('React')));
});

test('GET /api/courses with category filter - should return only that category', async () => {
  const res = await request('GET', '/api/courses?category=Cloud%20Computing');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.data.every((c) => c.category === 'Cloud Computing'));
});

test('GET /api/courses with status filter - should filter by status enum', async () => {
  const res = await request('GET', '/api/courses?status=Draft');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.data.every((c) => c.status === 'Draft'));
});

let createdCourseId = null;

test('POST /api/courses - should create a course when input is valid', async () => {
  const newCourse = {
    title: 'Automated Testing with Node.js and Jest',
    description: 'Learn unit, integration, and end-to-end API testing patterns with modern JavaScript.',
    instructor: 'Jane Doe',
    duration: '4 weeks',
    category: 'Testing & DevOps',
    level: 'Intermediate',
    status: 'published', // Testing case normalization
    price: 39.99,
  };

  const res = await request('POST', '/api/courses', newCourse);
  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.ok(res.body.data.id);
  assert.equal(res.body.data.title, newCourse.title);
  assert.equal(res.body.data.status, 'Published'); // Normalized to title case
  assert.ok(res.body.data.createdAt);
  assert.ok(res.body.data.updatedAt);

  createdCourseId = res.body.data.id;
});

test('POST /api/courses - should reject with 400 when missing required fields (quality gates)', async () => {
  const invalidCourse = {
    title: 'Hi', // Too short
    description: 'Short', // Too short
  };

  const res = await request('POST', '/api/courses', invalidCourse);
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error, 'Validation Error');
  assert.ok(Array.isArray(res.body.details));
  assert.ok(res.body.details.length >= 2);
});

test('POST /api/courses - should reject with 400 when status enum is invalid (quality gates)', async () => {
  const invalidStatusCourse = {
    title: 'Valid Title Here',
    description: 'Valid description that has sufficient length.',
    instructor: 'John Doe',
    duration: '4 weeks',
    category: 'Development',
    status: 'InReview', // Not in ['Draft', 'Published', 'Archived']
  };

  const res = await request('POST', '/api/courses', invalidStatusCourse);
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.ok(res.body.details.some((d) => d.includes('Allowed values are: Draft, Published, Archived')));
});

test('GET /api/courses/:id - should retrieve a specific course by ID', async () => {
  assert.ok(createdCourseId, 'createdCourseId should exist');
  const res = await request('GET', `/api/courses/${createdCourseId}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.id, createdCourseId);
});

test('GET /api/courses/:id - should return 404 for non-existent course ID', async () => {
  const res = await request('GET', '/api/courses/non-existent-uuid-1234');
  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error, 'Not Found');
});

test('PUT /api/courses/:id - should update course fields and timestamp', async () => {
  assert.ok(createdCourseId, 'createdCourseId should exist');
  const updatePayload = {
    title: 'Advanced Testing with Node.js and Playwright',
    status: 'Archived',
    price: 49.99,
  };

  const res = await request('PUT', `/api/courses/${createdCourseId}`, updatePayload);
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.title, updatePayload.title);
  assert.equal(res.body.data.status, 'Archived');
  assert.equal(res.body.data.price, 49.99);
});

test('PUT /api/courses/:id - should return 404 when updating non-existent course', async () => {
  const res = await request('PUT', '/api/courses/non-existent-uuid-1234', { title: 'New Valid Title' });
  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
});

test('DELETE /api/courses/:id - should delete the course', async () => {
  assert.ok(createdCourseId, 'createdCourseId should exist');
  const res = await request('DELETE', `/api/courses/${createdCourseId}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.id, createdCourseId);

  // Verify it is gone
  const getRes = await request('GET', `/api/courses/${createdCourseId}`);
  assert.equal(getRes.status, 404);
});

test('DELETE /api/courses/:id - should return 404 when deleting non-existent course', async () => {
  const res = await request('DELETE', '/api/courses/non-existent-uuid-1234');
  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
});

test('GET /api/stats - should return metrics aggregates', async () => {
  const res = await request('GET', '/api/stats');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(typeof res.body.data.totalCourses === 'number');
  assert.ok(typeof res.body.data.totalInstructors === 'number');
  assert.ok(res.body.data.byStatus);
  assert.ok('Published' in res.body.data.byStatus);
  assert.ok('Draft' in res.body.data.byStatus);
  assert.ok('Archived' in res.body.data.byStatus);
  assert.ok(res.body.data.byCategory);
});

test('GET /api/health - should report health UP status', async () => {
  const res = await request('GET', '/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'UP');
  assert.equal(res.body.service, 'CodeCraftHub API');
});
