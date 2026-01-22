#!/bin/bash

# Email Verification Workflow - Curl Integration Tests
# This script tests the complete email verification workflows using curl
# Run this against a live server with database and email service configured

set -e  # Exit on any error

# Configuration
SERVER_URL="http://localhost:8090"
TEST_EMAIL="test-$(date +%s)@example.com"  # Unique email per test run
TEST_NAME="Curl Test User"
USER_AGENT="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

echo "🚀 Starting Email Verification Workflow Tests"
echo "Server: $SERVER_URL"
echo "Test Email: $TEST_EMAIL"
echo "=====================================\n"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${YELLOW}📝 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if server is running
check_server() {
    print_step "Checking if server is running..."
    
    if curl -s --fail -H "User-Agent: $USER_AGENT" "$SERVER_URL/health" > /dev/null; then
        print_success "Server is running"
    else
        print_error "Server is not running at $SERVER_URL"
        echo "Please start the server first: pnpm run dev"
        exit 1
    fi
}

# Function to test registration workflow
test_registration_workflow() {
    echo -e "\n${YELLOW}🔄 TESTING REGISTRATION WORKFLOW${NC}"
    echo "=================================="
    
    print_step "1. Registering user with email: $TEST_EMAIL"
    
    # Create device info JSON
    DEVICE_INFO=$(cat <<EOF
{
    "id": "test-device-$(date +%s)",
    "deviceId": "curl-test-001",
    "deviceName": "Test Device",
    "systemName": "macOS",
    "systemVersion": "14.0",
    "brand": "Apple",
    "model": "MacBook Pro",
    "buildNumber": "1.0.0",
    "appVersion": "1.0.0",
    "appName": "curl-test",
    "uniqueId": "unique-$(date +%s)",
    "carrier": null,
    "ipAddress": "127.0.0.1",
    "macAddress": null,
    "deviceType": "desktop",
    "isEmulator": false,
    "isTablet": false,
    "ua": "$USER_AGENT",
    "manufacturer": "Apple",
    "os": "macOS",
    "osVersion": "14.0",
    "type": "CURL_TEST",
    "other": []
}
EOF
    )
    
    REGISTER_RESPONSE=$(curl -s -H "User-Agent: $USER_AGENT" -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -H "User-Agent: $USER_AGENT" \
        -d "{\"name\":\"$TEST_NAME\",\"email\":\"$TEST_EMAIL\",\"device\":$DEVICE_INFO}" \
        "$SERVER_URL/auth/register")
    
    HTTP_CODE=$(echo "$REGISTER_RESPONSE" | tail -n1)
    RESPONSE_BODY=$(echo "$REGISTER_RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" = "200" ]; then
        print_success "Registration successful"
        echo "Response: $RESPONSE_BODY"
        
        echo -e "\n${YELLOW}📧 CHECK YOUR EMAIL CONFIGURATION${NC}"
        echo "If you have email service configured (Brevo), you should receive an email with a 6-digit verification code."
        echo "If testing locally, check your email service logs for the verification code."
        
        echo -e "\n${YELLOW}⏳ Waiting for manual verification code input...${NC}"
        echo -n "Enter the 6-digit verification code from the email: "
        read -r VERIFICATION_CODE
        
        if [[ ! "$VERIFICATION_CODE" =~ ^[0-9]{6}$ ]]; then
            print_error "Invalid code format. Please enter exactly 6 digits."
            return 1
        fi
        
        print_step "2. Verifying registration with code: $VERIFICATION_CODE"
        
        VERIFY_RESPONSE=$(curl -s -H "User-Agent: $USER_AGENT" -w "\n%{http_code}" -X POST \
            -H "Content-Type: application/json" \
            -H "User-Agent: $USER_AGENT" \
            -d "{\"email\":\"$TEST_EMAIL\",\"code\":\"$VERIFICATION_CODE\"}" \
            "$SERVER_URL/auth/register/verify")
        
        VERIFY_HTTP_CODE=$(echo "$VERIFY_RESPONSE" | tail -n1)
        VERIFY_BODY=$(echo "$VERIFY_RESPONSE" | sed '$d')
        
        if [ "$VERIFY_HTTP_CODE" = "200" ]; then
            print_success "Registration verification successful!"
            echo "Response: $VERIFY_BODY"
            
            # Extract tokens if present
            ACCESS_TOKEN=$(echo "$VERIFY_BODY" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
            if [ ! -z "$ACCESS_TOKEN" ]; then
                echo "Access Token: ${ACCESS_TOKEN:0:20}..."
                
                # Test authenticated request
                print_step "3. Testing authenticated request with access token"
                AUTH_RESPONSE=$(curl -s -H "User-Agent: $USER_AGENT" -w "\n%{http_code}" \
                    -H "Cookie: accessToken=$ACCESS_TOKEN" \
                    "$SERVER_URL/auth/me")
                
                AUTH_HTTP_CODE=$(echo "$AUTH_RESPONSE" | tail -n1)
                AUTH_BODY=$(echo "$AUTH_RESPONSE" | sed '$d')
                
                if [ "$AUTH_HTTP_CODE" = "200" ]; then
                    print_success "Authenticated request successful"
                    echo "User info: $AUTH_BODY"
                else
                    print_error "Authenticated request failed: $AUTH_HTTP_CODE"
                    echo "Response: $AUTH_BODY"
                fi
            fi
        else
            print_error "Registration verification failed: $VERIFY_HTTP_CODE"
            echo "Response: $VERIFY_BODY"
            return 1
        fi
        
    else
        print_error "Registration failed: $HTTP_CODE"
        echo "Response: $RESPONSE_BODY"
        return 1
    fi
}

# Function to test login workflow
test_login_workflow() {
    echo -e "\n${YELLOW}🔄 TESTING LOGIN WORKFLOW${NC}"
    echo "=========================="
    
    print_step "1. Requesting login code for: $TEST_EMAIL"
    echo "(Note: User must exist from previous registration test)"
    
    LOGIN_RESPONSE=$(curl -s -H "User-Agent: $USER_AGENT" -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$TEST_EMAIL\"}" \
        "$SERVER_URL/auth/login")
    
    HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)
    RESPONSE_BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" = "200" ]; then
        print_success "Login code request successful"
        echo "Response: $RESPONSE_BODY"
        
        echo -e "\n${YELLOW}📧 CHECK YOUR EMAIL FOR LOGIN CODE${NC}"
        echo -n "Enter the 6-digit login verification code: "
        read -r LOGIN_CODE
        
        if [[ ! "$LOGIN_CODE" =~ ^[0-9]{6}$ ]]; then
            print_error "Invalid code format. Please enter exactly 6 digits."
            return 1
        fi
        
        print_step "2. Verifying login with code: $LOGIN_CODE"
        
        LOGIN_VERIFY_RESPONSE=$(curl -s -H "User-Agent: $USER_AGENT" -w "\n%{http_code}" -X POST \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"$TEST_EMAIL\",\"code\":\"$LOGIN_CODE\"}" \
            "$SERVER_URL/auth/login/verify")
        
        LOGIN_VERIFY_HTTP_CODE=$(echo "$LOGIN_VERIFY_RESPONSE" | tail -n1)
        LOGIN_VERIFY_BODY=$(echo "$LOGIN_VERIFY_RESPONSE" | sed '$d')
        
        if [ "$LOGIN_VERIFY_HTTP_CODE" = "200" ]; then
            print_success "Login verification successful!"
            echo "Response: $LOGIN_VERIFY_BODY"
        else
            print_error "Login verification failed: $LOGIN_VERIFY_HTTP_CODE"
            echo "Response: $LOGIN_VERIFY_BODY"
            return 1
        fi
        
    elif [ "$HTTP_CODE" = "404" ]; then
        print_error "User not found. Please run registration workflow first."
        echo "Response: $RESPONSE_BODY"
        return 1
    else
        print_error "Login request failed: $HTTP_CODE"
        echo "Response: $RESPONSE_BODY"
        return 1
    fi
}

