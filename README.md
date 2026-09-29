# The CodeCraftHub Learning Management System (LMS) - Backend

A simple REST API to track your personal learning goals and courses, built with Node.js and Express.

## Overview

CodeCraftHub helps developers keep track of courses they want to learn. Built with Node.js and Express, the platform provides a straightforward REST API for managing your learner's journey with full CRUD operations, JSON file-based persistence, and input validation quality gates.

## Features

- **Full CRUD operations for course management**:
  - `POST /api/courses` - Add a new course
  - `GET /api/courses` - Get all courses
  - `GET /api/courses/:id` - Get a specific course by ID
  - `PUT /api/courses/:id` - Update a course
  - `DELETE /api/courses/:id` - Delete a course
- **Bonus Endpoints**:
  - `GET /api/courses/stats` - Statistics about courses by status
  - `GET /api/courses/search?q=term` - Search courses by name, description, or status
  - `GET /api/health` - API health status
- **JSON File-Based Storage**: Auto-creates and manages `courses.json` (no external database required).
- **CORS Enabled**: Fully configured for cross-origin browser requests from any frontend dashboard.
- **Data Validation & Quality Gates**: Required fields, status enum check (`Not Started`, `In Progress`, `Completed`), and descriptive error messages.

## Course Data Structure

```json
{
  "id": 1,
  "name": "Python Basics",
  "description": "Learn Python fundamentals",
  "target_date": "2025-12-31",
  "status": "Not Started",
  "created_at": "2025-11-04 10:30:00"
}
```

## Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install Node.js dependencies:
   ```bash
   npm install
   ```

## Running the Application

Start the Express server:
```bash
npm start
```

By default, the server runs on port 5000:
```
http://localhost:5000
```
*(On macOS, if port 5000 is occupied by ControlCenter/AirPlay, the server automatically falls back to port 5001).*

## Running Tests

### Automated Node.js Test Suite (11 Tests)
```bash
npm test
```

### cURL Verification Script
```bash
./test-curl.sh
```

## API Endpoints Reference

### 1. Add a Course
**POST** `/api/courses`

Headers: `Content-Type: application/json`
```json
{
  "name": "Python Basics",
  "description": "Learn Python fundamentals",
  "target_date": "2025-12-31",
  "status": "Not Started"
}
```

### 2. Get All Courses
**GET** `/api/courses`

Optional query parameters: `?search=term` or `?status=In Progress`.

### 3. Get a Specific Course
**GET** `/api/courses/:id`

### 4. Update a Course
**PUT** `/api/courses/:id`

```json
{
  "status": "In Progress"
}
```

### 5. Delete a Course
**DELETE** `/api/courses/:id`

### 6. Get Course Statistics
**GET** `/api/courses/stats`

## Troubleshooting

- **Problem:** "Cannot find module 'express'"  
  **Solution:** Run `npm install`
- **Problem:** "Port already in use"  
  **Solution:** Stop other applications using port 5000/5001 or pass a custom port: `PORT=5050 npm start`

## Project Structure

```
backend/
├── app.js           # Main Express application
├── courses.json     # Data storage (auto-created)
├── server.js        # Compatibility export
├── package.json     # Dependencies & scripts
├── test-curl.sh     # cURL test script
├── tests/           # Automated test suite
└── README.md        # Documentation
```
