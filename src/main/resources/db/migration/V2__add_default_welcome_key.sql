-- Add a default welcome key with hash for "souz-beta-tester"
INSERT INTO welcome_keys (key_hash, comment)
VALUES ('z9AOVWvJTcUZbcxZdxz8j620A6LHvNeUTHmin0hN59s', 'Default local dev welcome key: souz-beta-tester')
ON CONFLICT (key_hash) DO NOTHING;
