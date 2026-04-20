import './style.css'
import './auth.css'
import { products, setProducts, mapShopifyProduct } from './products'
import type { Product } from './products'
import { STATIC_PAGES } from './static-content'
import { fetchShopify, GET_PRODUCTS_QUERY, CREATE_CART_MUTATION, GET_COLLECTIONS_QUERY } from './shopify'

// --- STATE MANAGEMENT ---
interface AppState {
  currentCategory: string | null;
  minPrice: number;
  maxPrice: number;
  isLoggedIn: boolean;
  cartCount: number;
  cartItems: any[];
  favorites: { id: string, addedAt: number }[];
  user: {
    name: string | null;
    email: string | null;
    picture: string | null;
  };
  cookieAccepted: boolean;
  coupons: Coupon[];
  activeCoupon: Coupon | null;
  collections: any[];
}

interface Coupon {
  id: string;
  code: string;
  discountValue: number;
  discountType: 'percentage' | 'fixed';
  minSpend: number;
  startDate: number;
  endDate: number;
  description: string;
}

const DUMMY_COUPONS: Coupon[] = [];

const savedUser = JSON.parse(localStorage.getItem('sfuya_user') || 'null');
const savedCart = JSON.parse(localStorage.getItem('sfuya_cart') || '[]');

const state: AppState = {
  currentCategory: null,
  minPrice: 0,
  maxPrice: Infinity,
  isLoggedIn: !!savedUser,
  cartCount: savedCart.length,
  cartItems: savedCart,
  favorites: JSON.parse(localStorage.getItem('sfuya_favorites') || '[]').map((f: any) => typeof f === 'string' ? { id: f, addedAt: Date.now() } : f),
  user: savedUser || {
    name: null,
    email: null,
    picture: null
  },
  cookieAccepted: localStorage.getItem('sfuya_cookies') === 'accepted',
  coupons: DUMMY_COUPONS,
  activeCoupon: JSON.parse(localStorage.getItem('sfuya_active_coupon') || 'null'),
  collections: []
};

// --- ROUTER & VIEW SWITCHING ---
function initRouter() {
  window.addEventListener('popstate', handleRoute);
  
  // Intercept all internal links
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const link = target.closest('a');
    
    if (link && link.getAttribute('href')?.startsWith('/') && !link.getAttribute('href')?.includes('myshopify.com')) {
      e.preventDefault();
      navigateTo(link.getAttribute('href')!);
    }
  });

  handleRoute(); // Execute once on load
}

function navigateTo(path: string) {
  window.history.pushState({}, '', path);
  handleRoute();
}

function handleRoute() {
  const path = window.location.pathname;
  const slug = path.startsWith('/') ? path.substring(1) : path;
  
  const homeView = document.getElementById('home-view');
  const productView = document.getElementById('product-view');
  const staticView = document.getElementById('static-view');
  const dynamicView = document.getElementById('dynamic-view');

  // Hide all first
  homeView?.classList.add('auth-hidden');
  productView?.classList.add('auth-hidden');
  staticView?.classList.add('auth-hidden');
  dynamicView?.classList.add('auth-hidden');

  // Update active nav link
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.classList.remove('active');
    const href = link.getAttribute('href');
    if (href === path || 
        (href === '/' && path === '/') ||
        (href === '/brands' && path === '/brands') ||
        (href === '/category' && (path === '/category' || path === '/collections')) ||
        (href === '/all-products' && (path === '/all-products' || path === '/products')) ||
        (href === '/about-us' && (path === '/about-us' || path === '/about')) ||
        (href === '/contact-us' && (path === '/contact-us' || path === '/contact'))) {
      link.classList.add('active');
    }
  });

  if (path.startsWith('/product/')) {
    const productId = path.replace('/product/', '');
    const product = products.find(p => p.id === productId);
    
    if (product) {
      document.title = `SFUYA | ${product.name}`;
      productView?.classList.remove('auth-hidden');
      renderPDP(product);
      window.scrollTo(0, 0);
    } else {
      document.title = 'SFUYA | Product Not Found';
      dynamicView?.classList.remove('auth-hidden');
      renderErrorPage();
    }
  } 
  else if (path === '/products' || path === '/all-products') {
    document.title = 'SFUYA | All Products';
    dynamicView?.classList.remove('auth-hidden');
    renderAllProductsPage();
    window.scrollTo(0, 0);
  }
  else if (path === '/collections' || path === '/category') {
    document.title = 'SFUYA | Collections';
    dynamicView?.classList.remove('auth-hidden');
    renderCollectionsPage();
    window.scrollTo(0, 0);
  }
  else if (path === '/brands') {
    document.title = 'SFUYA | Brands';
    dynamicView?.classList.remove('auth-hidden');
    renderBrandsPage();
    window.scrollTo(0, 0);
  }
  else if (path === '/about' || path === '/about-us') {
    document.title = 'SFUYA | About Us';
    dynamicView?.classList.remove('auth-hidden');
    renderAboutPage();
    window.scrollTo(0, 0);
  }
  else if (path === '/contact' || path === '/contact-us') {
    document.title = 'SFUYA | Contact Us';
    dynamicView?.classList.remove('auth-hidden');
    renderContactPage();
    window.scrollTo(0, 0);
  }
  else if (path === '/favorites') {
    document.title = 'SFUYA | My Favorites';
    dynamicView?.classList.remove('auth-hidden');
    renderFavoritesPage();
    window.scrollTo(0, 0);
  }
  else if (path === '/coupons') {
    document.title = 'SFUYA | My Coupons';
    dynamicView?.classList.remove('auth-hidden');
    renderCouponsPage();
    window.scrollTo(0, 0);
  }
  else if (STATIC_PAGES[slug]) {
    document.title = `SFUYA | ${slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}`;
    staticView?.classList.remove('auth-hidden');
    renderStaticPage(slug);
    window.scrollTo(0, 0);
  }
  else if (path === '/' || path === '') {
    document.title = 'SFUYA | Home';
    homeView?.classList.remove('auth-hidden');
    renderProducts();
    renderSidebar();
  }
  else {
    document.title = 'SFUYA | Page Not Found';
    dynamicView?.classList.remove('auth-hidden');
    renderErrorPage();
  }
}

function renderErrorPage() {
  const container = document.getElementById('dynamic-view');
  if (!container) return;

  container.innerHTML = `
    <div class="error-page-container" style="text-align: center; padding: 100px 20px; background: #fff; min-height: 60vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
      <h1 style="font-size: 8rem; font-weight: 900; color: var(--primary); margin-bottom: 10px; line-height: 1;">404</h1>
      <h2 style="font-size: 2rem; color: #1a1a1a; margin-bottom: 20px;">Oops! Page Not Found</h2>
      <p style="color: #666; max-width: 500px; margin-bottom: 30px; font-size: 1.1rem; line-height: 1.6;">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      <a href="/" class="btn btn-primary" style="padding: 15px 30px; font-size: 1.1rem; text-decoration: none;" onclick="event.preventDefault(); navigateTo('/')">BACK TO HOME</a>
    </div>
  `;
}

