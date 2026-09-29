const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();
const DATA_FILE = path.join(__dirname, '..', 'data', 'courses.json');

// Allowed status enum values
const VALID_STATUSES = ['Draft', 'Published', 'Archived'];

// Helper: Read courses from JSON storage
function readCoursesFromFile() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf8');
      return [];
    }
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading courses file:', err);
    throw new Error('Could not read course data from storage');
  }
}

// Helper: Write courses to JSON storage atomically
function writeCoursesToFile(courses) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(courses, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing courses file:', err);
    throw new Error('Could not save course data to storage');
  }
}

// Quality Gate: Validate course input payload
function validateCourseInput(body, isUpdate = false) {
  const errors = [];

  // Required field checks for creation, or type checks if present during update
  if (!isUpdate || body.title !== undefined) {
    if (!body.title || typeof body.title !== 'string' || body.title.trim().length < 3) {
      errors.push('Course "title" is required and must be at least 3 characters long.');
    }
  }

  if (!isUpdate || body.description !== undefined) {
    if (!body.description || typeof body.description !== 'string' || body.description.trim().length < 10) {
      errors.push('Course "description" is required and must be at least 10 characters long.');
    }
  }

  if (!isUpdate || body.instructor !== undefined) {
    if (!body.instructor || typeof body.instructor !== 'string' || body.instructor.trim().length < 2) {
      errors.push('Course "instructor" is required and must be at least 2 characters long.');
    }
  }

  if (!isUpdate || body.duration !== undefined) {
    if (!body.duration || typeof body.duration !== 'string' || body.duration.trim().length === 0) {
      errors.push('Course "duration" is required (e.g., "6 weeks" or "40 hours").');
    }
  }

  if (!isUpdate || body.category !== undefined) {
    if (!body.category || typeof body.category !== 'string' || body.category.trim().length === 0) {
      errors.push('Course "category" is required (e.g., "Web Development", "AI & Machine Learning").');
    }
  }

  // Status enum validation
  if (!isUpdate || body.status !== undefined) {
    if (!body.status || typeof body.status !== 'string') {
      errors.push(`Course "status" is required. Allowed values: ${VALID_STATUSES.join(', ')}.`);
    } else {
      const normalizedStatus = VALID_STATUSES.find(
        (s) => s.toLowerCase() === body.status.trim().toLowerCase()
      );
      if (!normalizedStatus) {
        errors.push(`Invalid status "${body.status}". Allowed values are: ${VALID_STATUSES.join(', ')}.`);
      }
    }
  }

  // Optional price check if provided
  if (body.price !== undefined && body.price !== null && body.price !== '') {
    const numPrice = Number(body.price);
    if (isNaN(numPrice) || numPrice < 0) {
      errors.push('Course "price" must be a positive number or zero.');
    }
  }

  return errors;
}

// Normalize status casing
function normalizeStatus(statusStr) {
  if (!statusStr) return 'Draft';
  const found = VALID_STATUSES.find((s) => s.toLowerCase() === statusStr.trim().toLowerCase());
  return found || statusStr;
}

// -----------------------------------------------------------------------------
// GET /api/courses - List courses with optional search and filters
// -----------------------------------------------------------------------------
router.get('/', (req, res) => {
  try {
    let courses = readCoursesFromFile();
    const { search, category, status, level } = req.query;

    // Search query over title, description, instructor, category
    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      courses = courses.filter((c) =>
        (c.title && c.title.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.instructor && c.instructor.toLowerCase().includes(q)) ||
        (c.category && c.category.toLowerCase().includes(q))
      );
    }

    // Filter by Category
    if (category && category.trim() !== '' && category.toLowerCase() !== 'all') {
      courses = courses.filter((c) => c.category && c.category.toLowerCase() === category.trim().toLowerCase());
    }

    // Filter by Status Enum
    if (status && status.trim() !== '' && status.toLowerCase() !== 'all') {
      courses = courses.filter((c) => c.status && c.status.toLowerCase() === status.trim().toLowerCase());
    }

    // Filter by Level
    if (level && level.trim() !== '' && level.toLowerCase() !== 'all') {
      courses = courses.filter((c) => c.level && c.level.toLowerCase() === level.trim().toLowerCase());
    }

    return res.status(200).json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: err.message,
    });
  }
});

