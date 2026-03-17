import os
import base64
import hashlib
import mysql.connector as mysql_connector
from cryptography.fernet import Fernet

from routers.user_model import DB_CONFIG

# Column order: id, user_id, title, username, url, notes, password, created_at, updated_at

# ── Reversible Fernet encryption ───────────────────────────────────────────────
# Set FERNET_KEY env var (generate once: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
# Falls back to deriving a key from SECRET_KEY for dev — CHANGE IN PRODUCTION
_raw_key = os.environ.get("FERNET_KEY", "")
if _raw_key:
    _fernet = Fernet(_raw_key.encode())
else:
    _dev_secret = os.environ.get("SECRET_KEY", "rootxwire-dev-secret-change-me").encode()
    _key_bytes  = base64.urlsafe_b64encode(hashlib.sha256(_dev_secret).digest())
    _fernet     = Fernet(_key_bytes)


def encrypt_password(plain: str) -> str:
    """Encrypt plain-text password for storage."""
    return _fernet.encrypt(plain.encode()).decode()


def decrypt_password(token: str) -> str:
    """Decrypt stored password token back to plain text."""
    try:
        return _fernet.decrypt(token.encode()).decode()
    except Exception:
        # Legacy row stored as a one-way hash — cannot recover, return as-is
        return token


def get_connection():
    return mysql_connector.connect(**DB_CONFIG)


