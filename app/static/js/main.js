// ═══ CONFIG ═══
const WHATSAPP_NUMBER = '201234567890';
const DROP_DATE = new Date(Date.now() + 14 * 86400000); // 14 days from now

// ═══ STATE ═══
let cart = [];
let wishlist = JSON.parse(localStorage.getItem('maqam_wishlist') || '[]');
let selectedSize = '';
let currentFilter = 'all';
let PRODUCTS_CACHE = [];

// ═══ LENIS ═══
const lenis = new Lenis();
(function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);

// ═══ CURSOR ═══
document.body.classList.add('js-enabled');
const cursor = document.querySelector('.cursor');
const follower = document.querySelector('.cursor-follower');
const cursorLabel = document.querySelector('.cursor-label');
let mouseX = 0, mouseY = 0, dotX = 0, dotY = 0, fX = 0, fY = 0;
document.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });
(function cursorLoop() {
  dotX += (mouseX - dotX) * 0.2; dotY += (mouseY - dotY) * 0.2;
  fX += (mouseX - fX) * 0.08; fY += (mouseY - fY) * 0.08;
  cursor.style.transform = `translate(${dotX - 4}px, ${dotY - 4}px)`;
  const fs = follower.classList.contains('view-mode') ? 40 : follower.classList.contains('hover') ? 27.5 : 18;
  follower.style.transform = `translate(${fX - fs}px, ${fY - fs}px)`;
  requestAnimationFrame(cursorLoop);
})();

function setCursorMode(mode) {
  follower.className = 'cursor-follower';
  cursorLabel.textContent = '';
  if (mode === 'view') { follower.classList.add('view-mode'); cursorLabel.textContent = 'VIEW'; }
  else if (mode === 'look') { follower.classList.add('view-mode'); cursorLabel.textContent = 'LOOK'; }
  else if (mode === 'hover') { follower.classList.add('hover'); }
}

function bindCursorHovers() {
  document.querySelectorAll('.product-card').forEach(el => { el.addEventListener('mouseenter', () => setCursorMode('view')); el.addEventListener('mouseleave', () => setCursorMode('default')); });
  document.querySelectorAll('.lookbook-item').forEach(el => { el.addEventListener('mouseenter', () => setCursorMode('look')); el.addEventListener('mouseleave', () => setCursorMode('default')); });
  document.querySelectorAll('a,button,.insta-item').forEach(el => { if (el.closest('.product-card') || el.closest('.lookbook-item')) return; el.addEventListener('mouseenter', () => setCursorMode('hover')); el.addEventListener('mouseleave', () => setCursorMode('default')); });
}

// ═══ SMART NAV ═══
window.addEventListener('scroll', () => {
  document.querySelector('nav').classList.toggle('scrolled', window.scrollY > 100);
  document.getElementById('scroll-progress').style.width = ((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100) + '%';
  document.getElementById('back-to-top').classList.toggle('visible', window.scrollY > window.innerHeight);
}, { passive: true });

// ═══ HAMBURGER ═══
let menuOpen = false;
function toggleMenu() {
  menuOpen = !menuOpen;
  document.getElementById('hamburger').classList.toggle('active', menuOpen);
  document.getElementById('mobile-menu').classList.toggle('active', menuOpen);
  if (menuOpen) gsap.fromTo('.mobile-menu li', { y: 40, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 0.5, ease: 'power3.out', delay: 0.1 });
}

// ═══ RENDER PRODUCTS ═══
function renderProducts() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;
  const filtered = currentFilter === 'all' ? PRODUCTS_CACHE : PRODUCTS_CACHE.filter(p => (p.category || '').toLowerCase() === currentFilter);
  const bgClasses = ['card-bg-1','card-bg-2','card-bg-3','card-bg-4','card-bg-5','card-bg-6'];
  
  grid.innerHTML = filtered.map((p, fi) => {
    const bg = bgClasses[fi % bgClasses.length];
    const pf = parseInt(p.price).toLocaleString();
    const isWished = wishlist.some(w => w.name === p.name);
    const outOfStock = p.stock !== null && p.stock !== undefined && p.stock <= 0;
    const imgEl = p.image ? `<img src="${p.image}" class="product-img" alt="${p.name}" loading="lazy">` : `<div class="product-placeholder">${p.name[0]}</div>`;
    const tagEl = outOfStock ? `<div class="product-tag" style="background:#333;color:#888">Sold Out</div>` : (p.tag ? `<div class="product-tag">${p.tag}</div>` : '');

    return `
      <div class="product-card ${bg}${outOfStock ? ' out-of-stock' : ''}" onclick="${outOfStock ? '' : `window.location.href='/product/${p.slug}'`}" style="${outOfStock ? 'cursor:default;opacity:.6' : ''}">
        ${imgEl}
        <div class="product-overlay">
          <div class="product-name">${p.name}</div>
          <div class="product-price">${outOfStock ? '<span style="color:#666">Out of Stock</span>' : `EGP ${pf}`}</div>
        </div>
        ${tagEl}
        <button class="wish-btn ${isWished ? 'active' : ''}" onclick="toggleWish(event, ${p.id})">${isWished ? '♥' : '♡'}</button>
        ${!outOfStock ? `<button class="product-btn" onclick="event.stopPropagation(); window.location.href='/product/${p.slug}'">View Product</button>` : ''}
      </div>`;
  }).join('');
  bindCursorHovers();
}

