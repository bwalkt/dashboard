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
    
    REGISTER_RESPONSE=$(curl -s -H "User-Agent: $USER_AGENT" -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -H "User-Agent: $USER_AGENT" \
        -d "{\"name\":\"$TEST_NAME\",\"email\":\"$TEST_EMAIL\"}" \
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