#!/bin/sh
set -e

# Find all compiled test files and run them sequentially
for test_file in /tests/dist/sfdc-server-vanilla.test.js; do
  if [ -f "$test_file" ]; then
    echo "Running test: $test_file"
    k6 run "$test_file"
    echo "Completed test: $test_file"
    echo "---"
  fi
done