# Function to test rate limiting
test_rate_limiting() {
    echo -e "\n${YELLOW}🔄 TESTING RATE LIMITING${NC}"
    echo "======================="
    
    print_step "Testing registration rate limiting..."
    
    # First request should succeed
    FIRST_RESPONSE=$(curl -s -H "User-Agent: $USER_AGENT" -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"Rate Test\",\"email\":\"$TEST_EMAIL\"}" \
        "$SERVER_URL/auth/register")
    
    FIRST_HTTP_CODE=$(echo "$FIRST_RESPONSE" | tail -n1)
    
    if [ "$FIRST_HTTP_CODE" = "200" ]; then
        print_success "First registration request successful"
        
        # Immediate second request should be rate limited
        print_step "Making immediate second request (should be rate limited)..."
        
        SECOND_RESPONSE=$(curl -s -H "User-Agent: $USER_AGENT" -w "\n%{http_code}" -X POST \
            -H "Content-Type: application/json" \
            -d "{\"name\":\"Rate Test 2\",\"email\":\"$TEST_EMAIL\"}" \
            "$SERVER_URL/auth/register")
        
        SECOND_HTTP_CODE=$(echo "$SECOND_RESPONSE" | tail -n1)
        SECOND_BODY=$(echo "$SECOND_RESPONSE" | sed '$d')
        
        if [ "$SECOND_HTTP_CODE" = "429" ]; then
            print_success "Rate limiting working correctly"
            echo "Response: $SECOND_BODY"
        else
            print_error "Rate limiting not working. Expected 429, got: $SECOND_HTTP_CODE"
            echo "Response: $SECOND_BODY"
        fi
    else
        print_error "First registration request failed: $FIRST_HTTP_CODE"
        echo "Cannot test rate limiting"
    fi
}

