CREATE OR REPLACE FUNCTION is_valid_url (url text) returns boolean AS $$
    if (!!!url) {
        return false;
    }
    url = url.trim();
    if (url.length === 0) {
        return false;
    }
    if (url.length > 255) {
        return false;
    }
    var regex = new RegExp(`^((http|https)://)?[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$`)
    return regex.test(url);
$$ language plv8 immutable strict;

CREATE OR REPLACE FUNCTION get_column_no (
  table_name text,
  column_name text,
  schema_name text DEFAULT 'pzero'
) returns integer AS $$
    if (!!!table_name || !!!column_name) {
        throw 'table_name and column_name are required';
    }
    var ordinalName = `ordinal_${schema_name}_${table_name}`
    if (plv8[ordinalName] && plv8[ordinalName][column_name]) {
        return plv8[ordinalName][column_name];
    }
    if (!plv8[ordinalName]) {
        plv8[ordinalName] = {};
    }
    var stmt = `SELECT ordinal_position as pos FROM information_schema.columns WHERE table_schema = $3 AND table_name = $1 AND column_name = $2`;
    var result = plv8.execute(stmt, table_name, column_name, schema_name);
    if (result.length > 0) {
        plv8[ordinalName][column_name] = result[0]['pos'];
        return result[0]['pos'];
    }
    throw `Column ${column_name} not found in table ${schema_name}.${table_name}`;
    return -1;
$$ language plv8 immutable strict;

CREATE OR REPLACE FUNCTION jsonb_diff (a jsonb, b jsonb) returns jsonb AS $$
  // Helper function to find all keys in both objects
  const allKeys = (obj1, obj2) => {
    const keys = new Set();
    if (typeof obj1 === 'object') {
      Object.keys(obj1).forEach(key => keys.add(key));
    }
    if (typeof obj2 === 'object') {
      Object.keys(obj2).forEach(key => keys.add(key));
    }
    return Array.from(keys);
  };

  // Recursive diffing function
  const diff = (obj1, obj2) => {
    const changes = {};
    const keys = allKeys(obj1, obj2);

    for (const key of keys) {
      const val1 = obj1 ? obj1[key] : undefined;
      const val2 = obj2 ? obj2[key] : undefined;

      // New key added to obj2
      if (val1 === undefined) {
        changes[key] = { status: 'added', newValue: val2 };
        continue;
      }

      // Key deleted from obj2
      if (val2 === undefined) {
        changes[key] = { status: 'deleted', oldValue: val1 };
        continue;
      }

      // Values differ (check for nested objects)
      if (typeof val1 === 'object' && typeof val2 === 'object' && val1 !== null && val2 !== null) {
        const nestedChanges = diff(val1, val2);
        if (Object.keys(nestedChanges).length > 0) {
          changes[key] = { status: 'updated', changes: nestedChanges };
        }
      } else if (val1 !== val2) {
        changes[key] = { status: 'updated', oldValue: val1, newValue: val2 };
      }
    }
    return changes;
  };

  // Entry point for the function
  const obj_a = JSON.parse(a);
  const obj_b = JSON.parse(b);
  const result = diff(obj_a, obj_b);
  
  return JSON.stringify(result);
$$ language plv8 immutable strict;

--SELECT jsonb_diff(
--  '{"user": {"name": "Alice", "id": 123}, "active": true}'::jsonb,
--  '{"user": {"name": "Bob", "email": "bob@example.com"}, "active": true}'::jsonb
--);
-- {
--  "user": {
--    "status": "updated",
--    "changes": {
--      "name": { "status": "updated", "oldValue": "Alice", "newValue": "Bob" },
--      "id": { "status": "deleted", "oldValue": 123 },
--      "email": { "status": "added", "newValue": "bob@example.com" }
--    }
--  }
--}
--CREATE OR REPLACE FUNCTION get_country_name (country_id smallint) returns text AS $$
--        plv8.elog(NOTICE, 'Initializing country cache...');
--        const data = plv8.execute("SELECT id, name FROM country_codes");
--        plv8.country_cache = {}; // Create the cache object.
--        for (let i = 0; i < data.length; i++) {
--            plv8.country_cache[data[i].id] = data[i].name; // Populate the cache.
--        }
--    }
--    // Return the value from the cache.
--    return plv8.country_cache[country_id];
--$$ language plv8 immutable;
function pzero.get_mmn (table_name text) returns text AS $$
    if plv8.mmn_cache === undefined {
        plv8.mmn_cache = {};
    }
    if (plv8.mmn_cache[table_name]) {
        return plv8.mmn_cache[table_name];
    }
    var result = plv8.execute("SELECT mmn from pzero.mmn where table_name = $1", [table_name]);
    if (result.length === 0) {
        throw `No MMN found for table: ${table_name}`;
    }
    plv8.mmn_cache[table_name] = result[0]['mmn'];
    return result[0]['mmn'];
$$ language plv8 immutable strict;

