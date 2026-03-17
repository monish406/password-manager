from flask import Blueprint, request, jsonify, g
from werkzeug.security import check_password_hash
from functools import wraps

from routers.user_model import UserModel

users_bp = Blueprint("users", __name__, url_prefix="/users")


# ══════════════════════════════════════════════════════════
#  LOAD SESSION → g  (runs before every request in the app)
# ══════════════════════════════════════════════════════════

@users_bp.before_app_request
def load_user_from_headers():
    uid  = request.headers.get("X-User-Id")
    role = request.headers.get("X-User-Role", "user")
    g.user_id   = int(uid) if uid and uid.isdigit() else None
    g.user_role = role if role and role not in ("undefined", "null", "") else "user"


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


def _is_self_or_admin(user_id: int) -> bool:
    return (
        getattr(g, "user_role", "") == "admin"
        or getattr(g, "user_id", None) == user_id
    )


# ══════════════════════════════════════════════════════════
#  INIT DB  –  POST /users/init
# ══════════════════════════════════════════════════════════

@users_bp.route("/init", methods=["POST"])
def init_db():
    result = UserModel.initialize_database()
    status = 200 if "message" in result else 500
    return jsonify(result), status


# ══════════════════════════════════════════════════════════
#  REGISTER  –  POST /users/register
# ══════════════════════════════════════════════════════════

@users_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}

    name     = (data.get("name") or data.get("full_name") or "").strip()
    username = (data.get("username") or "").strip()
    email    = (data.get("email")    or "").strip()
    password = (data.get("password") or "").strip()
    role     = (data.get("role")     or "user").strip()

    if not name:
        return jsonify({"error": "name is required"}), 400
    if not username:
        return jsonify({"error": "username is required"}), 400
    if not email:
        return jsonify({"error": "email is required"}), 400
    if not password:
        return jsonify({"error": "password is required"}), 400

    if role != "user" and getattr(g, "user_role", "") != "admin":
        role = "user"

    result = UserModel.create_user(name, username, email, password, role)
    status = 201 if "message" in result else 400
    return jsonify(result), status


# ══════════════════════════════════════════════════════════
#  LOGIN  –  POST /users/login
# ══════════════════════════════════════════════════════════

@users_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}

    identifier = (
        data.get("identifier") or
        data.get("email")      or
        data.get("username")   or ""
    ).strip()
    password = (data.get("password") or "").strip()

    if not identifier:
        return jsonify({"error": "Email or username is required"}), 400
    if not password:
        return jsonify({"error": "Password is required"}), 400

    # row = (id, name, username, email, password_hash, role)
    row = UserModel.get_user_by_identifier(identifier)

    if row is None:
        return jsonify({"error": "Invalid credentials"}), 401

    if not check_password_hash(row[4], password):
        return jsonify({"error": "Invalid credentials"}), 401

    return jsonify({
        "message": "Login successful",
        "user": {
            "id":       row[0],
            "name":     row[1],
            "username": row[2],
            "email":    row[3],
            "role":     row[5],
        },
    }), 200


# ══════════════════════════════════════════════════════════
#  LOGOUT  –  POST /users/logout
# ══════════════════════════════════════════════════════════

@users_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    return jsonify({"message": "Logged out successfully"}), 200


# ══════════════════════════════════════════════════════════
#  LIST ALL USERS  –  GET /users/   (admin only)
# ══════════════════════════════════════════════════════════

@users_bp.route("/", methods=["GET"])
@admin_required
def list_users():
    result = UserModel.get_all_users()
    if isinstance(result, dict) and "error" in result:
        return jsonify(result), 500
    return jsonify(result), 200


# ══════════════════════════════════════════════════════════
#  GET ONE USER  –  GET /users/<id>
# ══════════════════════════════════════════════════════════

@users_bp.route("/<int:user_id>", methods=["GET"])
@login_required
def get_user(user_id: int):
    if not _is_self_or_admin(user_id):
        return jsonify({"error": "Forbidden"}), 403

    row = UserModel.get_user_by_id(user_id)
    if row is None:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "id":         row[0],
        "name":       row[1],
        "username":   row[2],
        "email":      row[3],
        "role":       row[5],
        "created_at": str(row[6]),
    }), 200


# ══════════════════════════════════════════════════════════
#  UPDATE USER  –  PUT /users/<id>
# ══════════════════════════════════════════════════════════

@users_bp.route("/<int:user_id>", methods=["PUT"])
@login_required
def update_user(user_id: int):
    if not _is_self_or_admin(user_id):
        return jsonify({"error": "Forbidden"}), 403

    data    = request.get_json(silent=True) or {}
    allowed = {"name", "full_name", "username", "email", "password", "role"}
    fields  = {k: v for k, v in data.items() if k in allowed and v}

    if "role" in fields and getattr(g, "user_role", "") != "admin":
        del fields["role"]

    if not fields:
        return jsonify({"error": "No valid fields provided"}), 400

    result = UserModel.update_user(user_id, fields)
    status = 200 if "message" in result else 400
    return jsonify(result), status


# ══════════════════════════════════════════════════════════
#  DELETE USER  –  DELETE /users/<id>
# ══════════════════════════════════════════════════════════

@users_bp.route("/<int:user_id>", methods=["DELETE"])
@login_required
def delete_user(user_id: int):
    if not _is_self_or_admin(user_id):
        return jsonify({"error": "Forbidden"}), 403

    result = UserModel.delete_user(user_id)
    status = 200 if "message" in result else 404
    return jsonify(result), status