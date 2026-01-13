CREATE OR REPLACE FUNCTION pzero.audit_trigger_plpython () returns trigger AS $$
import plpy
import json

def dev_notice(msg):
    try:
        env_result = plpy.execute("SHOW app.environment")
        environment = env_result[0]['app.environment'] if env_result else 'production'
        if environment == 'development':
            plpy.notice(msg)
    except:
        pass

PARTITION_MOVEMENT_TABLES = ['all_auth', 'all_users', 'all_emails', 'all_phones', 'auth', 'users', 'emails', 'phones']

try:
    env_result = plpy.execute("SHOW app.environment")
    environment = env_result[0]['app.environment'] if env_result and len(env_result) > 0 else 'production'
except:
    environment = 'production'

table_name = TD.get('table_name', '')

if TD['event'] == 'DELETE':
    for t in PARTITION_MOVEMENT_TABLES:
        if t in table_name:
            dev_notice(f"Allowing partition movement DELETE on {table_name}")
            return None

    if environment != 'development':
        plpy.error(f"DELETE operations are not allowed in {environment} environment.")

# Return None to proceed with the operation unchanged
return None
$$ LANGUAGE plpython3u;