function renderFavoritesPage() {
  const container = document.getElementById('dynamic-view');
  if (!container) return;

  // Local state for the page
  let dateFilter = 'all'; 
  let selectedIds: string[] = [];

  const updateView = () => {
    const now = Date.now();
    let filteredFavs = [...state.favorites];

    if (dateFilter === '7days') {
      filteredFavs = filteredFavs.filter(f => (now - f.addedAt) <= 7 * 24 * 60 * 60 * 1000);
    } else if (dateFilter === '30days') {
      filteredFavs = filteredFavs.filter(f => (now - f.addedAt) <= 30 * 24 * 60 * 60 * 1000);
    }

    const favProducts = filteredFavs.map(f => products.find(p => p.id === f.id)).filter(Boolean) as Product[];

    container.innerHTML = `
      <div class="favorites-page">
        <div class="favorites-header">
          <div class="fav-title-section">
            <h1>My Favorites</h1>
            <p>${favProducts.length} items saved</p>
          </div>
          
          <div class="fav-actions-bar">
            <div class="fav-filters">
              <label>Filter by Date:</label>
              <select id="fav-date-filter" class="fav-select">
                <option value="all" ${dateFilter === 'all' ? 'selected' : ''}>All Time</option>
                <option value="7days" ${dateFilter === '7days' ? 'selected' : ''}>Last 7 Days</option>
                <option value="30days" ${dateFilter === '30days' ? 'selected' : ''}>Last 30 Days</option>
              </select>
            </div>
            
            <div class="fav-btns">
              <button id="remove-selected-btn" class="btn btn-outline-dark" ${selectedIds.length === 0 ? 'disabled' : ''}>
                REMOVE SELECTED (${selectedIds.length})
              </button>
              <button id="remove-all-btn" class="btn btn-primary-naif">REMOVE ALL</button>
            </div>
          </div>
        </div>

        <div class="favorites-grid">
          ${favProducts.length === 0 ? `
            <div class="no-favorites">
              <i class="ph ph-heart-break"></i>
              <p>No products found in this period.</p>
              <a href="/all-products" class="btn btn-primary">EXPLORE PRODUCTS</a>
            </div>
          ` : favProducts.map(p => `
            <div class="fav-item-card" data-id="${p.id}">
              <div class="fav-item-checkbox">
                <input type="checkbox" class="fav-check" data-id="${p.id}" ${selectedIds.includes(p.id) ? 'checked' : ''}>
              </div>
              <div class="fav-item-img" onclick="navigateTo('/product/${p.id}')">
                <img src="${p.images[0]}" alt="${p.name}">
              </div>
              <div class="fav-item-info">
                <h3 onclick="navigateTo('/product/${p.id}')">${p.name}</h3>
                <p class="fav-item-price">£${p.price.toFixed(2)}</p>
                <button class="fav-remove-single" data-id="${p.id}">
                  <i class="ph ph-trash"></i> Remove
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Attach local listeners
    document.getElementById('fav-date-filter')?.addEventListener('change', (e) => {
      dateFilter = (e.target as HTMLSelectElement).value;
      updateView();
    });

    document.getElementById('remove-all-btn')?.addEventListener('click', () => {
      if (confirm("Are you sure you want to remove all favorites?")) {
        state.favorites = [];
        localStorage.setItem('sfuya_favorites', JSON.stringify(state.favorites));
        showToast("All favorites removed");
        updateView();
      }
    });

    document.getElementById('remove-selected-btn')?.addEventListener('click', () => {
      state.favorites = state.favorites.filter(f => !selectedIds.includes(f.id));
      localStorage.setItem('sfuya_favorites', JSON.stringify(state.favorites));
      showToast(`${selectedIds.length} items removed`);
      selectedIds = [];
      updateView();
    });

    const removeBtns = container.querySelectorAll('.fav-remove-single');
    removeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (btn as HTMLElement).dataset.id!;
        toggleFavorite(id);
      });
    });

    const checkboxes = container.querySelectorAll('.fav-check');
    checkboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        const id = (cb as HTMLInputElement).dataset.id!;
        if ((cb as HTMLInputElement).checked) {
          selectedIds.push(id);
        } else {
          selectedIds = selectedIds.filter(sid => sid !== id);
        }
        updateView();
      });
    });
  };

  updateView();
}

function renderCouponsPage() {
  const container = document.getElementById('dynamic-view');
  if (!container) return;

  const now = Date.now();
  
  container.innerHTML = `
    <div class="coupons-page">
      <div class="coupons-header">
        <h1>Available Coupons</h1>
        <p>Apply these codes at checkout to elevate your savings.</p>
      </div>
      
      <div class="coupons-grid">
        ${state.coupons.length === 0 ? `
          <div class="no-coupons" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: #fff; border-radius: 16px; border: 1px dashed #ddd;">
            <i class="ph ph-ticket" style="font-size: 4rem; color: #eee; margin-bottom: 15px; display: inline-block;"></i>
            <h3 style="font-size: 1.5rem; color: #1a1a1a; margin-bottom: 10px;">No Active Coupons</h3>
            <p style="color: #777;">Stay tuned! We'll be bringing you new discounts and offers soon.</p>
          </div>
        ` : state.coupons.map(coupon => {
          const isExpired = now > coupon.endDate;
          const isFuture = now < coupon.startDate;
          let statusLabel = '<span class="status-active">Active</span>';
          if (isExpired) statusLabel = '<span class="status-expired">Expired</span>';
          else if (isFuture) statusLabel = '<span class="status-future">Coming Soon</span>';

          const endDateStr = new Date(coupon.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

          return `
            <div class="coupon-ticket ${isExpired ? 'expired' : ''}">
              <div class="ticket-left">
                <div class="discount-value">
                  ${coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `£${coupon.discountValue}`}
                </div>
                <div class="discount-label">OFF</div>
              </div>
              
              <div class="ticket-right">
                <div class="ticket-status">${statusLabel}</div>
                <h3 class="coupon-code-title">Code: <span>${coupon.code}</span></h3>
                <p class="coupon-desc">${coupon.description}</p>
                <div class="coupon-meta">
                  <span><i class="ph ph-calendar"></i> Valid until: ${endDateStr}</span>
                  <span><i class="ph ph-shopping-cart"></i> Min Spend: £${coupon.minSpend}</span>
                </div>
                <button class="copy-coupon-btn" data-code="${coupon.code}" ${isExpired ? 'disabled' : ''}>
                  <i class="ph ph-copy"></i> COPY CODE
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  // Attach listeners for copying
  container.querySelectorAll('.copy-coupon-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const code = (e.currentTarget as HTMLElement).dataset.code!;
      navigator.clipboard.writeText(code).then(() => {
        showToast(`Code ${code} copied to clipboard!`);
        const originalText = (e.currentTarget as HTMLElement).innerHTML;
        (e.currentTarget as HTMLElement).innerHTML = '<i class="ph ph-check"></i> COPIED!';
        setTimeout(() => {
          (e.currentTarget as HTMLElement).innerHTML = originalText;
        }, 2000);
      });
    });
  });
}

