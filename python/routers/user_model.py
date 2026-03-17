import mysql.connector as mysql_connector
from werkzeug.security import generate_password_hash

DB_CONFIG = {
    "host":     "localhost",
    "user":     "root",
    "password": "111111",
    "database": "user_management",
}

# Column order: id, name, username, email, password, role, created_at


def get_connection():
    return mysql_connector.connect(**DB_CONFIG)


# ══════════════════════════════════════════════════════════
#  AUTO-MIGRATE: runs once when the module is first imported
# ══════════════════════════════════════════════════════════

def _auto_migrate():
    try:
        conn = mysql_connector.connect(
            host=DB_CONFIG["host"],
            user=DB_CONFIG["user"],
            password=DB_CONFIG["password"],
        )
        cursor = conn.cursor()

        cursor.execute("CREATE DATABASE IF NOT EXISTS user_management")
        cursor.execute("USE user_management")
        conn.commit()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id         INT AUTO_INCREMENT PRIMARY KEY,
                name       VARCHAR(120) NOT NULL,
                username   VARCHAR(80)  NOT NULL UNIQUE,
                email      VARCHAR(120) NOT NULL UNIQUE,
                password   VARCHAR(255) NOT NULL,
                role       VARCHAR(20)  NOT NULL DEFAULT 'user',
                created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()

        cursor.execute("SHOW COLUMNS FROM users")
        existing_cols = {row[0] for row in cursor.fetchall()}

        if "role" not in existing_cols:
            cursor.execute(
                "ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'"
            )
            conn.commit()
            print("[user_model] ✅ Added missing column: role")

        if "created_at" not in existing_cols:
            cursor.execute(
                "ALTER TABLE users ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
            )
            conn.commit()
            print("[user_model] ✅ Added missing column: created_at")

        if "full_name" in existing_cols and "name" not in existing_cols:
            cursor.execute(
                "ALTER TABLE users CHANGE full_name name VARCHAR(120) NOT NULL"
            )
            conn.commit()
            print("[user_model] ✅ Renamed column: full_name → name")

        cursor.close()
        conn.close()
        print("[user_model] ✅ Migration complete")
    except mysql_connector.Error as e:
        print(f"[user_model] ❌ Migration error: {e}")
        raise


_auto_migrate()


class UserModel:

    @staticmethod
    def initialize_database():
        _auto_migrate()
        return {"message": "Database initialized successfully"}

    @staticmethod
    def create_user(name, username, email, password, role="user"):
        try:
            hashed_pw = generate_password_hash(password)
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO users (name, username, email, password, role) "
                "VALUES (%s, %s, %s, %s, %s)",
                (name, username, email, hashed_pw, role),
            )
            conn.commit()
            new_id = cursor.lastrowid
            cursor.close()
            conn.close()
            return {"message": "User stored successfully", "id": new_id}
        except mysql_connector.IntegrityError as e:
            if "username" in str(e):
                return {"error": "Username already exists"}
            if "email" in str(e):
                return {"error": "Email already exists"}
            return {"error": str(e)}
        except mysql_connector.Error as e:
            return {"error": str(e)}

    @staticmethod
    def get_user_by_identifier(identifier):
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, name, username, email, password, role "
                "FROM users WHERE username = %s OR email = %s",
                (identifier, identifier),
            )
            row = cursor.fetchone()
            cursor.close()
            conn.close()
            return row
        except mysql_connector.Error:
            return None

    @staticmethod
    def get_user_by_username(username):
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, name, username, email, password, role "
                "FROM users WHERE username = %s",
                (username,),
            )
            row = cursor.fetchone()
            cursor.close()
            conn.close()
            return row
        except mysql_connector.Error:
            return None

    @staticmethod
    def get_user_by_id(user_id):
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, name, username, email, password, role, created_at "
                "FROM users WHERE id = %s",
                (user_id,),
            )
            row = cursor.fetchone()
            cursor.close()
            conn.close()
            return row
        except mysql_connector.Error:
            return None

    @staticmethod
    def get_all_users():
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, name, username, email, role, created_at FROM users"
            )
            rows = cursor.fetchall()
            cursor.close()
            conn.close()
            return [
                {
                    "id":         r[0],
                    "name":       r[1],
                    "username":   r[2],
                    "email":      r[3],
                    "role":       r[4],
                    "created_at": str(r[5]),
                }
                for r in rows
            ]
        except mysql_connector.Error as e:
            return {"error": str(e)}

    @staticmethod
    def update_user(user_id, fields: dict):
        allowed = {"name", "username", "email", "password", "role"}
        if "full_name" in fields and "name" not in fields:
            fields["name"] = fields.pop("full_name")
        updates = {k: v for k, v in fields.items() if k in allowed and v}
        if not updates:
            return {"error": "No valid fields to update"}
        if "password" in updates:
            updates["password"] = generate_password_hash(updates["password"])
        set_clause = ", ".join(f"{col} = %s" for col in updates)
        values = list(updates.values()) + [user_id]
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute(f"UPDATE users SET {set_clause} WHERE id = %s", values)
            conn.commit()
            affected = cursor.rowcount
            cursor.close()
            conn.close()
            if affected:
                return {"message": "User updated successfully"}
            return {"error": "User not found"}
        except mysql_connector.IntegrityError as e:
            if "username" in str(e):
                return {"error": "Username already taken"}
            if "email" in str(e):
                return {"error": "Email already taken"}
            return {"error": str(e)}
        except mysql_connector.Error as e:
            return {"error": str(e)}

    @staticmethod
    def delete_user(user_id):
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
            conn.commit()
            affected = cursor.rowcount
            cursor.close()
            conn.close()
            if affected:
                return {"message": "User deleted successfully"}
            return {"error": "User not found"}
        except mysql_connector.Error as e:
            return {"error": str(e)}