function filterCategory(cat) {
  currentFilter = cat.toLowerCase();
  document.querySelectorAll('.cat-tab').forEach(btn => btn.classList.toggle('active', btn.textContent.toLowerCase() === currentFilter));
  renderProducts();
}

// ═══ INITIALIZATION ═══
document.addEventListener('DOMContentLoaded', async () => {
    // Preloader Logic
    const pre = document.getElementById('preloader');
    if (pre) {
        pre.querySelector('.preloader-text').innerHTML = 'MAQAM'.split('').map(c => '<span>' + c + '</span>').join('');
        setTimeout(() => {
            pre.classList.add('animating');
            gsap.to('.preloader-text span', { y: 0, opacity: 1, stagger: 0.1, delay: 0.2, duration: 0.6, ease: 'power3.out' });
        }, 100);
        setTimeout(() => {
            pre.classList.add('done');
            document.body.classList.remove('loading');
            setTimeout(() => { pre.remove(); initAfterLoad(); }, 800);
        }, 2600);
    } else {
        document.body.classList.remove('loading');
        initAfterLoad();
    }

    // Fetch Products
    try {
        const res = await fetch('/api/products');
        PRODUCTS_CACHE = await res.json();
        renderProducts();
    } catch (err) {
        console.error('Failed to fetch products', err);
    }
});

function initAfterLoad() {
  initGSAP();
  initMagneticBtn();
  initModalZoom();
  initWordReveals();
  updateCartUI();
  updateWishlistUI();
}

