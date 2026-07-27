from flask import Flask
from flask_cors import CORS
from routes.dashboard import dashboard_bp
from routes.predict import predict_bp

app = Flask(__name__)
CORS(app)  # allows React frontend to call this API

app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
app.register_blueprint(predict_bp,   url_prefix="/api/predict")

if __name__ == "__main__":
    app.run(debug=True, port=5000)
