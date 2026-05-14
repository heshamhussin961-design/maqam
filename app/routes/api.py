import os
import uuid
import re
from flask import Blueprint, jsonify, request, current_app, session
from flask_login import login_required
from app.models import Product, Order, OrderItem
from app import db

api = Blueprint('api', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_slug(name):
    slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    return slug

@api.route('/products', methods=['GET'])
def get_products():
    products = Product.query.all()
    return jsonify([p.to_dict() for p in products])

@api.route('/products', methods=['POST'])
@login_required
def add_product():
    data = request.json
    if not data or not data.get('name') or not data.get('price'):
        return jsonify({'error': 'Name and price are required'}), 400
    name = data.get('name')
    slug = generate_slug(name)
    
    # Check if slug exists, if so append a short uuid
    if Product.query.filter_by(slug=slug).first():
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"

    product = Product(
        name=name,
        slug=slug,
        price=data.get('price'),
        stock=data.get('stock', 10),
        image=data.get('image', ''),
        tag=data.get('tag', ''),
        category=data.get('category', ''),
        sizes=data.get('sizes', ''),
        description=data.get('description', '')
    )
    db.session.add(product)
    db.session.commit()
    return jsonify(product.to_dict()), 201

@api.route('/products/<int:id>', methods=['PUT', 'DELETE'])
@login_required
def manage_product(id):
    product = Product.query.get_or_404(id)
    if request.method == 'DELETE':
        db.session.delete(product)
        db.session.commit()
        return jsonify({'message': 'Product deleted'})
    
    data = request.json
    if 'name' in data and data['name'] != product.name:
        product.name = data['name']
        new_slug = generate_slug(product.name)
        if Product.query.filter_by(slug=new_slug).first() and new_slug != product.slug:
            new_slug = f"{new_slug}-{uuid.uuid4().hex[:6]}"
        product.slug = new_slug
        
    product.price = data.get('price', product.price)
    product.stock = data.get('stock', product.stock)
    product.image = data.get('image', product.image)
    product.tag = data.get('tag', product.tag)
    product.category = data.get('category', product.category)
    product.sizes = data.get('sizes', product.sizes)
    product.description = data.get('description', product.description)
    db.session.commit()
    return jsonify(product.to_dict())

# ═══ IMAGE UPLOAD ═══
@api.route('/upload', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file and allowed_file(file.filename):
        ext = file.filename.rsplit('.', 1)[1].lower()
        filename = f"{uuid.uuid4().hex}.{ext}"
        upload_dir = current_app.config.get('UPLOAD_FOLDER', 'app/static/uploads')
        os.makedirs(upload_dir, exist_ok=True)
        filepath = os.path.join(upload_dir, filename)
        file.save(filepath)
        url = f"/static/uploads/{filename}"
        return jsonify({'url': url, 'filename': filename}), 201
    
    return jsonify({'error': 'File type not allowed'}), 400

# ═══ ORDERS ═══
@api.route('/orders', methods=['GET'])
@login_required
def get_orders():
    orders = Order.query.order_by(Order.created_at.desc()).all()
    return jsonify([o.to_dict() for o in orders])

@api.route('/orders', methods=['POST'])
def create_order():
    data = request.json
    items_data = data.get('items', [])
    
    if not items_data:
        return jsonify({'error': 'Order must contain at least one item.'}), 400

    # 1. First Pass: Validate stock and calculate total before any DB commits
    products_to_update = []
    total_amount = 0

    for item in items_data:
        product_id = item.get('id')
        product_name = item.get('name')
        
        try:
            quantity = int(item.get('quantity', 1))
            price = float(item.get('price', 0))
        except (ValueError, TypeError):
            return jsonify({'error': f'Invalid quantity or price for item {product_name}.'}), 400

        if quantity <= 0:
            return jsonify({'error': f'Quantity must be greater than zero for {product_name}.'}), 400

        if product_id:
            product = Product.query.get(product_id)
        else:
            product = Product.query.filter_by(name=product_name).first()

        if not product:
            return jsonify({'error': f'Product {product_name} not found.'}), 404

        if product.stock is not None and product.stock < quantity:
            return jsonify({'error': f'Not enough stock for {product.name}. Only {product.stock} left.'}), 400

        products_to_update.append((product, quantity))
        total_amount += price * quantity

    # 2. Second Pass: Create order and deduct stock securely
    order = Order(
        user_id=session.get('user_id'),
        customer_name=data.get('customer_name', 'Anonymous'),
        customer_phone=data.get('customer_phone', ''),
        customer_address=data.get('customer_address', ''),
        total_amount=total_amount,
        payment_method=data.get('payment_method', ''),
        payment_receipt=data.get('payment_receipt', '')
    )
    db.session.add(order)
    db.session.flush()

    for item in items_data:
        order_item = OrderItem(
            order_id=order.id,
            product_name=item.get('name'),
            size=item.get('size'),
            quantity=int(item.get('quantity', 1)),
            price=float(item.get('price', 0))
        )
        db.session.add(order_item)

    for product, quantity in products_to_update:
        if product.stock is not None:
            product.stock -= quantity

    db.session.commit()
    return jsonify(order.to_dict()), 201


@api.route('/orders/<int:id>/status', methods=['PUT'])
@login_required
def update_order_status(id):
    order = Order.query.get_or_404(id)
    data = request.json
    new_status = data.get('status')
    allowed = ['Pending', 'Confirmed', 'Shipped', 'Cancelled']
    if new_status not in allowed:
        return jsonify({'error': f'Status must be one of: {", ".join(allowed)}'}), 400
    order.status = new_status
    db.session.commit()
    return jsonify(order.to_dict())