function renderAllProductsPage() {
  const container = document.getElementById('dynamic-view');
  if (!container) return;

  container.innerHTML = `
    <div class="legal-page-header">
      <div class="container">
        <h1>ALL PRODUCTS</h1>
        <p class="breadcrumb">Home / Shop / All Products</p>
      </div>
    </div>
    <div class="container container-with-sidebar">
      <aside class="shop-sidebar">
        <div class="sidebar-block">
          <h4>CATEGORIES</h4>
          <ul class="sidebar-list">
            <li><a href="#" onclick="navigateTo('/collections')">Cases</a></li>
            <li><a href="#" onclick="navigateTo('/collections')">Chargers</a></li>
            <li><a href="#" onclick="navigateTo('/collections')">Audio</a></li>
            <li><a href="#" onclick="navigateTo('/collections')">Accessories</a></li>
          </ul>
        </div>
        <div class="sidebar-block">
          <h4>FILTER BY PRICE</h4>
          <div class="price-range-mock">
            <div class="range-track"></div>
            <div class="range-handle left"></div>
            <div class="range-handle right"></div>
          </div>
          <p class="price-range-text">Price: £0 — £150</p>
          <button class="btn btn-outline-naif btn-small">FILTER</button>
        </div>
        <div class="sidebar-block">
          <h4>TOP BRANDS</h4>
          <ul class="sidebar-list">
             <li><label><input type="checkbox"> BASEUS</label></li>
             <li><label><input type="checkbox"> HOCO</label></li>
             <li><label><input type="checkbox"> WIWU</label></li>
             <li><label><input type="checkbox"> MCDODO</label></li>
          </ul>
        </div>
      </aside>
      <main class="shop-main">
        <div class="shop-toolbar">
          <p>Showing ${products.length} results</p>
          <select class="sort-select">
            <option>Default Sorting</option>
            <option>Price: Low to High</option>
            <option>Price: High to Low</option>
            <option>Latest Arrivals</option>
          </select>
        </div>
        <div class="product-grid" id="all-products-grid">
          ${products.map(p => createProductCard(p)).join('')}
        </div>
      </main>
    </div>
  `;
  attachProductCardListeners();
}

function renderCollectionsPage() {
  const container = document.getElementById('dynamic-view');
  if (!container) return;

  container.innerHTML = `
    <div class="sfuya-breadcrumb-bar">
      <div class="container">
        <a href="/" onclick="event.preventDefault(); navigateTo('/')">Home</a> / <span>Collections</span>
      </div>
    </div>
    <div class="container">
      <h1 class="sfuya-page-title">Collections</h1>
      <div class="sfuya-collections-grid">
        ${state.collections.length === 0 ? '<p>Loading collections...</p>' : state.collections.map((c) => `
          <a href="/products?category=${c.title}" class="sfuya-collection-card" onclick="event.preventDefault(); navigateTo('/products?category=${c.title}')">
            <div class="sfuya-collection-img">
              <img src="${c.image?.url || products[0]?.images[0] || ''}" alt="${c.title}" loading="lazy">
            </div>
            <p class="sfuya-collection-name">${c.title}</p>
          </a>
        `).join('')}
      </div>
    </div>
  `;
}