def _auto_migrate():
    try:
        conn   = get_connection()
        cursor = conn.cursor()

        # ── Drop ALL foreign key constraints on passwords ──────────────────────
        try:
            cursor.execute("SHOW CREATE TABLE passwords")
            row = cursor.fetchone()
            if row:
                import re
                fk_names = re.findall(r"CONSTRAINT `([^`]+)` FOREIGN KEY", row[1])
                for fk in fk_names:
                    cursor.execute(f"ALTER TABLE passwords DROP FOREIGN KEY `{fk}`")
                    conn.commit()
                    print(f"[password_model] ✅ Dropped FK: {fk}")
        except mysql_connector.Error:
            pass  # table doesn't exist yet

        # ── Create table fresh (no FK) ─────────────────────────────────────────
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS passwords (
                id             INT           AUTO_INCREMENT PRIMARY KEY,
                user_id        INT           NOT NULL,
                title          VARCHAR(255)  NOT NULL,
                username       VARCHAR(255)  DEFAULT '',
                url            VARCHAR(500)  DEFAULT '',
                notes          VARCHAR(1000) DEFAULT '',
                password       VARCHAR(512)  NOT NULL,
                plain_password TEXT          DEFAULT NULL,
                created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                       ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id)
            )
        """)
        conn.commit()

        # ── Inspect existing columns ───────────────────────────────────────────
        cursor.execute("SHOW COLUMNS FROM passwords")
        existing_cols = {row[0] for row in cursor.fetchall()}

        # ── Rename legacy column names → title ────────────────────────────────
        for old_col in ("platform", "name", "site"):
            if old_col in existing_cols and "title" not in existing_cols:
                cursor.execute(
                    f"ALTER TABLE passwords CHANGE `{old_col}` title VARCHAR(255) NOT NULL"
                )
                conn.commit()
                existing_cols.add("title")
                existing_cols.discard(old_col)
                print(f"[password_model] ✅ Renamed: {old_col} → title")

        # ── Add missing columns ────────────────────────────────────────────────
        col_migrations = [
            ("title",          "ALTER TABLE passwords ADD COLUMN title          VARCHAR(255)  NOT NULL DEFAULT ''"),
            ("username",       "ALTER TABLE passwords ADD COLUMN username       VARCHAR(255)  DEFAULT ''"),
            ("url",            "ALTER TABLE passwords ADD COLUMN url            VARCHAR(500)  DEFAULT ''"),
            ("notes",          "ALTER TABLE passwords ADD COLUMN notes          VARCHAR(1000) DEFAULT ''"),
            ("updated_at",     "ALTER TABLE passwords ADD COLUMN updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
            ("plain_password", "ALTER TABLE passwords ADD COLUMN plain_password TEXT DEFAULT NULL"),
        ]
        for col, sql in col_migrations:
            if col not in existing_cols:
                cursor.execute(sql)
                conn.commit()
                print(f"[password_model] ✅ Added column: {col}")

        cursor.close()
        conn.close()
        print("[password_model] ✅ Migration complete")

    except mysql_connector.Error as e:
        print(f"[password_model] ❌ Migration error: {e}")
        raise


_auto_migrate()


# ══════════════════════════════════════════════════════════
#  SERIALISER
# ══════════════════════════════════════════════════════════

def _serialize(row: tuple) -> dict:
    # row: id, user_id, title, username, url, notes, password, plain_password, created_at, updated_at
    return {
        "id":         row[0],
        "user_id":    row[1],
        "title":      row[2],
        "username":   row[3] or "",
        "url":        row[4] or "",
        "notes":      row[5] or "",
        # row[6] = hashed/encrypted password — excluded
        # row[7] = plain_password — excluded from list
        "created_at": str(row[8]) if row[8] else None,
        "updated_at": str(row[9]) if row[9] else None,
    }


# ══════════════════════════════════════════════════════════
#  CREATE
# ══════════════════════════════════════════════════════════

def create_password_entry(user_id: int, title: str, password: str,
                          username: str = "", url: str = "",
                          notes: str = "") -> dict | None:
    encrypted_pw       = encrypt_password(password)   # for password column
    encrypted_plain_pw = encrypt_password(password)   # for plain_password column — also encrypted
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO passwords (user_id, title, username, url, notes, password, plain_password) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (user_id, title, username, url, notes, encrypted_pw, encrypted_plain_pw),
        )
        conn.commit()
        new_id = cursor.lastrowid
        cursor.execute(
            "SELECT id, user_id, title, username, url, notes, password, plain_password, created_at, updated_at "
            "FROM passwords WHERE id = %s", (new_id,)
        )
        row = cursor.fetchone()
        cursor.close()
        conn.close()
        return _serialize(row) if row else None
    except mysql_connector.Error as e:
        print(f"[password_model] ❌ create_password_entry: {e}")
        return None


# ══════════════════════════════════════════════════════════
#  READ
# ══════════════════════════════════════════════════════════

def get_all_passwords(user_id: int | None = None) -> list[dict]:
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        if user_id is None:
            cursor.execute(
                "SELECT id, user_id, title, username, url, notes, password, plain_password, created_at, updated_at "
                "FROM passwords ORDER BY created_at DESC"
            )
        else:
            cursor.execute(
                "SELECT id, user_id, title, username, url, notes, password, plain_password, created_at, updated_at "
                "FROM passwords WHERE user_id = %s ORDER BY created_at DESC", (user_id,)
            )
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return [_serialize(r) for r in rows]
    except mysql_connector.Error as e:
        print(f"[password_model] ❌ get_all_passwords: {e}")
        return []


def get_password_by_id(entry_id: int) -> dict | None:
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, user_id, title, username, url, notes, password, plain_password, created_at, updated_at "
            "FROM passwords WHERE id = %s", (entry_id,)
        )
        row = cursor.fetchone()
        cursor.close()
        conn.close()
        return _serialize(row) if row else None
    except mysql_connector.Error as e:
        print(f"[password_model] ❌ get_password_by_id: {e}")
        return None


def get_raw_password_row(entry_id: int) -> dict | None:
    """Returns the entry with the plain-text password for reveal."""
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, user_id, title, username, url, notes, password, plain_password, created_at, updated_at "
            "FROM passwords WHERE id = %s", (entry_id,)
        )
        row = cursor.fetchone()
        cursor.close()
        conn.close()
        if row is None:
            return None

        # row[7] = plain_password (Fernet-encrypted for new entries)
        # row[6] = password column (also Fernet-encrypted)
        plain = None
        if row[7]:
            plain = decrypt_password(row[7])   # decrypt the plain_password column
        if not plain or plain.startswith("scrypt:") or plain.startswith("pbkdf2:"):
            plain = decrypt_password(row[6])   # fallback to password column

        return {
            "id": row[0], "user_id": row[1], "title": row[2],
            "username": row[3] or "", "url": row[4] or "", "notes": row[5] or "",
            "password": plain or "⚠️ Password was stored as a hash and cannot be recovered. Please re-save this entry.",
            "created_at": str(row[8]) if row[8] else None,
            "updated_at": str(row[9]) if row[9] else None,
        }
    except mysql_connector.Error as e:
        print(f"[password_model] ❌ get_raw_password_row: {e}")
        return None


# ══════════════════════════════════════════════════════════
#  UPDATE
# ══════════════════════════════════════════════════════════

def update_password_entry(entry_id: int, fields: dict) -> dict | None:
    if not fields:
        return None
    if "password" in fields:
        plain = fields["password"]
        fields["password"]       = encrypt_password(plain)
        fields["plain_password"] = encrypt_password(plain)   # encrypted, not plain text
    set_clause = ", ".join(f"{col} = %s" for col in fields)
    values     = list(fields.values()) + [entry_id]
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute(f"UPDATE passwords SET {set_clause} WHERE id = %s", values)
        conn.commit()
        cursor.execute(
            "SELECT id, user_id, title, username, url, notes, password, plain_password, created_at, updated_at "
            "FROM passwords WHERE id = %s", (entry_id,)
        )
        updated = cursor.fetchone()
        cursor.close()
        conn.close()
        return _serialize(updated) if updated else None
    except mysql_connector.Error as e:
        print(f"[password_model] ❌ update_password_entry: {e}")
        return None


# ══════════════════════════════════════════════════════════
#  DELETE
# ══════════════════════════════════════════════════════════

def delete_password_entry(entry_id: int) -> bool:
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM passwords WHERE id = %s", (entry_id,))
        conn.commit()
        affected = cursor.rowcount
        cursor.close()
        conn.close()
        return affected > 0
    except mysql_connector.Error as e:
        print(f"[password_model] ❌ delete_password_entry: {e}")
        return False