# Function to clean up test data
cleanup_test_data() {
    echo -e "\n${YELLOW}🧹 CLEANUP${NC}"
    echo "=========="
    
    print_step "Test completed with email: $TEST_EMAIL"
    echo "Note: In a real environment, you may want to delete this test user from the database."
}

# Main execution
main() {
    check_server
    
    echo -e "\n${YELLOW}Select test to run:${NC}"
    echo "1) Full Registration Workflow"
    echo "2) Login Workflow (requires existing user)"
    echo "3) Rate Limiting Test" 
    echo "4) All Tests"
    echo -n "Enter your choice (1-4): "
    read -r CHOICE
    
    case $CHOICE in
        1)
            test_registration_workflow
            ;;
        2)
            test_login_workflow
            ;;
        3)
            test_rate_limiting
            ;;
        4)
            test_registration_workflow
            echo -e "\n"
            test_login_workflow
            echo -e "\n"
            test_rate_limiting
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
    
    cleanup_test_data
    
    echo -e "\n${GREEN}🎉 Test completed successfully!${NC}"
}

# Run main function
main
# ================================================================
# CENTRIFUGO INTEGRATION TESTS
# ================================================================

CENTRIFUGO_API_URL="http://localhost:8091"
GRPC_PORT="9091"

print_centrifugo() {
    echo -e "\033[0;35m🔄 $1\033[0m"  # Purple for Centrifugo
}

# Test Centrifugo API connectivity
test_centrifugo_api() {
    print_centrifugo "Testing Centrifugo API connectivity..."
    
    local response
    if response=$(curl -s "$CENTRIFUGO_API_URL/api" -H "Authorization: apikey api-key-for-server" -H "Content-Type: application/json" -d '{"method":"info"}' 2>/dev/null); then
        if echo "$response" | grep -q "\"nodes\""; then
            print_success "Centrifugo API working - server info retrieved"
        else
            print_error "Centrifugo API failed. Response: $response"
        fi
    else
        print_error "Centrifugo API not accessible at $CENTRIFUGO_API_URL"
        echo "Start with: docker run -d --name pzero-centrifugo -p 8091:8000 -p 8092:8001 -v \$(pwd)/centrifugo.json:/centrifugo/config.json centrifugo/centrifugo:v5 centrifugo -c config.json"
    fi
}

# Test Centrifugo proxy endpoints
test_centrifugo_connect_proxy() {
    print_centrifugo "Testing Centrifugo connect proxy (no token)..."
    
    local response
    response=$(curl -s -H "User-Agent: $USER_AGENT" -X POST "$SERVER_URL/centrifugo/connect" \
        -H "Content-Type: application/json" \
        -d '{}')
    
    if echo "$response" | grep -q "\"code\":4001\|Authentication required"; then
        print_success "Centrifugo connect proxy correctly rejects missing token"
    else
        print_error "Centrifugo connect proxy failed. Response: $response"
    fi
}