function pzero.get_table_name (mmn text) returns text AS $$
    if (plv8.mmn_table_cache === undefined) {
        plv8.mmn_table_cache = {};
    }
    if (plv8.mmn_table_cache[mmn]) {
        return plv8.mmn_table_cache[mmn];
    }
    var result = plv8.execute("SELECT table_name from pzero.mmn where mmn = $1", [mmn]);
    if (result.length === 0) {
        throw `No table found for mmn: ${mmn}`;
    }
    plv8.mmn_table_cache[mmn] = result[0]['table_name'];
    return result[0]['table_name'];    
$$ language plv8 immutable strict;

CREATE OR REPLACE FUNCTION pzero.audit_trigger_plv8 () returns trigger language plv8 AS $$
    var txid = plv8.execute("SELECT txid_current()")[0].txid_current;
    var tableName = TD.table_name;
    var oldRow = TD.old; // Available for UPDATE and DELETE
    var newRow = TD.new; // Available for INSERT and UPDATE
    var auditColumns = ['id', 'c_by', 'c_at', 'u_by', 'u_at', 'is_del', 'last_seen']; // Columns to audit
    var isDelColumn = 'is_del';
    var result;
    var c_by = newRow.c_by;
    var diffs = {}
    if (TD.event === 'DELETE') {
        throw 'cannot delete record'
    }
    if (oldRow && newRow.u_by) {
        c_by = newRow.u_by
    }
    if ((oldRow && newRow) && (oldRow.id !== newRow.id)) {
        throw 'id for tableName not mutable';
    }
    var data = newRow.data;
    if (data) {
        data = JSON.parse(data)
        if (data.meta) {
            c_by = data.meta.c_by;
            if (data.meta.u_by) {
                c_by = data.meta.u_by
            }
            delete data.meta;
            if (!(object.keys(data).length)) {
               delete newRow.data 
            }
        }
        if (data.diff) {
            var diffKeys = object.keys(data.diff)
            if (diffKeys.length) {
                diffs = {...data.diff}
            }
            delete data.diff;
        }
    }  
    if (!c_by) {
        throw `Missing Audit field - c_by`
    }
    var id = newRow.id;
    if (!id) {
        try {
            result = plv8.execute("select pzero.gen_monotonic_id() as id");
            id = result[0]['id']
            newRow.id = id;
        } catch() {
            throw 'Unable to gen id'
        }
    }
    // Insert into txns table if not exists
    var mmn = pzero.get_mmn (tableName);
    if (TD.event === 'INSERT') {
        var insertOk = false;
        while (!insertOk) {
            try {
                if (!newRow.id) {
                    newRow.id = pzero.gen_monotonic_id();
                }
                var rowExists = plv8.execute("SELECT 1 FROM " + tableName + " WHERE id = $1", [newRow.id]);
                if (rowExists.length > 0) {
                    newRow.id = pzero.gen_monotonic_id();
                } else {
                    insertOk = true;
                }
            } catch (err) {
                plv8.elog(WARNING, 'Insert conflict, retrying: ' + err);
            }
        }
    }
    plv8.execute("INSERT INTO pzero.txns (id, c_by, c_at) VALUES ($1, $2, NOW()) ON CONFLICT (txid) DO NOTHING", [txid, c_by]);
    if (newRow.is_del) {
        // If the is_del column is set to true, log a deletion
        plv8.execute(
            "INSERT INTO pzero.audits (txn_id, mmn, row_id, col_name, new_val, is_del) VALUES ($1, $2, $3, $4, $5, TRUE)",
            [txid, mmn, oldRow.id, isDelColumn, 'TRUE', true]
        );
        return TD.new; // For DELETE triggers, return the new row
    }
    if ((TD.event === 'INSERT') || (TD.event === 'UPDATE')) {
        continue;
    } else {
        throw `Unsupported event type: ${TD.event}`;
    }
    for (var colName in newRow) {
        if ((auditColumns.indexOf(colName.toLowerCase()) !== -1) && newRow.hasOwnProperty(colName)) {
            var colNo = getColumnNo (tableName, colName, 'pzero');
            var colValue = String(newRow[colName]);
            if (diffs[colName]) {
                colValue = JSON.stringify(diffs[colName]);
            }
            plv8.execute(
                "INSERT INTO pzero.audits (txn_id, mmn, rowid, cno, cval ) VALUES ($1, $2, $3, $4, $5)",
                [txid, mmn, id, colNo, colValue]
            );
        }
    }
    return newRow; // For INSERT and UPDATE triggers, return the new row
$$;

CREATE OR REPLACE FUNCTION pzero.audit_threads_trigger_plv8 () returns trigger language plv8 AS $$
    var txid = plv8.execute("SELECT txid_current()")[0].txid_current;
    var tableName = TD.table_name;
    if (TD.event === 'UPDATE' || TD.event === 'DELETE') {
        plv8.elog('Update or Delete on threads not allowed')
        throw 'Update or Delete on threads not allowed'
    }
    var newRow = TD.new; // Available for INSERT and UPDATE
    var data = newRow.data;
    if (data) {
        data = JSON.parse(data)
        if (data.meta) {
            delete data.meta;
        }
    }
    try {
        result = plv8.execute("select pzero.gen_monotonic_id() as id");
        id = result[0]['id']
        newRow.id = id;
    } catch() {
        plv8.elog('Unable to gen id');
        throw 'Unable to gen id'
    }
    if (!newRow.root_id) {
        newRow.root_id = id;
    }
    return newRow;
