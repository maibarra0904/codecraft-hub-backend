const express = require('express');
const cors = require('cors');
const path = require('path');
const { router: coursesRouter, readCoursesFromFile, VALID_STATUSES } = require('./routes/courses');

const app = express();
const PORT = process.env.PORT || 5001;

// Enable Cross-Origin Resource Sharing (CORS) for any client origin
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parse JSON request bodies
app.use(express.json());

// Request logger for debugging and audit
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Root welcome route
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'CodeCraftHub REST API',
    version: '1.0.0',
    description: 'Personalized Learning Platform for Developers',
    status: 'Online',
    documentation: {
      courses: '/api/courses',
      stats: '/api/stats',
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

// Optional exploration: /api/stats endpoint
app.get('/api/stats', (req, res) => {
  try {
    const courses = readCoursesFromFile();
    const totalCourses = courses.length;

    // Status breakdown
    const byStatus = {
      Published: 0,
      Draft: 0,
      Archived: 0,
    };
    VALID_STATUSES.forEach((st) => {
      byStatus[st] = 0;
    });

    // Category breakdown
    const byCategory = {};
    const instructorsSet = new Set();
    let totalPrice = 0;

    courses.forEach((c) => {
      // Status
      if (c.status && byStatus[c.status] !== undefined) {
        byStatus[c.status] += 1;
      }
      // Category
      if (c.category) {
        byCategory[c.category] = (byCategory[c.category] || 0) + 1;
      }
      // Instructor
      if (c.instructor) {
        instructorsSet.add(c.instructor);
      }
      // Price
      if (typeof c.price === 'number') {
        totalPrice += c.price;
      }
    });

    const averagePrice = totalCourses > 0 ? Number((totalPrice / totalCourses).toFixed(2)) : 0;

    res.status(200).json({
      success: true,
      data: {
        totalCourses,
        totalInstructors: instructorsSet.size,
        byStatus,
        byCategory,
        averagePrice,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: err.message,
    });
  }
});

// Mount courses CRUD router
app.use('/api/courses', coursesRouter);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}. Please refer to API documentation at GET /`,
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred on the server.',
  });
});

// Start server if not imported by test suite
let server;
if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 CodeCraftHub REST API running on port ${PORT}`);
    console.log(`   Base URL:       http://localhost:${PORT}`);
    console.log(`   Courses CRUD:   http://localhost:${PORT}/api/courses`);
    console.log(`   Platform Stats: http://localhost:${PORT}/api/stats`);
    console.log(`   Health Check:   http://localhost:${PORT}/api/health`);
    console.log(`====================================================`);
  });
}

module.exports = { app, server };
