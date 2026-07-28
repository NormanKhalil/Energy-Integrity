import os
import sys

from flask import Flask
from flask_cors import CORS

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from backend.routes.dashboard import dashboard_bp
from backend.routes.predict import predict_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
app.register_blueprint(predict_bp, url_prefix="/api/predict")

if __name__ == "__main__":
    app.run(debug=True, port=5000)
