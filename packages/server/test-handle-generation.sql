-- Test the handle generation function
SELECT pzero.create_user('{
  "name": "Uma Krishnan",
  "email": "uma.test@example.com",
  "email_verified": true
}'::jsonb) as result;