// ═══ GSAP ANIMATIONS ═══
function initGSAP() {
  gsap.registerPlugin(ScrollTrigger);
  
  // Hero Animations
  gsap.to('.hero-eyebrow', { opacity: 1, y: 0, duration: 0.8, delay: 0.5, ease: 'power3.out' });
  gsap.fromTo('.hero-cta', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, delay: 1.2, ease: 'power3.out' });
  
  // Hero Title Chars
  const titleChars = document.querySelectorAll('.hero-title .char');
  if (titleChars.length) {
    gsap.fromTo(titleChars, { y: 100, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.04, ease: 'power4.out', delay: 0.1 });
  }

  document.querySelectorAll('.reveal').forEach(el => {
    gsap.fromTo(el, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%' } });
  });

  gsap.to('.hero-bg-text', { y: -100, opacity: 0, scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
}

function initWordReveals() {
  document.querySelectorAll('.word-reveal').forEach(el => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map(w => `<span class="word"><span class="word-inner">${w}</span></span>`).join(' ');
    gsap.fromTo(el.querySelectorAll('.word-inner'), { y: '110%' }, { y: '0%', stagger: 0.05, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%' } });
  });
}

function initMagneticBtn() {
  const btn = document.getElementById('hero-cta');
  if (!btn) return;
  btn.addEventListener('mousemove', e => {
    const r = btn.getBoundingClientRect();
    gsap.to(btn, { x: (e.clientX - r.left - r.width / 2) * 0.3, y: (e.clientY - r.top - r.height / 2) * 0.3, duration: 0.3, ease: 'power2.out' });
  });
  btn.addEventListener('mouseleave', () => { gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1,0.4)' }); });
}

function initModalZoom() {
  const wrap = document.getElementById('modal-img-wrap');
  if (!wrap) return;
  wrap.addEventListener('mousemove', function(e) {
    const r = this.getBoundingClientRect();
    const img = this.querySelector('img');
    if (img) img.style.transformOrigin = `${((e.clientX - r.left) / r.width * 100)}% ${((e.clientY - r.top) / r.height * 100)}%`;
  });
}

// ═══ CART ═══
function toggleCart() {
  document.getElementById('cart-drawer').classList.toggle('open');
  document.getElementById('drawer-overlay').classList.toggle('visible');
}

function closeAllDrawers() {
  document.getElementById('cart-drawer').classList.remove('open');
  document.getElementById('wishlist-drawer').classList.remove('open');
  document.getElementById('drawer-overlay').classList.remove('visible');
}

function updateCartUI() {
  const cartItemsEl = document.getElementById('cart-items');
  const cartTotalEl = document.getElementById('cart-total');
  const cartCountEl = document.getElementById('cart-count');
  if (!cartItemsEl) return;

  cartCountEl.textContent = cart.reduce((a, i) => a + i.qty, 0);
  if (cart.length === 0) {
    cartItemsEl.innerHTML = '<p style="text-align:center;margin-top:2rem;color:var(--mid)">Your bag is empty.</p>';
    cartTotalEl.textContent = 'EGP 0';
    return;
  }

  cartItemsEl.innerHTML = cart.map((item, idx) => `
    <div class="cart-item">
      <div class="cart-item-thumb">${item.image ? `<img src="${item.image}">` : `<div class="thumb-placeholder">${item.name[0]}</div>`}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-size">Size: ${item.size}</div>
        <div class="qty-control">
          <button class="qty-btn" onclick="changeQty(${idx}, -1)">&minus;</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty(${idx}, 1)">+</button>
        </div>
      </div>
      <div class="cart-item-right">
        <div class="cart-item-price">EGP ${(item.price * item.qty).toLocaleString()}</div>
        <button class="cart-item-remove" onclick="removeFromCart(${idx})">REMOVE</button>
      </div>
    </div>
  `).join('');
  cartTotalEl.textContent = 'EGP ' + cart.reduce((a, i) => a + (i.price * i.qty), 0).toLocaleString();
}

function changeQty(idx, delta) {
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  updateCartUI();
}

function removeFromCart(idx) {
  cart.splice(idx, 1);
  updateCartUI();
}

async function checkout() {
  if (cart.length === 0) return;
  // Save cart to sessionStorage and redirect to checkout page
  sessionStorage.setItem('maqam_checkout_cart', JSON.stringify(cart));
  closeAllDrawers();
  window.location.href = '/checkout';
}

function whatsappCheckout() {
    if (cart.length === 0) return;
    let msg = '*MAQAM Order*\n\n';
    cart.forEach(i => msg += `• ${i.name} (${i.size}) x${i.qty} - EGP ${(i.price * i.qty).toLocaleString()}\n`);
    msg += `\n*Total: EGP ${cart.reduce((a, i) => a + (i.price * i.qty), 0).toLocaleString()}*`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ═══ WISHLIST ═══
function toggleWishlist() {
  document.getElementById('wishlist-drawer').classList.toggle('open');
  document.getElementById('drawer-overlay').classList.toggle('visible');
  updateWishlistUI();
}

function toggleWish(e, id) {
  if (e) e.stopPropagation();
  const p = PRODUCTS_CACHE.find(item => item.id === id);
  const idx = wishlist.findIndex(w => w.name === p.name);
  if (idx >= 0) {
    wishlist.splice(idx, 1);
    showToast('Removed from wishlist');
  } else {
    wishlist.push({ name: p.name, price: p.price, image: p.image });
    showToast('Added to wishlist ♥');
  }
  localStorage.setItem('maqam_wishlist', JSON.stringify(wishlist));
  updateWishlistUI();
  renderProducts();
}

function updateWishlistUI() {
  const el = document.getElementById('wishlist-items');
  const count = document.getElementById('wish-count');
  if (!el) return;
  count.textContent = wishlist.length;
  if (wishlist.length === 0) {
    el.innerHTML = '<p style="text-align:center;margin-top:2rem;color:var(--mid)">Your wishlist is empty.</p>';
    return;
  }
  el.innerHTML = wishlist.map((item, idx) => `
    <div class="wish-item">
      <div class="wish-item-thumb">${item.image ? `<img src="${item.image}">` : `<div class="thumb-placeholder">${item.name[0]}</div>`}</div>
      <div class="wish-item-info">
        <div class="wish-item-name">${item.name}</div>
        <div class="wish-item-price">EGP ${parseInt(item.price).toLocaleString()}</div>
      </div>
      <button class="wish-item-remove" onclick="removeFromWishlist(${idx})">&times;</button>
    </div>
  `).join('');
}

function removeFromWishlist(idx) {
    wishlist.splice(idx, 1);
    localStorage.setItem('maqam_wishlist', JSON.stringify(wishlist));
    updateWishlistUI();
    renderProducts();
}

// ═══ MODAL ═══
function openProductById(id) {
    const p = PRODUCTS_CACHE.find(item => item.id === id);
    if (!p) return;
    
    selectedSize = '';
    const modal = document.getElementById('product-modal');
    document.getElementById('size-warning').classList.remove('show');
    document.getElementById('modal-title').textContent = p.name;
    document.getElementById('modal-price').textContent = 'EGP ' + parseInt(p.price).toLocaleString();
    document.getElementById('modal-img').src = p.image || '';
    document.getElementById('modal-img').style.display = p.image ? 'block' : 'none';
    
    const sizes = p.sizes ? p.sizes.split(',').map(s => s.trim()) : ['S','M','L','XL'];
    document.getElementById('modal-sizes').innerHTML = sizes.map(s => `<button class="size-btn" onclick="selectSize(this, '${s}')">${s}</button>`).join('');
    
    document.getElementById('modal-add-btn').onclick = () => {
        if (!selectedSize) {
            document.getElementById('size-warning').classList.add('show');
            return;
        }
        addToBag(p.name, p.price, selectedSize, p.image);
        closeModal();
    };
    
    modal.style.display = 'flex';
    gsap.fromTo('.modal-content', { y: 80, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'power4.out' });
}

function selectSize(btn, size) {
    selectedSize = size;
    document.getElementById('size-warning').classList.remove('show');
    document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
}

function addToBag(name, price, size, image) {
    const ex = cart.find(i => i.name === name && i.size === size);
    if (ex) ex.qty += 1;
    else cart.push({ name, price, qty: 1, size, image });
    updateCartUI();
    toggleCart();
    showToast(name + ' added to bag!');
}

function closeModal() {
    gsap.to('.modal-content', { y: 40, opacity: 0, scale: 0.97, duration: 0.3, onComplete: () => {
        document.getElementById('product-modal').style.display = 'none';
    }});
}

// ═══ TOAST ═══
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
}

// ═══ KEYS ═══
let adminBuf = '';
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'Escape') {
      closeModal();
      closeAllDrawers();
      if (menuOpen) toggleMenu();
  }
  adminBuf += e.key.toLowerCase();
  if (adminBuf.includes('admin')) { adminBuf = ''; window.location.href = '/admin'; }
  if (adminBuf.length > 10) adminBuf = adminBuf.slice(-5);
});