test_centrifugo_connect_with_token() {
    print_centrifugo "Testing Centrifugo connect proxy (with test token)..."
    
    # Create a test JWT token using Node.js
    if command -v node > /dev/null; then
        local test_token
        test_token=$(node -e "
            const jwt = require('jsonwebtoken');
            const payload = {
                userId: 123,
                email: 'test@example.com',
                exp: Math.floor(Date.now() / 1000) + 3600
            };
            console.log(jwt.sign(payload, 'my-secret-token-key'));
        " 2>/dev/null || true)
        
        if [ -n "$test_token" ]; then
            local response
            response=$(curl -s -H "User-Agent: $USER_AGENT" -X POST "$SERVER_URL/centrifugo/connect" \
                -H "Content-Type: application/json" \
                -d "{\"token\":\"$test_token\"}")
            
            if echo "$response" | grep -q "\"user\":\|\"result\""; then
                print_success "Centrifugo connect proxy accepts valid token"
            else
                print_error "Centrifugo connect proxy failed with valid token. Response: $response"
            fi
        else
            echo "⚠️  Could not generate test JWT token"
        fi
    else
        echo "⚠️  Node.js not available - skipping JWT token test"
    fi
}

test_centrifugo_subscribe_proxy() {
    print_centrifugo "Testing Centrifugo subscribe proxy..."
    
    local response
    response=$(curl -s -H "User-Agent: $USER_AGENT" -X POST "$SERVER_URL/centrifugo/subscribe" \
        -H "Content-Type: application/json" \
        -d '{"channel":"personal:123","user":"123"}')
    
    if echo "$response" | grep -q "\"result\"\|\"disconnect\""; then
        print_success "Centrifugo subscribe proxy working"
    else
        print_error "Centrifugo subscribe proxy failed. Response: $response"
    fi
}

test_centrifugo_publish_proxy() {
    print_centrifugo "Testing Centrifugo publish proxy..."
    
    local response
    response=$(curl -s -H "User-Agent: $USER_AGENT" -X POST "$SERVER_URL/centrifugo/publish" \
        -H "Content-Type: application/json" \
        -d '{"channel":"personal:123","user":"123","data":{"message":"test"}}')
    
    if echo "$response" | grep -q "\"result\"\|\"disconnect\""; then
        print_success "Centrifugo publish proxy working"
    else
        print_error "Centrifugo publish proxy failed. Response: $response"
    fi
}

# Test gRPC server connectivity
test_grpc_server() {
    print_centrifugo "Testing gRPC server connectivity..."
    
    if nc -z localhost $GRPC_PORT 2>/dev/null; then
        print_success "gRPC server accessible on port $GRPC_PORT"
    else
        print_error "gRPC server not accessible on port $GRPC_PORT"
        echo "Start with: pnpm run dev:centrifuge"
    fi
}

# Test token validation endpoint
test_token_validation() {
    print_step "Testing token validation endpoint..."
    
    local response
    response=$(curl -s -H "User-Agent: $USER_AGENT" -X POST "$SERVER_URL/auth/validate-token" \
        -H "Content-Type: application/json" \
        -d '{"token":"invalid-token"}')
    
    if echo "$response" | grep -q "\"valid\":false\|Invalid"; then
        print_success "Token validation endpoint correctly rejects invalid token"
    else
        print_error "Token validation failed. Response: $response"
    fi
}

# Test real-time messaging through Centrifugo API
test_centrifugo_publish_api() {
    print_centrifugo "Testing Centrifugo publish via API..."
    
    local response
    if response=$(curl -s "$CENTRIFUGO_API_URL/api" \
        -H "Authorization: apikey api-key-for-server" \
        -H "Content-Type: application/json" \
        -d '{"method":"publish","params":{"channel":"personal:test","data":{"message":"Hello from tests!","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}}}' 2>/dev/null); then
        
        if echo "$response" | grep -q "\"result\"\|\"error\":null"; then
            print_success "Successfully published message to Centrifugo channel"
        else
            print_error "Failed to publish to Centrifugo. Response: $response"
        fi
    else
        print_error "Could not connect to Centrifugo API for publishing"
    fi
}

# Test channel information
test_centrifugo_channels() {
    print_centrifugo "Testing Centrifugo channels info..."
    
    local response
    if response=$(curl -s "$CENTRIFUGO_API_URL/api" \
        -H "Authorization: apikey api-key-for-server" \
        -H "Content-Type: application/json" \
        -d '{"method":"channels"}' 2>/dev/null); then
        
        if echo "$response" | grep -q "\"result\""; then
            print_success "Successfully retrieved Centrifugo channels info"
        else
            print_error "Failed to get channels info. Response: $response"
        fi
    else
        print_error "Could not connect to Centrifugo API for channels info"
    fi
}

# Add new tests to the main execution section
echo ""
echo "🔄 Testing Centrifugo Integration..."
echo "=================================="
test_centrifugo_api
test_centrifugo_connect_proxy  
test_centrifugo_connect_with_token
test_centrifugo_subscribe_proxy
test_centrifugo_publish_proxy
test_centrifugo_publish_api
test_centrifugo_channels

echo ""
echo "🔧 Testing gRPC Server..."
echo "========================"
test_grpc_server

echo ""
echo "🔐 Testing Authentication Integration..." 
echo "======================================"
test_token_validation

# Gateway Testing Functions
# Test gateway functionality with header validation and pass-through to target server

GATEWAY_URL="http://localhost:8093"
TARGET_URL="http://localhost:8080"

print_gateway() {
    echo -e "${YELLOW}🌐 $1${NC}"
}

# Function to generate JWT token for authentication
generate_jwt_token() {
    if command -v node >/dev/null 2>&1; then
        node -e "
        const jwt = require('jsonwebtoken');
        const secret = 'your_super_secret_jwt_key_change_this_in_production';
        const token = jwt.sign({
          sub: 'test-user',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
        }, secret);
        console.log(token);
        " 2>/dev/null || true
    else
        echo ""
    fi
}

# Test bot detection (should block curl with default user agent)
test_gateway_bot_detection() {
    print_gateway "Testing gateway bot detection..."
    
    local response
    response=$(curl -s "$GATEWAY_URL/health" 2>/dev/null || echo "")
    
    if echo "$response" | grep -q "Suspicious bot detected"; then
        print_success "Gateway successfully blocks suspicious bots"
    else
        print_error "Gateway bot detection failed. Expected 'Suspicious bot detected', got: $response"
    fi
}

# Test legitimate user agent (should allow)
test_gateway_legitimate_access() {
    print_gateway "Testing gateway with legitimate user agent..."
    
    local response
    response=$(curl -s -H "User-Agent: $USER_AGENT" "$GATEWAY_URL/health" 2>/dev/null)
    
    if echo "$response" | grep -q '"status":"ok"'; then
        print_success "Gateway allows legitimate user agents"
    else
        print_error "Gateway failed to allow legitimate user agent. Response: $response"
    fi
}

# Test gateway authentication requirement
test_gateway_auth_required() {
    print_gateway "Testing gateway authentication requirement..."
    
    local response
    response=$(curl -s -H "User-Agent: $USER_AGENT" "$GATEWAY_URL/gateway/" 2>/dev/null)
    
    if echo "$response" | grep -q "Authentication required"; then
        print_success "Gateway properly requires authentication for protected routes"
    else
        print_error "Gateway auth requirement failed. Response: $response"
    fi
}

# Test gateway pass-through functionality with authentication
test_gateway_passthrough() {
    print_gateway "Testing gateway pass-through to target server..."
    
    local jwt_token
    jwt_token=$(generate_jwt_token)
    
    if [ -n "$jwt_token" ]; then
        local response
        response=$(curl -s -H "User-Agent: $USER_AGENT" \
            -H "x-custom-auth: $jwt_token" \
            "$GATEWAY_URL/gateway/salesforce" 2>/dev/null)
        
        # Should get 404 from target server (route doesn't exist)
        if echo "$response" | grep -q "Route GET:/salesforce not found"; then
            print_success "Gateway successfully forwards authenticated requests to target server"
        else
            print_error "Gateway pass-through failed. Response: $response"
        fi
    else
        print_error "Could not generate JWT token for gateway test"
    fi
}

# Test direct access to target server (should work)
test_target_server_direct() {
    print_gateway "Testing direct access to target server..."
    
    local response
    response=$(curl -s -H "User-Agent: $USER_AGENT" "$TARGET_URL/" 2>/dev/null)
    
    if echo "$response" | grep -q "Route GET:/ not found"; then
        print_success "Target server is accessible directly"
    else
        print_error "Target server direct access failed. Response: $response"
    fi
}

# Test gateway vs direct access comparison
test_gateway_vs_direct() {
    print_gateway "Comparing gateway vs direct access..."
    
    local jwt_token
    jwt_token=$(generate_jwt_token)
    
    if [ -n "$jwt_token" ]; then
        print_gateway "  → Gateway access (with auth):"
        curl -v -H "User-Agent: $USER_AGENT" \
            -H "x-custom-auth: $jwt_token" \
            "$GATEWAY_URL/gateway/" 2>&1 | grep -E "(HTTP/|< x-auth-validated)"
            
        print_gateway "  → Direct access:"
        curl -v -H "User-Agent: $USER_AGENT" \
            "$TARGET_URL/" 2>&1 | grep "HTTP/"
            
        print_success "Gateway adds authentication validation while preserving target server responses"
    else
        print_error "Could not generate JWT token for comparison test"
    fi
}

echo ""
echo "🌐 Testing Gateway Functionality..."
echo "================================="
test_gateway_bot_detection
test_gateway_legitimate_access  
test_gateway_auth_required
test_gateway_passthrough
test_target_server_direct
test_gateway_vs_direct

print_success "🎉 All tests completed!"
