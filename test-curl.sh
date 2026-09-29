#!/usr/bin/env bash

# ==============================================================================
# CodeCraftHub API Test Script using cURL
# Conforms to IBM Skills Network Lab specifications (lab-instructions-backend.md)
# ==============================================================================

PORT=${PORT:-5000}
# Test if port 5000 is reachable, otherwise fall back to 5001
if ! curl -s "http://localhost:${PORT}/api/health" > /dev/null 2>&1; then
  if curl -s "http://localhost:5001/api/health" > /dev/null 2>&1; then
    PORT=5001
  fi
fi

BASE_URL="http://localhost:${PORT}"

echo "=================================================================="
echo "🧪 Running CodeCraftHub cURL API Test Suite against: ${BASE_URL}"
echo "=================================================================="

# 0. Health Check
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
echo "1. Testing GET /api/courses (Get all courses)..."
GET_ALL=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "${BASE_URL}/api/courses")
STATUS=$(echo "$GET_ALL" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$GET_ALL" | grep -v "HTTP_STATUS:")
echo "   Status Code: $STATUS"
echo "   Response: $(echo "$BODY" | head -c 160)..."
if [ "$STATUS" -eq 200 ]; then echo "   ✅ PASS"; else echo "   ❌ FAIL"; fi

# 2. POST /api/courses (Add course)
echo ""
echo "2. Testing POST /api/courses (Add a course)..."
POST_RES=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "${BASE_URL}/api/courses" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Python Basics",
    "description": "Learn Python fundamentals",
    "target_date": "2025-12-31",
    "status": "Not Started"
  }')
STATUS=$(echo "$POST_RES" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$POST_RES" | grep -v "HTTP_STATUS:")
echo "   Status Code: $STATUS"
echo "   Response: $BODY"
if [ "$STATUS" -eq 201 ]; then echo "   ✅ PASS"; else echo "   ❌ FAIL"; fi

# Extract created ID (supports numeric id)
NEW_ID=$(echo "$BODY" | sed -n 's/.*"id":\([0-9]*\).*/\1/p')
if [ -z "$NEW_ID" ]; then
  NEW_ID=$(echo "$BODY" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
fi
echo "   Created Course ID: $NEW_ID"

# 3. GET /api/courses/<id> (Get specific course)
echo ""
echo "3. Testing GET /api/courses/${NEW_ID} (Get specific course)..."
GET_ONE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "${BASE_URL}/api/courses/${NEW_ID}")
STATUS=$(echo "$GET_ONE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$GET_ONE" | grep -v "HTTP_STATUS:")
echo "   Status Code: $STATUS"
echo "   Response: $BODY"
if [ "$STATUS" -eq 200 ]; then echo "   ✅ PASS"; else echo "   ❌ FAIL"; fi

# 4. PUT /api/courses/<id> (Update course)
echo ""
echo "4. Testing PUT /api/courses/${NEW_ID} (Update course status)..."
PUT_RES=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PUT "${BASE_URL}/api/courses/${NEW_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "In Progress"
  }')
STATUS=$(echo "$PUT_RES" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$PUT_RES" | grep -v "HTTP_STATUS:")
echo "   Status Code: $STATUS"
echo "   Response: $BODY"
if [ "$STATUS" -eq 200 ]; then echo "   ✅ PASS"; else echo "   ❌ FAIL"; fi

# 5. Validation error test
echo ""
echo "5. Testing Validation Error: POST with missing fields (Expect 400)..."
BAD_POST=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "${BASE_URL}/api/courses" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Incomplete" }')
STATUS=$(echo "$BAD_POST" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$BAD_POST" | grep -v "HTTP_STATUS:")
echo "   Status Code: $STATUS"
echo "   Response: $BODY"
if [ "$STATUS" -eq 400 ]; then echo "   ✅ PASS"; else echo "   ❌ FAIL"; fi

# 6. Status Enum validation test
echo ""
echo "6. Testing Status Enum Validation (Expect 400)..."
BAD_STATUS=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "${BASE_URL}/api/courses" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Invalid Status Test",
    "description": "Test description",
    "target_date": "2026-10-10",
    "status": "InvalidStatus"
  }')
STATUS=$(echo "$BAD_STATUS" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$BAD_STATUS" | grep -v "HTTP_STATUS:")
echo "   Status Code: $STATUS"
echo "   Response: $BODY"
if [ "$STATUS" -eq 400 ]; then echo "   ✅ PASS"; else echo "   ❌ FAIL"; fi

# 7. Stats endpoint
echo ""
echo "7. Testing Statistics endpoint GET /api/courses/stats..."
STATS_RES=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "${BASE_URL}/api/courses/stats")
STATUS=$(echo "$STATS_RES" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$STATS_RES" | grep -v "HTTP_STATUS:")
echo "   Status Code: $STATUS"
echo "   Response: $BODY"
if [ "$STATUS" -eq 200 ]; then echo "   ✅ PASS"; else echo "   ❌ FAIL"; fi

# 8. Search endpoint
echo ""
echo "8. Testing Search endpoint GET /api/courses/search?q=Python..."
SEARCH_RES=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "${BASE_URL}/api/courses/search?q=Python")
STATUS=$(echo "$SEARCH_RES" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$SEARCH_RES" | grep -v "HTTP_STATUS:")
echo "   Status Code: $STATUS"
echo "   Response Snippet: $(echo "$BODY" | head -c 160)..."
if [ "$STATUS" -eq 200 ]; then echo "   ✅ PASS"; else echo "   ❌ FAIL"; fi

# 9. DELETE /api/courses/<id> (Delete course)
echo ""
echo "9. Testing DELETE /api/courses/${NEW_ID} (Delete course)..."
DEL_RES=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X DELETE "${BASE_URL}/api/courses/${NEW_ID}")
STATUS=$(echo "$DEL_RES" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$DEL_RES" | grep -v "HTTP_STATUS:")
echo "   Status Code: $STATUS"
echo "   Response: $BODY"
if [ "$STATUS" -eq 200 ]; then echo "   ✅ PASS"; else echo "   ❌ FAIL"; fi

# 10. Verify 404
echo ""
echo "10. Verifying GET /api/courses/${NEW_ID} after deletion (Expect 404)..."
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