// -----------------------------------------------------------------------------
// GET /api/courses/:id - Get a single course by ID
// -----------------------------------------------------------------------------
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const courses = readCoursesFromFile();
    const course = courses.find((c) => c.id === id);

    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Course with ID '${id}' was not found.`,
      });
    }

    return res.status(200).json({
      success: true,
      data: course,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: err.message,
    });
  }
});

// -----------------------------------------------------------------------------
// POST /api/courses - Create a new course
// -----------------------------------------------------------------------------
router.post('/', (req, res) => {
  try {
    const errors = validateCourseInput(req.body, false);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid course input data.',
        details: errors,
      });
    }

    const courses = readCoursesFromFile();

    const newCourse = {
      id: crypto.randomUUID(),
      title: req.body.title.trim(),
      description: req.body.description.trim(),
      instructor: req.body.instructor.trim(),
      duration: req.body.duration.trim(),
      category: req.body.category.trim(),
      level: req.body.level ? req.body.level.trim() : 'Beginner',
      status: normalizeStatus(req.body.status),
      price: req.body.price !== undefined && req.body.price !== '' ? Number(req.body.price) : 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    courses.unshift(newCourse);
    writeCoursesToFile(courses);

    return res.status(201).json({
      success: true,
      message: 'Course created successfully.',
      data: newCourse,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: err.message,
    });
  }
});

// -----------------------------------------------------------------------------
// PUT /api/courses/:id - Update an existing course
// -----------------------------------------------------------------------------
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const courses = readCoursesFromFile();
    const index = courses.findIndex((c) => c.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Cannot update course. Course with ID '${id}' was not found.`,
      });
    }

    const errors = validateCourseInput(req.body, true);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid course update payload.',
        details: errors,
      });
    }

    const currentCourse = courses[index];
    const updatedCourse = {
      ...currentCourse,
      title: req.body.title !== undefined ? req.body.title.trim() : currentCourse.title,
      description: req.body.description !== undefined ? req.body.description.trim() : currentCourse.description,
      instructor: req.body.instructor !== undefined ? req.body.instructor.trim() : currentCourse.instructor,
      duration: req.body.duration !== undefined ? req.body.duration.trim() : currentCourse.duration,
      category: req.body.category !== undefined ? req.body.category.trim() : currentCourse.category,
      level: req.body.level !== undefined ? req.body.level.trim() : currentCourse.level,
      status: req.body.status !== undefined ? normalizeStatus(req.body.status) : currentCourse.status,
      price: req.body.price !== undefined && req.body.price !== '' ? Number(req.body.price) : currentCourse.price,
      updatedAt: new Date().toISOString(),
    };

    courses[index] = updatedCourse;
    writeCoursesToFile(courses);

    return res.status(200).json({
      success: true,
      message: 'Course updated successfully.',
      data: updatedCourse,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: err.message,
    });
  }
});

// -----------------------------------------------------------------------------
// DELETE /api/courses/:id - Delete a course
// -----------------------------------------------------------------------------
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const courses = readCoursesFromFile();
    const index = courses.findIndex((c) => c.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Cannot delete course. Course with ID '${id}' was not found.`,
      });
    }

    const deletedCourse = courses.splice(index, 1)[0];
    writeCoursesToFile(courses);

    return res.status(200).json({
      success: true,
      message: 'Course deleted successfully.',
      data: deletedCourse,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: err.message,
    });
  }
});

module.exports = {
  router,
  readCoursesFromFile,
  writeCoursesToFile,
  VALID_STATUSES,
};
