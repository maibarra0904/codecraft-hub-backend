# 🚀 CodeCraftHub REST API (Backend)

CodeCraftHub is a personalized learning platform designed to help developers manage, explore, and organize technical course listings. This backend service provides a robust RESTful API with complete **CRUD** (Create, Read, Update, Delete) capabilities, JSON file-based persistence (no external database required), input validation quality gates, status enum controls, and CORS support for web frontend integration.

---

## 📋 Features

- **Full CRUD Functionality**: Create, retrieve, update, and delete courses over `/api/courses`.
- **JSON File Storage**: Fast, zero-dependency persistence in `data/courses.json`.
- **Quality Gates & Validations**:
  - Enforced string lengths (e.g., title $\ge$ 3 chars, description $\ge$ 10 chars).
  - Status Enum validation: restricted to `Draft`, `Published`, or `Archived` (case-insensitive).
  - Descriptive, standardized JSON error messages with HTTP status codes (`400`, `404`, `500`).
- **Advanced Query Features**:
  - Search across title, description, instructor, and category (`?search=...`).
  - Filter by category (`?category=...`), status (`?status=...`), and level (`?level=...`).
- **Exploration Endpoint**: `/api/stats` provides dynamic aggregation metrics (totals, counts by status, counts by category, instructor count, and average course price).
- **CORS Enabled**: Configured to accept browser requests from any local or remote frontend origin.
- **Automated Testing Suite**: Built-in unit and integration tests using Node.js native test runner and cURL test suite.

---

## 🛠️ Prerequisites

Ensure you have installed on your system:
- **Node.js**: v18.0.0 or higher (Tested on Node v22+)
- **npm**: v9.0.0 or higher
- **curl**: For command-line endpoint testing
- **Git**

Verify your environment:
```bash
node -v
npm -v
curl --version
```

---

## ⚡ Quick Start & Run Steps

### 1. Navigate to the backend directory
```bash
cd backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start the server
- **Production mode**:
  ```bash
  npm start
  ```
- **Development mode (auto-reload on changes)**:
  ```bash
  npm run dev
  ```

By default, the server will start at:
```
http://localhost:5001
```
*(You can customize the port by setting `PORT=XXXX npm start`)*

---

## 🧪 Running Tests

### Option A: Node.js Automated Test Suite
Runs 16 automated tests covering all CRUD operations, input validations, status enums, 404 handling, and stats:
```bash
npm test
```

### Option B: cURL Test Script
With the server running in one terminal, run the following command in another terminal:
```bash
./test-curl.sh
```

---

## 📡 API Endpoints Reference

### Base URL: `http://localhost:5001`

| Method | Endpoint | Description | Status Code |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | API status and welcome info | `200 OK` |
| `GET` | `/api/health` | Service health check | `200 OK` |
| `GET` | `/api/stats` | Aggregated statistics (totals, by status, by category) | `200 OK` |
| `GET` | `/api/courses` | List all courses (supports `?search=`, `?category=`, `?status=`) | `200 OK` |
| `GET` | `/api/courses/:id` | Get course by ID | `200 OK` / `404 Not Found` |
| `POST` | `/api/courses` | Create a new course | `201 Created` / `400 Bad Request` |
| `PUT` | `/api/courses/:id` | Update an existing course | `200 OK` / `400 Bad Request` / `404 Not Found` |
| `DELETE` | `/api/courses/:id` | Delete a course | `200 OK` / `404 Not Found` |

---

### 💻 cURL Examples

#### 1. Retrieve all courses
```bash
curl -X GET http://localhost:5001/api/courses
```

#### 2. Search courses by keyword
```bash
curl -X GET "http://localhost:5001/api/courses?search=React"
```

#### 3. Filter courses by status
```bash
curl -X GET "http://localhost:5001/api/courses?status=Published"
```

#### 4. Create a new course
```bash
curl -X POST http://localhost:5001/api/courses \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Machine Learning with PyTorch",
    "description": "Comprehensive guide to neural networks, computer vision, and transformers.",
    "instructor": "Dr. Sophia Vance",
    "duration": "8 weeks",
    "category": "AI & Machine Learning",
    "level": "Intermediate",
    "status": "Published",
    "price": 79.99
  }'
```

#### 5. Update a course
```bash
curl -X PUT http://localhost:5001/api/courses/<COURSE_ID> \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Machine Learning & Deep Learning with PyTorch",
    "status": "Draft",
    "price": 89.99
  }'
```

#### 6. Delete a course
```bash
curl -X DELETE http://localhost:5001/api/courses/<COURSE_ID>
```

#### 7. View platform statistics
```bash
curl -X GET http://localhost:5001/api/stats
```

---

## 🗃️ Data Schema

Each course object stored in `data/courses.json` has the following structure:

```json
{
  "id": "c1a2b3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d",
  "title": "Full-Stack Web Development with React and Node.js",
  "description": "Master modern full-stack web engineering from frontend architecture...",
  "instructor": "Dr. Sarah Jenkins",
  "duration": "10 weeks",
  "category": "Web Development",
  "level": "Intermediate",
  "status": "Published",
  "price": 89.99,
  "createdAt": "2026-08-15T10:00:00.000Z",
  "updatedAt": "2026-08-15T10:00:00.000Z"
}
```

**Allowed Status Values**:
- `Draft`
- `Published`
- `Archived`

---

## 🔧 Troubleshooting

1. **Port 5000 already in use (`EADDRINUSE`)**:
   - On macOS, AirPlay Receiver sometimes uses port 5000.
   - Run the server on an alternate port:
     ```bash
     PORT=5001 npm start
     ```
   - If changed, make sure to update the API base URL in the frontend dashboard.
2. **CORS errors in the browser**:
   - The server has `cors()` middleware pre-configured for `*` origin. If you see CORS issues, verify that the backend server is running and reachable at the specified URL.
3. **Data reset**:
   - If you want to reset the sample courses back to original state, restore `data/courses.json` from git or re-initialize with sample array.