function renderBrandsPage() {
  const container = document.getElementById('dynamic-view');
  if (!container) return;

  const brandProducts = [
    {
      vendor: "SFUYA",
      name: "Differin Acne Treatment Gel, 30 Day Supply, Retinoid Treatment for Face with 0.1% Adapalene, Gentle Skin Care for Acne Prone Sensitive Skin, 15g Tube",
      price: "£13.99",
      img: "https://cdn.shopify.com/s/files/1/0752/1606/0699/files/1_80166f41-5ea2-4e60-8731-8e4445236902.jpg?v=1749065513",
      url: "/products"
    },
    {
      vendor: "SFUYA",
      name: "Superox Eyelid and Eyelash Cleanser - Fast Relief from Irritation, Styes and Blepharitis - Gentle Hypochlorous Acid Spray, 100 ml (3.38 oz)",
      price: "£12.99",
      img: "https://cdn.shopify.com/s/files/1/0752/1606/0699/files/superoxmain.jpg?v=1730654497",
      url: "/products"
    }
  ];

  container.innerHTML = `
    <div class="sfuya-breadcrumb-bar">
      <div class="container">
        <a href="/" onclick="event.preventDefault(); navigateTo('/')">Home</a> / <span>Brands</span>
      </div>
    </div>
    <div class="container">
      <div class="sfuya-brands-row">
        <div class="sfuya-brand-banner">
          <div class="sfuya-brand-banner-inner">
            <h2 class="sfuya-featured-title">Featured<br>collection</h2>
          </div>
        </div>
        ${brandProducts.map(p => `
          <div class="sfuya-brand-card" onclick="navigateTo('${p.url}')">
            <span class="sfuya-brand-vendor">${p.vendor}</span>
            <div class="sfuya-brand-card-img">
              <img src="${p.img}" alt="${p.name}" loading="lazy">
            </div>
            <h3 class="sfuya-brand-card-title">${p.name}</h3>
            <p class="sfuya-brand-card-price">${p.price}</p>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderAboutPage() {
  const container = document.getElementById('dynamic-view');
  if (!container) return;

  container.innerHTML = `
    <div class="legal-page-header">
      <div class="container">
        <h1>ABOUT SFUYA</h1>
        <p class="breadcrumb">Home / About Us</p>
      </div>
    </div>
    <div class="container">
      <div class="about-page-content">
        <div class="about-section">
          <h3>Elevating Digital Lifestyle</h3>
          <p>SFUYA is a premium technology accessories marketplace based in the United Kingdom. We curate only the highest quality products from global brands to ensure your devices are protected, powered, and complemented by timeless aesthetics.</p>
        </div>
        <div class="about-grid">
          <div class="about-box">
             <i class="ph-fill ph-shield-check"></i>
             <h4>Quality First</h4>
             <p>Every product in our catalog undergoes strict quality control standards.</p>
          </div>
          <div class="about-box">
             <i class="ph-fill ph-truck"></i>
             <h4>Global Reach</h4>
             <p>We provide fast and secure shipping options for tech enthusiasts worldwide.</p>
          </div>
          <div class="about-box">
             <i class="ph-fill ph-headset"></i>
             <h4>Expert Support</h4>
             <p>Our dedicated team is always ready to assist you with technical inquiries.</p>
          </div>
        </div>
        <div class="legal-info-box">
          <p><strong>Legal Name:</strong> SFUYA LIMITED</p>
          <p><strong>Registered Address:</strong> 4th Floor, 18 St. Cross Street, London, EC1N 8UN, United Kingdom.</p>
          <p><strong>Company Number:</strong> 13853112</p>
        </div>
      </div>
    </div>
  `;
}

function renderContactPage() {
  const container = document.getElementById('dynamic-view');
  if (!container) return;

  container.innerHTML = `
    <div class="legal-page-header">
      <div class="container">
        <h1>CONTACT US</h1>
        <p class="breadcrumb">Home / Contact</p>
      </div>
    </div>
    <div class="container contact-split-container">
      <div class="contact-info-side">
        <h3>Get in Touch</h3>
        <p>Looking for a specific product or have a question about your order? Our team is here to help.</p>
        <div class="contact-details">
          <div class="contact-detail-item">
            <i class="ph ph-envelope"></i>
            <div>
              <label>Email</label>
              <p>info@sfuya.com</p>
            </div>
          </div>
          <div class="contact-detail-item">
            <i class="ph ph-map-pin"></i>
            <div>
              <label>Office</label>
              <p>London, United Kingdom</p>
            </div>
          </div>
        </div>
      </div>
      <div class="contact-form-side">
        <form class="luxury-form">
          <div class="form-row">
            <div class="input-group">
              <label>Full Name</label>
              <input type="text" placeholder="Your name">
            </div>
            <div class="input-group">
              <label>Email Address</label>
              <input type="email" placeholder="Your email">
            </div>
          </div>
          <div class="input-group">
            <label>Subject</label>
            <input type="text" placeholder="What is this about?">
          </div>
          <div class="input-group">
            <label>Message</label>
            <textarea placeholder="Tell us more..."></textarea>
          </div>
          <button type="submit" class="btn btn-primary btn-full">SEND MESSAGE</button>
        </form>
      </div>
    </div>
  `;
}

function renderStaticPage(slug: string) {
  const container = document.getElementById('static-view');
  if (!container) return;

  const page = STATIC_PAGES[slug];
  container.innerHTML = `
    <div class="legal-page-header">
      <div class="container">
        <h1>${page.title}</h1>
        <p class="breadcrumb">Home / ${page.title}</p>
      </div>
    </div>
    <div class="container">
      <div class="static-page-container">
        ${page.content}
        <div class="static-page-footer">
          <button class="btn btn-outline-naif" onclick="window.history.back()">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            GET BACK TO SHOPPING
          </button>
        </div>
      </div>
    </div>
  `;
}

// --- PRODUCT GRID & HOVER LOGIC ---
let hoverIntervals: Map<string, any> = new Map();

function createProductCard(product: Product) {
  const coverImage = product.images[0] || '';
  const isFav = state.favorites.some(f => f.id === product.id);
  
  return `
    <div class="product-card" data-id="${product.id}">
      <div class="product-image">
        <span class="product-badge">${product.category}</span>
        <button class="btn-favorite-trigger card-favorite-btn ${isFav ? 'active' : ''}" data-id="${product.id}" title="Favorilere Ekle">
          <i class="ph${isFav ? '-fill' : ''} ph-heart"></i>
        </button>
        <img src="${coverImage}" alt="${product.name}" id="img-${product.id}" loading="lazy">
        <div class="card-action-overlay">
          <button class="add-to-cart-btn" data-id="${product.id}" title="Sepete Ekle">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
          </button>
        </div>
      </div>
      <div class="product-info">
        <h3 class="product-title" onclick="navigateTo('/product/${product.id}')">${product.name}</h3>
        <p class="product-price">£${product.price.toFixed(2)}</p>
        <a href="/product/${product.id}" class="quick-view">VIEW DETAILS</a>
      </div>
    </div>
  `;
}

function renderProducts(filteredList = products) {
  const container = document.getElementById('product-list');
  if (!container) return;

  if (filteredList.length === 0) {
    container.innerHTML = '<div class="no-results">No products found matching your criteria.</div>';
    return;
  }

  container.innerHTML = filteredList.map(p => createProductCard(p)).join('');
  attachProductCardListeners();
}

function attachProductCardListeners() {
  const cards = document.querySelectorAll('.product-card');
  cards.forEach(card => {
    const id = (card as HTMLElement).dataset.id || '';
    const product = products.find(p => p.id === id);
    if (!product) return;

    const img = card.querySelector(`#img-${id}`) as HTMLImageElement;

    card.addEventListener('mouseenter', () => {
      let currentIdx = 0;
      if (product.images.length <= 1) return;
      const interval = setInterval(() => {
        currentIdx = (currentIdx + 1) % product.images.length;
        img.style.opacity = '0.5';
        setTimeout(() => {
          img.src = product.images[currentIdx];
          img.style.opacity = '1';
        }, 200);
      }, 1500);
      hoverIntervals.set(id, interval);
    });

    card.addEventListener('mouseleave', () => {
      const interval = hoverIntervals.get(id);
      if (interval) clearInterval(interval);
      img.src = product.images[0];
    });

    card.querySelector('.product-image')?.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.add-to-cart-btn') || target.closest('.btn-favorite-trigger')) return;
        navigateTo(`/product/${id}`);
    });
  });
}

function renderPDP(product: Product) {
  document.getElementById('pdp-breadcrumb-cat')!.textContent = product.category;
  document.getElementById('pdp-breadcrumb-name')!.textContent = product.name;
  document.getElementById('pdp-cat')!.textContent = product.category;
  document.getElementById('pdp-title')!.textContent = product.name;
  document.getElementById('pdp-price')!.textContent = `£${product.price.toFixed(2)}`;
  document.getElementById('pdp-desc')!.innerHTML = product.description || "No detailed description available.";
  
  const mainImg = document.getElementById('pdp-main-img') as HTMLImageElement;
  mainImg.src = product.images[0];

  const thumbs = document.getElementById('pdp-thumbs')!;
  thumbs.innerHTML = product.images.map((img, i) => 
    `<img src="${img}" class="${i === 0 ? 'active' : ''}" data-idx="${i}">`
  ).join('');

  thumbs.querySelectorAll('img').forEach(img => {
    img.onclick = () => {
      thumbs.querySelector('.active')?.classList.remove('active');
      img.classList.add('active');
      mainImg.src = img.src;
    };
  });

  // PDP Actions
  const qtyInput = document.getElementById('pdp-qty') as HTMLInputElement;
  qtyInput.value = "1";
  document.getElementById('pdp-plus')!.onclick = () => { qtyInput.value = (parseInt(qtyInput.value) + 1).toString(); };
  document.getElementById('pdp-minus')!.onclick = () => { if (parseInt(qtyInput.value) > 1) qtyInput.value = (parseInt(qtyInput.value) - 1).toString(); };
  document.getElementById('pdp-add-to-cart')!.onclick = () => addToCart(product, parseInt(qtyInput.value));

  // Breadcrumb back
  const backBtn = document.querySelector('.back-link') as HTMLElement;
  if (backBtn) {
    backBtn.onclick = (e: MouseEvent) => {
      e.preventDefault();
      navigateTo('/');
    };
  }

  // Favorite logic
  const favBtn = document.getElementById('pdp-fav-btn');
  const isFav = state.favorites.some(f => f.id === product.id);
  if (favBtn) {
    favBtn.className = `btn-favorite-trigger ${isFav ? 'active' : ''}`;
    favBtn.innerHTML = `<i class="ph${isFav ? '-fill' : ''} ph-heart"></i>`;
    favBtn.onclick = () => toggleFavorite(product.id);
  }
}

