import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from flask import Flask, jsonify
from flask_cors import CORS

from routers.user_routes import users_bp
from routers.password_routes import passwords_bp

app = Flask(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
app.config["SECRET_KEY"] = "your-secret-key-change-in-production"

# ── CORS ──────────────────────────────────────────────────────────────────────
CORS(
    app,
    resources={r"/*": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000"]}},
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=[
        "Content-Type", "Authorization", "X-Requested-With",
        "X-User-Id", "X-User-Role",
    ],
    supports_credentials=True,
    expose_headers=["Content-Type"],
)

# ── Explicit OPTIONS preflight handler (fixes CORS for all routes) ────────────
@app.before_request
def handle_preflight():
    from flask import request, Response
    if request.method == "OPTIONS":
        res = Response()
        origin = request.headers.get("Origin", "http://localhost:3000")
        res.headers["Access-Control-Allow-Origin"]      = origin
        res.headers["Access-Control-Allow-Methods"]     = "GET, POST, PUT, DELETE, OPTIONS"
        res.headers["Access-Control-Allow-Headers"]     = "Content-Type, Authorization, X-Requested-With, X-User-Id, X-User-Role"
        res.headers["Access-Control-Allow-Credentials"] = "true"
        res.headers["Access-Control-Max-Age"]           = "3600"
        return res, 200

@app.after_request
def add_cors_headers(response):
    from flask import request
    origin = request.headers.get("Origin", "http://localhost:3000")
    allowed = ["http://localhost:3000", "http://127.0.0.1:3000"]
    if origin in allowed:
        response.headers["Access-Control-Allow-Origin"]      = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"]     = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"]     = "Content-Type, Authorization, X-Requested-With, X-User-Id, X-User-Role"
    return response

# ── Blueprints ────────────────────────────────────────────────────────────────
app.register_blueprint(users_bp)
app.register_blueprint(passwords_bp)

# ── Seed Data ─────────────────────────────────────────────────────────────────
SEED_USERS = [
    ("Alice Johnson",  "alice", "alice@nexus.io", "Alice@123",  "admin"),
    ("Bob Smith",      "bob",   "bob@nexus.io",   "Bob@123",    "user"),
    ("Carol Williams", "carol", "carol@nexus.io", "Carol@123",  "user"),
    ("David Brown",    "david", "david@nexus.io", "David@123",  "user"),
    ("Eva Brown",      "eva",   "eva@nexus.io",   "Eva@123",    "user"),
]

# ── Health ────────────────────────────────────────────────────────────────────
@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Backend Running Successfully"}), 200


# ── DB test ───────────────────────────────────────────────────────────────────
@app.route("/db-test", methods=["GET"])
def db_test():
    try:
        from routers.user_model import get_connection
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.close()
        conn.close()
        return jsonify({"db_connection": "ok"}), 200
    except Exception as e:
        return jsonify({"db_connection": "error", "details": str(e)}), 500


# ── Seed Users (skips existing by email) ──────────────────────────────────────
# Visit: GET http://localhost:5000/seed-users
@app.route("/seed-users", methods=["GET"])
def seed_users():
    try:
        from routers.user_model import UserModel
        inserted = []
        skipped  = []
        for name, username, email, password, role in SEED_USERS:
            existing = UserModel.get_user_by_identifier(email)
            if existing:
                skipped.append(email)
                continue
            result = UserModel.create_user(name, username, email, password, role)
            if "message" in result:
                inserted.append(email)
            else:
                skipped.append(f"{email} (error: {result.get('error')})")
        return jsonify({
            "message": "Seed complete",
            "inserted": inserted,
            "skipped":  skipped,
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Force Re-Seed ─────────────────────────────────────────────────────────────
# Visit: GET http://localhost:5000/force-seed
# WARNING: Deletes ALL users and re-inserts with fresh hashes!
@app.route("/force-seed", methods=["GET"])
def force_seed():
    try:
        from routers.user_model import UserModel, get_connection
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users")
        conn.commit()
        cursor.close()
        conn.close()

        results = []
        for name, username, email, password, role in SEED_USERS:
            result = UserModel.create_user(name, username, email, password, role)
            results.append({"email": email, "result": result})
        return jsonify({"message": "Force seed complete", "results": results}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=True, port=5000)