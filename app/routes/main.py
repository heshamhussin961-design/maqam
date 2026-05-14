from flask import Blueprint, render_template, session, redirect, url_for
from app.models import Product, Order

main = Blueprint('main', __name__)

@main.route('/')
def index():
    products = Product.query.all()
    return render_template('store.html', products=products)

@main.route('/product/<slug>')
def product_detail(slug):
    product = Product.query.filter_by(slug=slug).first_or_404()
    # Find related products in the same category, excluding the current one
    related = []
    if product.category:
        related = Product.query.filter(Product.category == product.category, Product.id != product.id).limit(4).all()
    return render_template('product_detail.html', product=product, related=related)

@main.route('/checkout')
def checkout_page():
    return render_template('checkout.html')

@main.route('/order-confirmed')
def order_confirmed():
    return render_template('order_confirmed.html')

@main.route('/size-guide')
def size_guide():
    return render_template('size_guide.html')

@main.route('/shipping')
def shipping():
    return render_template('shipping.html')


@main.route('/my-orders')
def my_orders():
    user_id = session.get('user_id')
    if not user_id:
        return redirect(url_for('auth.login', next='/my-orders'))
    orders = Order.query.filter_by(user_id=user_id).order_by(Order.created_at.desc()).all()
    return render_template('my_orders.html', orders=orders)