// --- SIDEBAR & FILTERS ---
function renderSidebar() {
  const catList = document.getElementById('category-filter-list');
  if (!catList) return;

  const categories = Array.from(new Set(products.map(p => p.category)));
  catList.innerHTML = `<li class="category-item ${!state.currentCategory ? 'active' : ''}" data-cat="all"><span>All Products</span></li>` + 
    categories.map(cat => {
      const count = products.filter(p => p.category === cat).length;
      return `<li class="category-item ${state.currentCategory === cat ? 'active' : ''}" data-cat="${cat}">
        <span>${cat}</span>
        <span class="category-count">${count}</span>
      </li>`;
    }).join('');

  catList.querySelectorAll('.category-item').forEach(item => {
    item.addEventListener('click', () => {
      const cat = (item as HTMLElement).dataset.cat;
      state.currentCategory = cat === 'all' ? null : cat || null;
      applyFilters();
      renderSidebar();
    });
  });

  document.getElementById('apply-price-filter')?.addEventListener('click', () => {
    const min = (document.getElementById('min-price') as HTMLInputElement).value;
    const max = (document.getElementById('max-price') as HTMLInputElement).value;
    state.minPrice = min ? parseFloat(min) : 0;
    state.maxPrice = max ? parseFloat(max) : Infinity;
    applyFilters();
  });

  document.getElementById('clear-filters')?.addEventListener('click', () => {
    state.currentCategory = null;
    state.minPrice = 0;
    state.maxPrice = Infinity;
    (document.getElementById('min-price') as HTMLInputElement).value = '';
    (document.getElementById('max-price') as HTMLInputElement).value = '';
    applyFilters();
    renderSidebar();
  });
}

function applyFilters() {
  const filtered = products.filter(p => {
    const matchesCat = !state.currentCategory || p.category === state.currentCategory;
    const matchesPrice = p.price >= state.minPrice && p.price <= state.maxPrice;
    return matchesCat && matchesPrice;
  });
  renderProducts(filtered);
}

// --- CART LOGIC ---
function renderCartDrawer() {
  const body = document.getElementById('cart-drawer-body');
  if (!body) return;

  if (state.cartItems.length === 0) {
    body.innerHTML = `
      <div class="empty-cart-msg">
        <i class="ph ph-shopping-bag"></i>
        <p>Your cart is empty</p>
        <a href="/all-products" class="btn btn-primary" onclick="event.preventDefault(); toggleCart(); navigateTo('/all-products')">START SHOPPING</a>
      </div>
    `;
    updateCartTotals();
    return;
  }
  body.innerHTML = state.cartItems.map(item => `
    <div class="cart-item">
      <img src="${item.images[0]}" alt="${item.name}">
      <div class="cart-item-details">
        <h4 class="cart-item-title">${item.name}</h4>
        <p class="cart-item-price">£${item.price.toFixed(2)}</p>
        <div class="qty-controls">
          <button class="qty-btn" onclick="updateCartQty('${item.id}', -1)">-</button>
          <input type="text" value="${item.quantity}" class="qty-input" readonly>
          <button class="qty-btn" onclick="updateCartQty('${item.id}', 1)">+</button>
        </div>
        <button class="remove-item" onclick="removeFromCart('${item.id}')">Remove</button>
      </div>
    </div>
  `).join('') + `
    <div class="cart-coupon-section">
      ${state.activeCoupon ? `
        <div class="applied-coupon">
          <div class="coupon-info">
            <i class="ph ph-tag"></i>
            <span class="applied-code">${state.activeCoupon.code}</span>
            <span class="applied-amount">(-${state.activeCoupon.discountType === 'percentage' ? `${state.activeCoupon.discountValue}%` : `£${state.activeCoupon.discountValue.toFixed(2)}`})</span>
          </div>
          <button class="remove-coupon-btn" onclick="removeCoupon()">
            <i class="ph ph-x"></i>
          </button>
        </div>
      ` : `
        <div class="coupon-input-group">
          <input type="text" id="coupon-input" placeholder="Coupon Code" onkeyup="if(event.key==='Enter') applyCoupon()">
          <button onclick="applyCoupon()">APPLY</button>
        </div>
      `}
    </div>
  `;
  
  updateCartTotals();
}

(window as any).updateCartQty = (id: string, delta: number) => {
  const item = state.cartItems.find(i => i.id === id);
  if (item) {
    item.quantity += delta;
    if (item.quantity <= 0) {
      removeFromCart(id);
    } else {
      state.cartCount = state.cartItems.reduce((acc, i) => acc + i.quantity, 0);
      localStorage.setItem('sfuya_cart', JSON.stringify(state.cartItems));
      updateCartBadge();
      updateCartTitleCount();
      renderCartDrawer();
    }
  }
};

function removeFromCart(id: string) {
  state.cartItems = state.cartItems.filter(i => i.id !== id);
  state.cartCount = state.cartItems.reduce((acc, i) => acc + i.quantity, 0);
  localStorage.setItem('sfuya_cart', JSON.stringify(state.cartItems));
  updateCartBadge();
  updateCartTitleCount();
  renderCartDrawer();
  showToast("Product removed from cart", 'error');
}
(window as any).removeFromCart = removeFromCart;

function addToCart(product: Product, qty: number = 1) {
  const existing = state.cartItems.find(item => item.id === product.id);
  if (existing) {
    existing.quantity += qty;
  } else {
    state.cartItems.push({ ...product, quantity: qty });
  }
  
  state.cartCount = state.cartItems.reduce((acc, item) => acc + item.quantity, 0);
  localStorage.setItem('sfuya_cart', JSON.stringify(state.cartItems));
  
  updateCartBadge();
  updateCartTitleCount();
  renderCartDrawer();
  
  showToast(`${product.name} added to cart!`);
}

function updateCartTotals() {
  const subtotal = state.cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  let discount = 0;
  
  const discountEl = document.getElementById('summary-discount');
  const discountRow = document.getElementById('summary-discount-row');
  
  if (state.activeCoupon) {
    const now = Date.now();
    // Re-verify on calculation
    const isValid = now >= state.activeCoupon.startDate && 
                    now <= state.activeCoupon.endDate && 
                    subtotal >= state.activeCoupon.minSpend;
    
    if (isValid) {
      if (state.activeCoupon.discountType === 'percentage') {
        discount = (subtotal * state.activeCoupon.discountValue) / 100;
      } else {
        discount = state.activeCoupon.discountValue;
      }
      
      if (discountEl) discountEl.textContent = `-£${discount.toFixed(2)}`;
      discountRow?.classList.remove('auth-hidden');
    } else {
      // Coupon no longer valid (e.g. subtotal dropped below minSpend)
      state.activeCoupon = null;
      localStorage.removeItem('sfuya_active_coupon');
      discountRow?.classList.add('auth-hidden');
      showToast("Coupon removed: Conditions no longer met.", 'error');
    }
  } else {
    discountRow?.classList.add('auth-hidden');
  }

  const grandTotal = subtotal - discount;
  
  document.getElementById('cart-total-price')!.textContent = `£${grandTotal.toFixed(2)}`;
  const summarySubtotal = document.getElementById('summary-subtotal');
  if (summarySubtotal) summarySubtotal.textContent = `£${subtotal.toFixed(2)}`;
  
  const cartBadgeTotal = document.getElementById('cart-total-badge');
  if (cartBadgeTotal) cartBadgeTotal.textContent = `£${grandTotal.toFixed(2)}`;
}

