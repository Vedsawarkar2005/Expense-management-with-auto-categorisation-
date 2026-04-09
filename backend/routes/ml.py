from flask import Blueprint, request, jsonify
from models.model import predict_category

ml_bp = Blueprint('ml', __name__)

# ✅ 1. ML CATEGORY PREDICTION
@ml_bp.route("/predict-category", methods=["POST"])
def predict_category_api():
    print("PREDICT API HIT")  # Debug log
    data = request.get_json()
    description = data.get("description", "")
    category = predict_category(description)
    return jsonify({
        "category": category
    })
