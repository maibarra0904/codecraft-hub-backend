const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// Configuration
const DATA_FILE = path.join(__dirname, 'courses.json');
const REQUESTED_PORT = parseInt(process.env.PORT, 10) || 5000;

// Enable Cross-Origin Resource Sharing (CORS) for web frontend
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Middleware to parse JSON request bodies
app.use(express.json());

// Request logger for audit
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Valid status values per lab instructions
const VALID_STATUSES = ['Not Started', 'In Progress', 'Completed'];

// Status normalizer (supports lab values and maps previous enum if sent)
function normalizeStatus(st) {
  if (!st) return 'Not Started';
  const trimmed = st.trim();
  const directMatch = VALID_STATUSES.find(s => s.toLowerCase() === trimmed.toLowerCase());
  if (directMatch) return directMatch;
  if (trimmed.toLowerCase() === 'draft') return 'Not Started';
  if (trimmed.toLowerCase() === 'published') return 'In Progress';
  if (trimmed.toLowerCase() === 'archived') return 'Completed';
  return trimmed;
}

// Helper function to load courses from JSON file
function loadCourses() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf8');
    return [];
  }
  
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (error) {
    console.error('Error loading courses:', error);
    return [];
  }
}

// Helper function to save courses to JSON file
function saveCourses(courses) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(courses, null, 2), 'utf8');
    // Also keep data/courses.json in sync if data directory exists
    const altDataFile = path.join(__dirname, 'data', 'courses.json');
    if (fs.existsSync(path.dirname(altDataFile))) {
      fs.writeFileSync(altDataFile, JSON.stringify(courses, null, 2), 'utf8');
    }
    return true;
  } catch (error) {
    console.error('Error saving courses:', error);
    return false;
  }
}

// Get next available numeric ID
function getNextId(courses) {
  if (!courses || courses.length === 0) {
    return 1;
  }
  const numericIds = courses
    .map(c => parseInt(c.id, 10))
    .filter(n => !isNaN(n));
  return numericIds.length === 0 ? 1 : Math.max(...numericIds) + 1;
}

// Root welcome route
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'CodeCraftHub Learning Platform REST API',
    version: '1.0.0',
    description: 'Personal learning goal tracker API for developers',
    status: 'Online',
    endpoints: {
      courses: '/api/courses',
      stats: '/api/courses/stats',
      health: '/api/health',
    },
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'CodeCraftHub API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Statistics endpoint (GET /api/courses/stats and GET /api/stats)
function handleStats(req, res) {
  try {
    const courses = loadCourses();
    const byStatus = {
      'Not Started': 0,
      'In Progress': 0,
      'Completed': 0,
    };

    courses.forEach(c => {
      const st = normalizeStatus(c.status);
      if (byStatus[st] !== undefined) {
        byStatus[st] += 1;
      } else {
        byStatus[st] = (byStatus[st] || 0) + 1;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        total: courses.length,
        totalCourses: courses.length,
        by_status: byStatus,
        byStatus: byStatus,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to retrieve stats: ${error.message}`,
    });
  }
}

app.get('/api/courses/stats', handleStats);
app.get('/api/stats', handleStats);

// Search endpoint (GET /api/courses/search?q=term)
app.get('/api/courses/search', (req, res) => {
  try {
    const query = (req.query.q || req.query.search || '').trim().toLowerCase();
    const courses = loadCourses();
    
    if (!query) {
      return res.status(200).json({
        success: true,
        count: courses.length,
        courses: courses,
        data: courses,
      });
    }

    const filtered = courses.filter(c =>
      (c.name && c.name.toLowerCase().includes(query)) ||
      (c.title && c.title.toLowerCase().includes(query)) ||
      (c.description && c.description.toLowerCase().includes(query)) ||
      (c.status && c.status.toLowerCase().includes(query))
    );

    res.status(200).json({
      success: true,
      count: filtered.length,
      courses: filtered,
      data: filtered,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Search failed: ${error.message}`,
    });
  }
});

// GET all courses (with optional search and status filtering)
app.get('/api/courses', (req, res) => {
  try {
    let courses = loadCourses();
    const searchTerm = req.query.search || req.query.q;
    const statusFilter = req.query.status;

    if (searchTerm && searchTerm.trim() !== '') {
      const q = searchTerm.trim().toLowerCase();
      courses = courses.filter(c =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.title && c.title.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.instructor && c.instructor.toLowerCase().includes(q))
      );
    }

    if (statusFilter && statusFilter.trim() !== '' && statusFilter.toLowerCase() !== 'all') {
      const normalizedQueryStatus = normalizeStatus(statusFilter);
      courses = courses.filter(c => normalizeStatus(c.status).toLowerCase() === normalizedQueryStatus.toLowerCase());
    }

    res.status(200).json({
      success: true,
      count: courses.length,
      courses: courses,
      data: courses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to retrieve courses: ${error.message}`,
    });
  }
});

// GET specific course
app.get('/api/courses/:id', (req, res) => {
  try {
    const rawId = req.params.id;
    const numericId = parseInt(rawId, 10);
    const courses = loadCourses();
    const course = courses.find(c => c.id === numericId || String(c.id) === String(rawId));
    
    if (course) {
      res.status(200).json({
        success: true,
        course: course,
        data: course,
      });
    } else {
      res.status(404).json({
        success: false,
        error: `Course with ID ${rawId} not found`,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to retrieve course: ${error.message}`,
    });
  }
});