async function handleCheckout() {
  if (state.cartItems.length === 0) {
    showToast("Your cart is empty!", 'error');
    return;
  }

  showToast("Preparing your secure checkout...", 'success');
  
  try {
    // New Cart API format (lines instead of lineItems)
    const lines = state.cartItems.map(item => ({
      merchandiseId: item.shopifyVariantId,
      quantity: item.quantity
    }));

    console.log('Creating cart with lines:', lines);

    const data = await fetchShopify(CREATE_CART_MUTATION, {
      input: { lines }
    });

    if (data.cartCreate.userErrors && data.cartCreate.userErrors.length > 0) {
      const firstError = data.cartCreate.userErrors[0];
      console.error('Shopify Cart User Error:', data.cartCreate.userErrors);
      showToast(`Checkout Error: ${firstError.message}`, 'error');
      return;
    }

    const cart = data.cartCreate.cart;
    if (cart && cart.checkoutUrl) {
      // FORCE REDIRECT TO SHOPIFY DOMAIN TO AVOID SPA 404 LOOP
      const forcedCheckoutUrl = cart.checkoutUrl.replace('www.sfuya.com', 'cd3889.myshopify.com').replace('sfuya.com', 'cd3889.myshopify.com');
      console.log('Cart created successfully! Redirecting to:', forcedCheckoutUrl);
      window.location.href = forcedCheckoutUrl;
    } else {
      throw new Error("Checkout URL not found in cart response");
    }
  } catch (err) {
    console.error('Checkout Exception:', err);
    showToast("Checkout failed. Please check console for details.", 'error');
  }
}

(window as any).handleCheckout = handleCheckout;

(window as any).applyCoupon = () => {
  const input = document.getElementById('coupon-input') as HTMLInputElement;
  const code = input.value.trim().toUpperCase();
  
  if (!code) {
    showToast("Please enter a coupon code.", 'error');
    return;
  }
  
  const subtotal = state.cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const coupon = state.coupons.find(c => c.code === code);
  
  if (!coupon) {
    showToast("Invalid coupon code.", 'error');
    return;
  }
  
  const now = Date.now();
  
  if (now < coupon.startDate) {
    showToast("This coupon is not active yet.", 'error');
    return;
  }
  
  if (now > coupon.endDate) {
    showToast("This coupon has expired.", 'error');
    return;
  }
  
  if (subtotal < coupon.minSpend) {
    showToast(`Minimum spend of £${coupon.minSpend} required for this coupon.`, 'error');
    return;
  }
  
  state.activeCoupon = coupon;
  localStorage.setItem('sfuya_active_coupon', JSON.stringify(coupon));
  showToast(`Coupon ${code} applied successfully!`);
  input.value = '';
  updateCartTotals();
  renderCartDrawer();
};

(window as any).removeCoupon = () => {
  state.activeCoupon = null;
  localStorage.removeItem('sfuya_active_coupon');
  showToast("Coupon removed.");
  updateCartTotals();
  renderCartDrawer();
};

function updateCartBadge() {
  const b = document.getElementById('cart-count');
  if (b) {
    b.textContent = state.cartCount.toString();
    b.classList.remove('pop');
    void b.offsetWidth;
    b.classList.add('pop');
  }
}

function updateCartTitleCount() {
    const titleCount = document.getElementById('cart-item-count-title');
    const summaryCount = document.getElementById('summary-item-count');
    if (titleCount) titleCount.textContent = state.cartCount.toString();
    if (summaryCount) summaryCount.textContent = state.cartCount.toString();
}

// --- UTILS ---
function showToast(message: string, type: 'success' | 'error' = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' 
    ? `<svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
    : `<svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

  toast.innerHTML = `
    ${icon}
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 10);

  // Remove after 3s
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

// --- FAVORITES LOGIC ---
function toggleFavorite(id: string) {
  const index = state.favorites.findIndex(f => f.id === id);
  if (index > -1) {
    state.favorites.splice(index, 1);
    showToast("Product removed from favorites", 'error');
  } else {
    state.favorites.push({ id, addedAt: Date.now() });
    showToast("Product added to favorites!");
  }
  localStorage.setItem('sfuya_favorites', JSON.stringify(state.favorites));
  handleRoute(); // Refresh UI
}

// --- GOOGLE AUTH HANDLER ---
const GOOGLE_CLIENT_ID = "109089876620-lcfroaerkebagbtniircggvnhhfhe0u5.apps.googleusercontent.com";

// Logic to process user data (shared by One Tap and Redirect)
function processGoogleUser(payload: any) {
  state.isLoggedIn = true;
  state.user = {
    name: payload.name,
    email: payload.email,
    picture: payload.picture
  };
  
  // Persist to localStorage
  localStorage.setItem('sfuya_user', JSON.stringify(state.user));
  
  if ((window as any).renderAuthStatus) {
    (window as any).renderAuthStatus();
  }
  document.getElementById('auth-modal')?.classList.add('auth-hidden');
  showToast(`Welcome, ${state.user.name}!`);
}

// This handles Google One Tap and old id_token responses
(window as any).handleCredentialResponse = (response: any) => {
  const payload = decodeJwtResponse(response.credential);
  processGoogleUser(payload);
};

// Full-page Google OAuth2 redirect (no popup)
(window as any).googleSignInRedirect = () => {
  const redirectUri = window.location.origin; 
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=openid%20email%20profile`;
  window.location.href = authUrl;
};

// Fetch user info using the access token (used after full-page redirect)
async function fetchGoogleUserInfo(accessToken: string) {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const userData = await response.json();
    processGoogleUser(userData);
  } catch (error) {
    console.error('Error fetching Google user info:', error);
    showToast('Failed to get user info from Google');
  }
}

// Check for OAuth2 redirect callback (access_token in URL hash)
function handleOAuthRedirect() {
  const hash = window.location.hash;
  if (hash && hash.includes('access_token=')) {
    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');
    if (accessToken) {
      fetchGoogleUserInfo(accessToken);
      // Clean URL hash without reloading
      history.replaceState(null, '', window.location.pathname);
    }
  }
}

