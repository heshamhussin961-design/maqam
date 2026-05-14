from app import create_app, db
from app.models import Product, Order, AdminUser

app = create_app()

if __name__ == '__main__':
    app.run(debug=False, port=2002)
