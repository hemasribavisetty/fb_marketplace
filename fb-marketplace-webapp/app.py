"""
FB Marketplace Helper - Web App
Serves the UI. Gemini API is called directly from the browser (avoids Python segfault on macOS).
"""
import os

from flask import Flask, Response, jsonify, render_template, request

app = Flask(__name__)


@app.after_request
def add_cors(resp):
    resp.headers["Access-Control-Allow-Origin"] = "*"
    return resp
app.secret_key = os.urandom(24)

# In-memory store for the extension
_payload = {"message": "", "searchKeyword": "", "maxPrice": None, "minPrice": None}


@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not found"}), 404


@app.route("/favicon.ico")
def favicon():
    return Response(status=204)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/store-message", methods=["POST"])
def store_message():
    """Store message and search params for the extension."""
    global _payload
    data = request.get_json(silent=True) or {}
    _payload = {
        "message": data.get("message", ""),
        "searchKeyword": data.get("searchKeyword", ""),
        "maxPrice": data.get("maxPrice"),
        "minPrice": data.get("minPrice"),
    }
    return jsonify({"success": True})


@app.route("/api/latest-message")
def latest_message():
    """Return the full payload (used by the sender extension)."""
    return jsonify(_payload)


if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=False, port=5001)