// Keep the old decoder just in case
function decodeJwtResponse(token: string) {
  let base64Url = token.split('.')[1];
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  let jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
  return JSON.parse(jsonPayload);
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  // Check for Google OAuth redirect first
  handleOAuthRedirect();
  
  initRouter();
  
  // Hydrate UI from localStorage
  if ((window as any).renderAuthStatus) (window as any).renderAuthStatus();
  updateCartBadge();
  updateCartTitleCount();
  renderCartDrawer();
  if ((window as any).google && !state.isLoggedIn) {
    (window as any).google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (window as any).handleCredentialResponse,
      auto_prompt: true,
      locale: 'en'
    });
    // One Tap prompt (not a popup, just a small notification)
    (window as any).google.accounts.id.prompt();
  }

  // Cookie Banner Logic
  const cookieBanner = document.getElementById('cookie-consent-banner');
  if (!state.cookieAccepted && cookieBanner) {
    setTimeout(() => {
      cookieBanner.classList.remove('auth-hidden');
    }, 2000);
  }

  document.getElementById('accept-cookies')?.addEventListener('click', () => {
    state.cookieAccepted = true;
    localStorage.setItem('sfuya_cookies', 'accepted');
    cookieBanner?.classList.add('auth-hidden');
  });

  document.getElementById('decline-cookies')?.addEventListener('click', () => {
    cookieBanner?.classList.add('auth-hidden');
  });

  // Footer Accordion
  document.getElementById('cookie-policy-trigger')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('footer-legal-accordion')?.classList.toggle('accordion-expansion-active');
  });
  
  setTimeout(() => {
    document.body.classList.add('ready');
  }, 50);
  
  // Auth logic
  // --- USER PROFILE & DROPDOWN ---
  const renderAuthStatus = () => {
    const c = document.getElementById('auth-container');
    if (!c) return;

    if (state.isLoggedIn) {
      c.innerHTML = `
        <div class="user-nav-wrapper">
          <div class="user-profile-nav" id="profile-trigger">
            <img src="${state.user.picture}" class="user-avatar" id="user-avatar-img" alt="Profile" referrerpolicy="no-referrer" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(state.user.name || 'User')}&background=0D8ABC&color=fff';">
            <span class="user-name">${state.user.name?.split(' ')[0]}</span>
            <i class="ph ph-caret-down"></i>
          </div>
          
          <div class="user-dropdown auth-hidden" id="user-dropdown-menu">
            <div class="dropdown-header">
              <p class="dropdown-user-email">${state.user.email}</p>
            </div>
            <div class="dropdown-divider"></div>
            <ul class="dropdown-list">
              <li>
                <a href="/favorites" class="dropdown-item" id="nav-favorites">
                  <i class="ph ph-heart"></i> My Favorites
                </a>
              </li>
              <li>
                <a href="/coupons" class="dropdown-item" id="nav-coupons">
                  <i class="ph ph-ticket"></i> My Coupons
                </a>
              </li>
            </ul>
            <div class="dropdown-divider"></div>
            <button class="dropdown-logout-btn" id="logout-trigger">
              <i class="ph ph-sign-out"></i> Logout
            </button>
          </div>
        </div>
      `;

      // Toggle Dropdown
      const trigger = document.getElementById('profile-trigger');
      const menu = document.getElementById('user-dropdown-menu');
      
      trigger?.addEventListener('click', (e) => {
        e.stopPropagation();
        menu?.classList.toggle('auth-hidden');
      });

      // Close on outside click
      document.addEventListener('click', (e) => {
        if (!trigger?.contains(e.target as Node) && !menu?.contains(e.target as Node)) {
          menu?.classList.add('auth-hidden');
        }
      });

      // Simple nav handling for mock items
      document.getElementById('nav-orders')?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast("Orders feature coming soon to SFUYA!");
      });


      // Logout logic
      document.getElementById('logout-trigger')?.addEventListener('click', () => {
        state.isLoggedIn = false;
        state.user = { name: null, email: null, picture: null };
        
        // Clear from localStorage
        localStorage.removeItem('sfuya_user');
        
        renderAuthStatus();
        showToast('Logged out successfully');
      });
    } else {
      c.innerHTML = `
        <button class="btn-login-pill" id="login-trigger">
          LOGIN
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
        </button>
      `;
      document.getElementById('login-trigger')?.addEventListener('click', () => {
        document.getElementById('auth-modal')?.classList.remove('auth-hidden');
        // Give modal time to animate in
        setTimeout(() => {
          (window as any).renderGoogleButton?.();
        }, 400);
      });
    }
  };

  (window as any).renderAuthStatus = renderAuthStatus;

  const renderGoogleButton = () => {
    const container = document.getElementById('google-login-btn-container');
    if (!container || state.isLoggedIn) return; // Only render if container exists and user is logged out
    
    // Clear and Redraw
    container.innerHTML = '';
    
    (window as any).google?.accounts.id.renderButton(
      container,
      { 
        theme: "outline", 
        size: "large", 
        width: "100%", 
        shape: "pill",
        text: "signup_with",
        locale: "en" 
      }
    );
  };

  (window as any).renderGoogleButton = renderGoogleButton;

  // Form switching logic + Re-rendering Google button
  document.getElementById('go-to-register')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-container')?.classList.add('auth-hidden');
    document.getElementById('signup-container')?.classList.remove('auth-hidden');
  });

  document.getElementById('go-to-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('signup-container')?.classList.add('auth-hidden');
    document.getElementById('login-container')?.classList.remove('auth-hidden');
    // Re-render when switching back to login
    setTimeout(renderGoogleButton, 50);
  });

  renderAuthStatus();

  // Checkout Gate
  document.querySelector('.btn-checkout-primary')?.addEventListener('click', () => {
    if (!state.isLoggedIn) {
      showToast("Please login to proceed with payment");
      document.getElementById('auth-modal')?.classList.remove('auth-hidden');
      renderGoogleButton();
    } else {
      showToast("Redirecting to checkout...");
    }
  });

  // Dynamic Pay Buttons Gate
  document.querySelectorAll('.pay-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!state.isLoggedIn) {
        showToast("Please login to continue");
        document.getElementById('auth-modal')?.classList.remove('auth-hidden');
        renderGoogleButton();
      }
    });
  });

  document.getElementById('close-auth-modal')?.addEventListener('click', () => {
    document.getElementById('auth-modal')?.classList.add('auth-hidden');
  });

  // --- ADVANCED AUTH & SECURITY LOGIC ---

  // 1. Password Strength Validation (Signup)
  const signupPwInput = document.getElementById('signup-password') as HTMLInputElement;
  const pwBar = document.getElementById('pw-strength-bar');

  signupPwInput?.addEventListener('input', () => {
    const val = signupPwInput.value;
    const hasUpper = /[A-Z]/.test(val);
    const hasDigit = /[0-9]/.test(val);

    pwBar?.classList.remove('weak', 'medium', 'strong');

    if (val.length === 0) {
      // 0 width
    } else if (hasUpper && hasDigit) {
      pwBar?.classList.add('strong');
    } else if (hasUpper || hasDigit) {
      pwBar?.classList.add('medium');
    } else {
      pwBar?.classList.add('weak');
    }
  });

  const signupForm = document.getElementById('signup-form');
  signupForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailInput = signupForm.querySelector('input[type="email"]') as HTMLInputElement;
    const email = emailInput.value;
    const nameInput = signupForm.querySelector('input[type="text"]') as HTMLInputElement;
    const nameParts = nameInput.value.split(' ');

    // Simulate existing user check
    if (email === "kerem@sfuya.com" || email === "test@test.com") {
      showToast("This email is already registered. Please sign in.");
    } else {
      showToast("Account created successfully! Welcome to SFUYA.");
      state.isLoggedIn = true;
      state.user = { name: nameParts[0] || 'User', email: email, picture: null };
      
      // Persist to localStorage
      localStorage.setItem('sfuya_user', JSON.stringify(state.user));
      
      renderAuthStatus();
      document.getElementById('auth-modal')?.classList.add('auth-hidden');
      showToast(`Welcome back, ${state.user.name}!`);
    }
  });

  // 2. Login Logic & Forgot Password Trigger
  const loginForm = document.getElementById('login-form');
  const forgotLink = document.getElementById('forgot-pw-trigger');

  loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    // Simulate failure for demo unless specific password used
    const pw = (document.getElementById('login-password') as HTMLInputElement).value;
    if (pw !== "password123") {
      showToast("Incorrect password. Try again.");
      forgotLink?.classList.remove('auth-hidden');
    } else {
      showToast("Access granted. Loading dashboard...");
      state.isLoggedIn = true;
      state.user = { name: "Demo User", email: "demo@sfuya.com", picture: null };
      renderAuthStatus();
      document.getElementById('auth-modal')?.classList.add('auth-hidden');
    }
  });

  // 3. View Switching (Forgot PW Flow)
  const loginContainer = document.getElementById('login-container');
  const forgotContainer = document.getElementById('forgot-pw-container');
  const verifyContainer = document.getElementById('verification-container');
  // signupContainer is used in another scope, keeping it or removing if truly unused below


  forgotLink?.addEventListener('click', (e) => {
    e.preventDefault();
    loginContainer?.classList.add('auth-hidden');
    forgotContainer?.classList.remove('auth-hidden');
  });

  document.querySelectorAll('.back-to-login-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      forgotContainer?.classList.add('auth-hidden');
      verifyContainer?.classList.add('auth-hidden');
      loginContainer?.classList.remove('auth-hidden');
    });
  });

  document.getElementById('forgot-pw-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    showToast("Sent a 6-digit code to your email");
    forgotContainer?.classList.add('auth-hidden');
    verifyContainer?.classList.remove('auth-hidden');
  });

  // 4. Verification Code Auto-Focus
  const codeInputs = document.querySelectorAll('.code-input') as NodeListOf<HTMLInputElement>;
  codeInputs.forEach((input, index) => {
    input.addEventListener('input', () => {
      if (input.value && index < codeInputs.length - 1) {
        codeInputs[index + 1].focus();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && index > 0) {
        codeInputs[index - 1].focus();
      }
    });
  });

  document.getElementById('verify-code-btn')?.addEventListener('click', () => {
    const code = Array.from(codeInputs).map(i => i.value).join('');
    if (code.length === 6) {
      showToast("Code verified. Set your new password.");
      verifyContainer?.classList.add('auth-hidden');
      loginContainer?.classList.remove('auth-hidden'); // In real app, goes to new password view
    } else {
      showToast("Please enter all 6 digits.");
    }
  });

  // --- HERO ANIMATION (EXPANDING TEXT) ---
  const marketingTexts = [
    "THOUSANDS OF PRODUCTS, IN YOUR CART WITH ONE CLICK.",
    "ELEVATING YOUR DIGITAL LIFESTYLE",
    "PREMIUM TECH ACCESSORIES",
    "TIMELESS AESTHETICS"
  ];
  let textIndex = 0;
  const dynamicText = document.getElementById('dynamic-text');

  const updateHeroText = () => {
    if (!dynamicText) return;
    dynamicText.classList.remove('wide-anim');
    dynamicText.classList.add('hidden');
    
    setTimeout(() => {
      dynamicText.textContent = marketingTexts[textIndex];
      dynamicText.classList.remove('hidden');
      dynamicText.classList.add('wide-anim');
      textIndex = (textIndex + 1) % marketingTexts.length;
    }, 100);
  };

  if (dynamicText) {
    updateHeroText();
    setInterval(updateHeroText, 4000);
  }

   // Cart Toggle
   const cartOverlay = document.getElementById('cart-drawer-overlay');
   document.getElementById('cart-trigger')?.addEventListener('click', (e) => {
     e.preventDefault();
     cartOverlay?.classList.remove('auth-hidden');
     document.body.style.overflow = 'hidden';
   });
   document.getElementById('close-cart-drawer')?.addEventListener('click', () => {
     cartOverlay?.classList.add('auth-hidden');
     document.body.style.overflow = '';
   });

  // Global Click Handlers (Favorites & Cart)
  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    
    // Add to cart
    const addBtn = t.closest('.add-to-cart-btn');
    if (addBtn) {
      e.preventDefault();
      e.stopPropagation();
      const id = (addBtn as HTMLElement).dataset.id || '';
      const product = products.find(p => p.id === id);
      if (product) addToCart(product, 1);
    }

    // Toggle Favorite
    const favBtn = t.closest('.btn-favorite-trigger');
    if (favBtn) {
      e.preventDefault();
      e.stopPropagation();
      const id = (favBtn as HTMLElement).dataset.id || '';
      if (id) toggleFavorite(id);
    }
  });

  // Logo Navigation (Clean URL)
  const handleLogoClick = (e: MouseEvent) => {
    e.preventDefault();
    if (window.location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigateTo('/');
    }
  };

  document.getElementById('nav-logo')?.addEventListener('click', handleLogoClick);
  document.getElementById('footer-logo')?.addEventListener('click', handleLogoClick);

  // Cart Page / Checkout Listener
  document.getElementById('checkout-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    (window as any).handleCheckout();
  });

  // Continue shopping listener
  document.querySelector('.btn-continue-shopping')?.addEventListener('click', () => {
    cartOverlay?.classList.add('auth-hidden');
    document.body.style.overflow = '';
  });

  // Initialize Shopify Products
  async function initShopifyData() {
    try {
      // Fetch Products
      const prodData = await fetchShopify(GET_PRODUCTS_QUERY);
      const shopifyProducts = prodData.products.edges.map((edge: any) => mapShopifyProduct(edge.node));
      setProducts(shopifyProducts);

      // Fetch Collections
      const collData = await fetchShopify(GET_COLLECTIONS_QUERY);
      state.collections = collData.collections.edges.map((edge: any) => edge.node);
      
      // Re-run route to render with live data
      handleRoute();
      console.log('Shopify data loaded:', { products: shopifyProducts.length, collections: state.collections.length });
    } catch (err) {
      console.error('Failed to load Shopify data:', err);
      showToast("Store connection failed. Check your API token.", 'error');
    }
  }

  initShopifyData();
  console.log('SFUYA Marketplace initialized');
});
// trigger deploy
// final deploy
