from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_user, logout_user, login_required, current_user
from app.models import AdminUser, Product, Order
from app import db, bcrypt

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/')
@login_required
def dashboard():
    products = Product.query.count()
    orders = Order.query.count()
    return render_template('admin/dashboard.html', product_count=products, order_count=orders)

@admin_bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('admin.dashboard'))
    
    # Check if any admin exists, if not, redirect to setup
    if AdminUser.query.count() == 0:
        return redirect(url_for('admin.setup'))

    if request.method == 'POST':
        password = request.form.get('password')
        user = AdminUser.query.first() # We only have one admin for now
        if user and bcrypt.check_password_hash(user.password, password):
            login_user(user)
            return redirect(url_for('admin.dashboard'))
        else:
            flash('Login Unsuccessful. Please check password', 'danger')
    return render_template('admin/login.html')

@admin_bp.route('/setup', methods=['GET', 'POST'])
def setup():
    if AdminUser.query.count() > 0:
        return redirect(url_for('admin.login'))
    
    if request.method == 'POST':
        password = request.form.get('password')
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        user = AdminUser(username='admin', password=hashed_password)
        db.session.add(user)
        db.session.commit()
        flash('Admin account created! You can now log in', 'success')
        return redirect(url_for('admin.login'))
    return render_template('admin/setup.html')

@admin_bp.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('main.index'))
