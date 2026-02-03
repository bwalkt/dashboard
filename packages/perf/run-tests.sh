#!/bin/sh
set -e

# Find all compiled test files in k6-dist and run them sequentially
K6_DIST="${K6_DIST:-./k6-dist}"
for test_file in "$K6_DIST"/*.test.js; do
  if [ -f "$test_file" ]; then
    echo "Running test: $test_file"
    k6 run "$test_file"
    echo "Completed test: $test_file"
    echo "---"
  fi
done
