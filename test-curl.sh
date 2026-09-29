#!/usr/bin/env bash

# ==============================================================================
# CodeCraftHub API Test Script using cURL
# Tests all CRUD operations, quality gates, search, and stats
# ==============================================================================

PORT=${PORT:-5001}
BASE_URL="http://localhost:${PORT}"

echo "=================================================================="
echo "🧪 Running CodeCraftHub cURL API Test Suite against: ${BASE_URL}"
echo "=================================================================="

# Check if server is running
echo ""
echo "0. Checking API Health..."
HEALTH_RES=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/health")
if [ "$HEALTH_RES" != "200" ]; then
  echo "❌ Error: API is not running on ${BASE_URL}. Please start the server first:"
  echo "   cd backend && npm start"
  exit 1
fi
echo "✅ Server is running (HTTP 200)"

# 1. GET /api/courses
echo ""
echo "1. Testing GET /api/courses (Read all)..."
GET_ALL=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "${BASE_URL}/api/courses")
STATUS=$(echo "$GET_ALL" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$GET_ALL" | grep -v "HTTP_STATUS:")
echo "   Status Code: $STATUS"
echo "   Response Snippet: $(echo "$BODY" | head -c 160)..."
if [ "$STATUS" -eq 200 ]; then echo "   ✅ PASS"; else echo "   ❌ FAIL"; fi

# 2. POST /api/courses (Create)
echo ""
echo "2. Testing POST /api/courses (Create new course)..."
POST_RES=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "${BASE_URL}/api/courses" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Quantum Computing Essentials for Developers",
    "description": "Understand qubits, quantum algorithms, superposition, and write quantum code using Qiskit.",
    "instructor": "Prof. David Miller",
    "duration": "8 weeks",
    "category": "Quantum Computing",
    "level": "Advanced",
    "status": "Published",
    "price": 89.99
  }')
STATUS=$(echo "$POST_RES" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$POST_RES" | grep -v "HTTP_STATUS:")
echo "   Status Code: $STATUS"
echo "   Response: $BODY"
if [ "$STATUS" -eq 201 ]; then echo "   ✅ PASS"; else echo "   ❌ FAIL"; fi

# Extract created ID
NEW_ID=$(echo "$BODY" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
echo "   Extracted ID: $NEW_ID"

# 3. GET /api/courses/:id (Read one)
echo ""
echo "3. Testing GET /api/courses/:id (Read single created course)..."
GET_ONE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "${BASE_URL}/api/courses/${NEW_ID}")
STATUS=$(echo "$GET_ONE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$GET_ONE" | grep -v "HTTP_STATUS:")
echo "   Status Code: $STATUS"
echo "   Response: $BODY"
if [ "$STATUS" -eq 200 ]; then echo "   ✅ PASS"; else echo "   ❌ FAIL"; fi

# 4. PUT /api/courses/:id (Update)
echo ""
echo "4. Testing PUT /api/courses/:id (Update course)..."
PUT_RES=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PUT "${BASE_URL}/api/courses/${NEW_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Quantum Computing Essentials & Qiskit in Action",
    "status": "Draft",
    "price": 99.99
  }')
STATUS=$(echo "$PUT_RES" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$PUT_RES" | grep -v "HTTP_STATUS:")
echo "   Status Code: $STATUS"
echo "   Response: $BODY"
if [ "$STATUS" -eq 200 ]; then echo "   ✅ PASS"; else echo "   ❌ FAIL"; fi

# 5. Testing Quality Gate: Validation Error (Missing fields)
echo ""
echo "5. Testing Quality Gate: POST with invalid data (Expect 400 Bad Request)..."
BAD_POST=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "${BASE_URL}/api/courses" \
  -H "Content-Type: application/json" \
  -d '{ "title": "No" }')
STATUS=$(echo "$BAD_POST" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$BAD_POST" | grep -v "HTTP_STATUS:")
echo "   Status Code: $STATUS"
echo "   Response: $BODY"
if [ "$STATUS" -eq 400 ]; then echo "   ✅ PASS"; else echo "   ❌ FAIL"; fi

# 6. Testing Quality Gate: Status Enum Validation
echo ""
echo "6. Testing Quality Gate: Invalid Status Enum (Expect 400 Bad Request)..."
BAD_ENUM=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "${BASE_URL}/api/courses" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Title for Validation",
    "description": "Test description long enough to pass validation.",
    "instructor": "Teacher",
    "duration": "1 week",
    "category": "Testing",
    "status": "InvalidStatusXYZ"
  }')
STATUS=$(echo "$BAD_ENUM" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$BAD_ENUM" | grep -v "HTTP_STATUS:")
echo "   Status Code: $STATUS"
echo "   Response: $BODY"
if [ "$STATUS" -eq 400 ]; then echo "   ✅ PASS"; else echo "   ❌ FAIL"; fi

# 7. Search query testing
echo ""
echo "7. Testing Search query GET /api/courses?search=Quantum..."
SEARCH_RES=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "${BASE_URL}/api/courses?search=Quantum")
STATUS=$(echo "$SEARCH_RES" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$SEARCH_RES" | grep -v "HTTP_STATUS:")
echo "   Status Code: $STATUS"
echo "   Response Snippet: $(echo "$BODY" | head -c 160)..."
if [ "$STATUS" -eq 200 ]; then echo "   ✅ PASS"; else echo "   ❌ FAIL"; fi

# 8. Stats exploration testing
echo ""
echo "8. Testing Stats endpoint GET /api/stats..."
STATS_RES=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "${BASE_URL}/api/stats")
STATUS=$(echo "$STATS_RES" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$STATS_RES" | grep -v "HTTP_STATUS:")
echo "   Status Code: $STATUS"
echo "   Response: $BODY"
if [ "$STATUS" -eq 200 ]; then echo "   ✅ PASS"; else echo "   ❌ FAIL"; fi

# 9. DELETE /api/courses/:id
echo ""
echo "9. Testing DELETE /api/courses/:id (Delete created course)..."
DEL_RES=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X DELETE "${BASE_URL}/api/courses/${NEW_ID}")
STATUS=$(echo "$DEL_RES" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$DEL_RES" | grep -v "HTTP_STATUS:")
echo "   Status Code: $STATUS"
echo "   Response: $BODY"
if [ "$STATUS" -eq 200 ]; then echo "   ✅ PASS"; else echo "   ❌ FAIL"; fi

# 10. Verify 404 on deleted item
echo ""
echo "10. Testing GET /api/courses/:id after deletion (Expect 404 Not Found)..."
VERIFY_404=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "${BASE_URL}/api/courses/${NEW_ID}")
STATUS=$(echo "$VERIFY_404" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$VERIFY_404" | grep -v "HTTP_STATUS:")
echo "   Status Code: $STATUS"
echo "   Response: $BODY"
if [ "$STATUS" -eq 404 ]; then echo "   ✅ PASS"; else echo "   ❌ FAIL"; fi

echo ""
echo "=================================================================="
echo "🎉 All CodeCraftHub API cURL tests completed successfully!"
echo "=================================================================="
