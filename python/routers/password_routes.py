from flask import Blueprint, request, jsonify, g
from werkzeug.security import check_password_hash
from functools import wraps

from routers.password_model import (
    create_password_entry,
    get_all_passwords,
    get_password_by_id,
    get_raw_password_row,
    update_password_entry,
    delete_password_entry,
)
from routers.user_model import UserModel

passwords_bp = Blueprint("passwords", __name__, url_prefix="/passwords")


# ══════════════════════════════════════════════════════════
#  LOAD AUTH FROM HEADERS
# ══════════════════════════════════════════════════════════

@passwords_bp.before_app_request
def load_user_from_headers():
    uid  = request.headers.get("X-User-Id")
    role = request.headers.get("X-User-Role", "user")
    g.user_id   = int(uid) if uid and uid.isdigit() else None
    g.user_role = role


# ══════════════════════════════════════════════════════════
#  AUTH GUARDS
# ══════════════════════════════════════════════════════════

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not getattr(g, "user_id", None):
            return jsonify({"error": "Authentication required"}), 401
        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not getattr(g, "user_id", None):
            return jsonify({"error": "Authentication required"}), 401
        if getattr(g, "user_role", "") != "admin":
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)
    return decorated


def _owns_entry(entry: dict) -> bool:
    """True if the current user owns this entry OR is an admin.
    Used for read/edit/delete — NOT for reveal."""
    return (
        getattr(g, "user_role", "") == "admin"
        or entry["user_id"] == getattr(g, "user_id", None)
    )


def _is_owner_only(entry: dict) -> bool:
    """True ONLY if the current user is the entry owner.
    Admins are intentionally excluded — used for password reveal."""
    return entry["user_id"] == getattr(g, "user_id", None)


# ══════════════════════════════════════════════════════════
#  CREATE  –  POST /passwords/
# ══════════════════════════════════════════════════════════

@passwords_bp.route("/", methods=["POST"])
@login_required
def create_entry():
    data = request.get_json(silent=True) or {}
    title    = (data.get("title") or "").strip()
    password = (data.get("password") or "").strip()

    if not title:
        return jsonify({"error": "title is required"}), 400
    if not password:
        return jsonify({"error": "password is required"}), 400

    entry = create_password_entry(
        user_id  = g.user_id,
        title    = title,
        password = password,
        username = data.get("username", ""),
        url      = data.get("url", ""),
        notes    = data.get("notes", ""),
    )
    if entry is None:
        return jsonify({"error": "Failed to create entry"}), 500
    return jsonify(entry), 201


# ══════════════════════════════════════════════════════════
#  LIST  –  GET /passwords/
# ══════════════════════════════════════════════════════════

@passwords_bp.route("/", methods=["GET"])
@login_required
def list_entries():
    role    = getattr(g, "user_role", "user")
    user_id = g.user_id

    if role == "admin":
        requested_uid = request.args.get("user_id", type=int)
        if requested_uid is not None:
            entries = get_all_passwords(user_id=requested_uid)
        else:
            entries = get_all_passwords(user_id=None)

        # Enrich each entry with the owner's name and role for display
        all_users = UserModel.get_all_users() or []
        user_map: dict = {}
        for u in all_users:
            if isinstance(u, dict):
                user_map[u["id"]] = {"name": u.get("name", "Unknown"), "role": u.get("role", "user")}
            else:
                user_map[u[0]] = {"name": u[1] or "Unknown", "role": u[5] or "user"}

        for entry in entries:
            owner = user_map.get(entry["user_id"], {})
            entry["owner_name"] = owner.get("name", "Unknown")
            entry["owner_role"] = owner.get("role", "user")
            # Mark whether the current admin owns this entry — used by
            # the frontend to decide if Reveal is allowed.
            entry["is_owner"] = (entry["user_id"] == user_id)
    else:
        entries = get_all_passwords(user_id=user_id)
        for entry in entries:
            entry["is_owner"] = True  # regular users always own their own entries

    return jsonify(entries), 200


# ══════════════════════════════════════════════════════════
#  GET ONE  –  GET /passwords/<id>
# ══════════════════════════════════════════════════════════

@passwords_bp.route("/<int:entry_id>", methods=["GET"])
@login_required
def get_entry(entry_id: int):
    entry = get_password_by_id(entry_id)
    if entry is None:
        return jsonify({"error": "Entry not found"}), 404
    if not _owns_entry(entry):
        return jsonify({"error": "Forbidden"}), 403
    return jsonify(entry), 200


# ══════════════════════════════════════════════════════════
#  REVEAL  –  POST /passwords/<id>/reveal
#
#  SECURITY RULE: Only the password OWNER can reveal.
#  Admins who do not own the entry are explicitly rejected,
#  even if they supply a valid master password. This ensures
#  passwords are always private to their creator.
# ══════════════════════════════════════════════════════════

@passwords_bp.route("/<int:entry_id>/reveal", methods=["POST"])
@login_required
def reveal_entry(entry_id: int):
    data            = request.get_json(silent=True) or {}
    master_password = (data.get("master_password") or "").strip()

    if not master_password:
        return jsonify({"error": "master_password is required"}), 400

    entry = get_password_by_id(entry_id)
    if entry is None:
        return jsonify({"error": "Entry not found"}), 404

    # ── OWNER-ONLY CHECK ──────────────────────────────────
    # Admins can see metadata but cannot decrypt another user's password.
    if not _is_owner_only(entry):
        return jsonify({
            "error": "Access denied — you can only reveal your own passwords"
        }), 403

    # Verify the caller's own account password (master password)
    user_row = UserModel.get_user_by_id(g.user_id)
    if user_row is None:
        return jsonify({"error": "Authenticated user not found"}), 404
    if not check_password_hash(user_row[4], master_password):
        return jsonify({"error": "Invalid master password"}), 401

    raw = get_raw_password_row(entry_id)
    if raw is None:
        return jsonify({"error": "Entry not found"}), 404

    return jsonify({"password": raw["password"]}), 200


# ══════════════════════════════════════════════════════════
#  UPDATE  –  PUT /passwords/<id>
# ══════════════════════════════════════════════════════════

@passwords_bp.route("/<int:entry_id>", methods=["PUT"])
@login_required
def update_entry(entry_id: int):
    entry = get_password_by_id(entry_id)
    if entry is None:
        return jsonify({"error": "Entry not found"}), 404
    if not _owns_entry(entry):
        return jsonify({"error": "Forbidden"}), 403

    data    = request.get_json(silent=True) or {}
    allowed = {"title", "username", "url", "notes", "password"}
    fields  = {k: v for k, v in data.items() if k in allowed and v is not None}

    if not fields:
        return jsonify({"error": "No valid fields provided"}), 400

    updated = update_password_entry(entry_id, fields)
    if updated is None:
        return jsonify({"error": "Update failed"}), 500
    return jsonify(updated), 200


# ══════════════════════════════════════════════════════════
#  DELETE  –  DELETE /passwords/<id>
# ══════════════════════════════════════════════════════════

@passwords_bp.route("/<int:entry_id>", methods=["DELETE"])
@login_required
def delete_entry(entry_id: int):
    entry = get_password_by_id(entry_id)
    if entry is None:
        return jsonify({"error": "Entry not found"}), 404
    if not _owns_entry(entry):
        return jsonify({"error": "Forbidden"}), 403

    deleted = delete_password_entry(entry_id)
    if not deleted:
        return jsonify({"error": "Delete failed"}), 500
    return jsonify({"message": "Entry deleted successfully"}), 200