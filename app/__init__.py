from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_login import LoginManager
from flask_bcrypt import Bcrypt
from config import Config

db = SQLAlchemy()
login_manager = LoginManager()
login_manager.login_view = 'admin.login'
bcrypt = Bcrypt()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    login_manager.init_app(app)
    bcrypt.init_app(app)
    CORS(app)

    from app.models import AdminUser
    @login_manager.user_loader
    def load_user(user_id):
        return AdminUser.query.get(int(user_id))

    from app.routes.main import main
    from app.routes.admin import admin_bp
    from app.routes.api import api
    from app.routes.auth import auth

    app.register_blueprint(main)
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(api, url_prefix='/api')
    app.register_blueprint(auth, url_prefix='/auth')

    with app.app_context():
        db.create_all()

    return app