// POST new course
app.post('/api/courses', (req, res) => {
  try {
    const data = req.body;
    
    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No data provided',
      });
    }
    
    // Support both 'name' and 'title'
    const courseName = (data.name || data.title || '').trim();
    const description = (data.description || '').trim();
    const targetDate = (data.target_date || data.targetDate || '').trim();
    const rawStatus = (data.status || '').trim();
    
    // Validate required fields
    const missingFields = [];
    if (!courseName) missingFields.push('name');
    if (!description) missingFields.push('description');
    if (!targetDate) missingFields.push('target_date');
    if (!rawStatus) missingFields.push('status');
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`,
        details: missingFields.map(f => `Field '${f}' is required.`),
      });
    }
    
    // Validate status
    const normalizedStatus = normalizeStatus(rawStatus);
    if (!VALID_STATUSES.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        error: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }
    
    const courses = loadCourses();
    const now = new Date();
    const createdAt = now.toISOString().replace('T', ' ').substring(0, 19);
    
    const newCourse = {
      id: getNextId(courses),
      name: courseName,
      title: courseName, // Support both
      description: description,
      target_date: targetDate,
      status: normalizedStatus,
      created_at: createdAt,
    };
    
    courses.push(newCourse);
    
    if (saveCourses(courses)) {
      res.status(201).json({
        success: true,
        message: 'Course added successfully',
        course: newCourse,
        data: newCourse,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to save course',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to add course: ${error.message}`,
    });
  }
});

// PUT update course
app.put('/api/courses/:id', (req, res) => {
  try {
    const rawId = req.params.id;
    const numericId = parseInt(rawId, 10);
    const data = req.body;
    
    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No data provided',
      });
    }
    
    const courses = loadCourses();
    const courseIndex = courses.findIndex(c => c.id === numericId || String(c.id) === String(rawId));
    
    if (courseIndex === -1) {
      return res.status(404).json({
        success: false,
        error: `Course with ID ${rawId} not found`,
      });
    }
    
    // Validate status if being updated
    if (data.status) {
      const normalizedStatus = normalizeStatus(data.status);
      if (!VALID_STATUSES.includes(normalizedStatus)) {
        return res.status(400).json({
          success: false,
          error: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
        });
      }
      data.status = normalizedStatus;
    }
    
    // Update course fields
    const course = courses[courseIndex];
    if (data.name !== undefined) {
      course.name = data.name.trim();
      course.title = data.name.trim();
    } else if (data.title !== undefined) {
      course.name = data.title.trim();
      course.title = data.title.trim();
    }
    if (data.description !== undefined) course.description = data.description.trim();
    if (data.target_date !== undefined) course.target_date = data.target_date.trim();
    if (data.status !== undefined) course.status = data.status;
    
    courses[courseIndex] = course;
    
    if (saveCourses(courses)) {
      res.status(200).json({
        success: true,
        message: 'Course updated successfully',
        course: course,
        data: course,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to save changes',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to update course: ${error.message}`,
    });
  }
});

// DELETE course
app.delete('/api/courses/:id', (req, res) => {
  try {
    const rawId = req.params.id;
    const numericId = parseInt(rawId, 10);
    const courses = loadCourses();
    const courseIndex = courses.findIndex(c => c.id === numericId || String(c.id) === String(rawId));
    
    if (courseIndex === -1) {
      return res.status(404).json({
        success: false,
        error: `Course with ID ${rawId} not found`,
      });
    }
    
    const deletedCourse = courses.splice(courseIndex, 1)[0];
    
    if (saveCourses(courses)) {
      res.status(200).json({
        success: true,
        message: 'Course deleted successfully',
        deleted_course: deletedCourse,
        data: deletedCourse,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to save changes',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to delete course: ${error.message}`,
    });
  }
});

// Helper to start the server with automatic fallback if port is in use
function startServer(portToTry) {
  const server = app.listen(portToTry)
    .on('listening', () => {
      console.log('='.repeat(60));
      console.log('CodeCraftHub API is starting...');
      console.log('='.repeat(60));
      console.log(`Data will be stored in: ${path.resolve(DATA_FILE)}`);
      console.log(`API is available at: http://localhost:${portToTry}`);
      console.log(`Endpoints:`);
      console.log(` - GET    /api/courses`);
      console.log(` - POST   /api/courses`);
      console.log(` - GET    /api/courses/:id`);
      console.log(` - PUT    /api/courses/:id`);
      console.log(` - DELETE /api/courses/:id`);
      console.log(` - GET    /api/courses/stats`);
      console.log('='.repeat(60));
      console.log('\nPress CTRL+C to stop the server\n');
    })
    .on('error', (err) => {
      if (err.code === 'EADDRINUSE' && portToTry === 5000) {
        console.warn(`⚠️  Port 5000 is currently in use (e.g. macOS AirPlay). Falling back to port 5001...`);
        startServer(5001);
      } else {
        console.error('Server error:', err);
      }
    });

  return server;
}

let serverInstance;
if (require.main === module) {
  serverInstance = startServer(REQUESTED_PORT);
}

module.exports = { app, loadCourses, saveCourses, getNextId, VALID_STATUSES };