$$;

function pzero.relations_lookup_plv8 (relation intger) returns jsonb AS $$
    if (plv8.relations_cache === undefined) {
        plv8.relationships = {
            'parent_child': 'parent_child',
            'peer': 'peer',
            'related_object': 'related_object',
            'admined_by': 'admined_by',
            'member': 'member',
            'billing_to': 'billing_to',
            'owned_by': 'owned_by',
            'created_by': 'created_by',
            'linked_object': 'linked_object',
            'root_object': 'root_object',
            'replaced_object': 'replaced_object',
            'site_admin': 'site_admin',
            'super_admin': 'super_admin'
        }
        var relationships = plv8.relationships;
        plv8.relations_cache = {};
        plv8.reverse_relations_cache = {};

        for (var i = 0; i <= Object.keys(relationships).length; i++) {
            var key = 1 << i;
            var relation = relationships[Object.keys(relationships)[i]];
            plv8.relations_cache[key] = relation;
            plv8.reverse_relations_cache[relation] = key;
        }
    }
$$ language plv8 immutable strict;

function pzero.check_relations_plv8 () returns trigger language plv8 AS $$
    var newRow = TD.new; // Available for INSERT and UPDATE
    var oldRow = TD.old; // Available for UPDATE
    if (TD.event === 'DELETE') {
        throw 'Cannot delete relationship records';
    }
    if (TD.event === 'UPDATE') {
        if (oldRow.uuid1 !== newRow.uuid1 || oldRow.uuid2 !== newRow.uuid2) {
            throw 'Cannot modify parent_id, child_id, or relation_type of existing relationship';
        }
    }
    if (TD.event !== 'INSERT') {
        const uuid1_parts = newRow.uuid1.split('-');
        const uuid2_parts = newRow.uuid2.split('-');
        if (uuid1_parts.length !== 2 || uuid2_parts.length !== 2) {
            throw 'Invalid UUID format for uuid1 or uuid2';
        }
        var mmn1 = uuid1_parts[0];
        var mmn2 = uuid2_parts[0];
        var table1 = pzero.get_table_name(mmn1);
        var table2 = pzero.get_table_name(mmn2);
        if (!table1 || !table2) {
            throw 'Unable to resolve table names from MMNs';
        }
    }
    var parent_id = newRow.parent_id;
    var child_id = newRow.child_id;
    var relation_type = newRow.relation_type;
    if (!parent_id || !child_id || !relation_type) {
        throw 'parent_id, child_id, and relation_type are required';
    }
    var result = plv8.execute("SELECT 1 FROM pzero.relations WHERE parent_id = $1 AND child_id = $2 AND relation_type = $3", [child_id, parent_id, relation_type]);
    if (result.length > 0) {
        throw 'Cyclic relationship detected';
    }
    return newRow;
$$;

CREATE FUNCTION pzero.check_relations_trigger () returns trigger AS $$
BEGIN
    PERFORM pzero.check_relations_plv8(); -- Calls check_relations_plv8
    PERFORM pzero.audit_trigger_plv8(); -- Calls audit_trigger_plv8
        -- ... other logic or function calls
    RETURN NEW; -- Or OLD, or NULL depending on trigger type
END;
$$ language plpgsql;

CREATE OR REPLACE FUNCTION pzero.create_triggers_plv8 () returns void AS $$
  CREATE TRIGGER pzero.trigger_check_relations BEFORE INSERT OR UPDATE ON pzero.relations
        FOR EACH ROW EXECUTE FUNCTION pzero.check_relations_trigger();
  var tables = ['pzero.all_devices', 'pzero.all_endpoints', 'pzero.all_sessions', 'pzero.all_orgs', 'pzero.all_auth', 'pzero.all_users'];
  // Define a name for the new trigger.
  for (var i = 0; i < tables.length; i++) {
    var target_table = tables[i];
  // Build the dynamic CREATE TRIGGER statement
    var sql = `CREATE TRIGGER pzero.audit_trigger_${target_table}` +
            ' BEFORE INSERT OR UPDATE OR DELETE ON ' + target_table +
            ' FOR EACH ROW EXECUTE FUNCTION pzero.audit_trigger_plv8()';

  // Execute the dynamic SQL using plv8.execute().
    plv8.execute(sql);
    plv8.elog(NOTICE, 'Created trigger ' + trigger_name + ' on table ' + target_table);
  }
   var sql = `CREATE TRIGGER pzero.audit_trigger_threads` +
            ' BEFORE INSERT OR UPDATE OR DELETE ON ' + pzero.threads +
            ' FOR EACH ROW EXECUTE FUNCTION pzero.audit_threads_trigger_plv8()';

  // Execute the dynamic SQL using plv8.execute().
    plv8.execute(sql);
    plv8.elog(NOTICE, 'Created trigger ' + trigger_name + ' on table ' + target_table);

$$ language plv8;

SELECT
  pzero.create_triggers_plv8 ();
