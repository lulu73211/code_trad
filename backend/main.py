from flask import Flask
from flask_cors import CORS
from routers.translate import translate_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(translate_bp, url_prefix="/api")


@app.get("/")
def root():
    return {"message": "Code Translator API is running"}


if __name__ == "__main__":
    app.run(debug=True, port=8000)
