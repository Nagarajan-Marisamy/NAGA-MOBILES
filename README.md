# Mobile Shop Billing Software

A complete billing software website for mobile shops built with HTML, CSS, and JavaScript. No build tools or frameworks required - just open and use!

## Features

- **Product Management (CRUD)**: Add, edit, and delete products
- **Shopping Cart**: Add products to cart by clicking on product images
- **Manual Price Entry**: Enter prices manually at billing time
- **Invoice Generation**: Generate and print invoices
- **Sales Reports**: 
  - Daily reports with individual item sales and revenue
  - Monthly reports with individual item sales and revenue
- **Mobile Responsive**: Fully responsive design for mobile, tablet, and desktop
- **Data Persistence**: All data stored in browser localStorage

## Getting Started

Simply open `index.html` in your web browser. No installation or build process required!

### Files Structure

```
website/
├── index.html      # Main HTML file
├── styles.css      # All styles
├── script.js       # All JavaScript functionality
└── README.md       # This file
```

## Usage

1. **Products Tab**: 
   - View all products
   - Click "Add Product" to add new products
   - Click edit/delete buttons on product cards to manage products
   - Click product images to add them to cart

2. **Cart Tab**: 
   - View cart items
   - Enter prices for each item
   - Adjust quantities using +/- buttons
   - Remove items or clear entire cart
   - Generate invoice when all prices are entered

3. **Reports Tab**: 
   - Switch between Daily and Monthly reports
   - Select date/month and generate reports
   - View individual item sales and revenue
   - See overall totals

## Default Products

The app comes with 7 pre-populated products:
- Wired Earphones
- Wired Earphones High Quality
- Mobile
- Remote
- Charger
- Temper (Tempered Glass)
- Pouch

## Browser Compatibility

Works in all modern browsers that support:
- ES6 JavaScript
- localStorage API
- CSS Grid and Flexbox

## Data Storage

All data is stored in browser localStorage:
- Products: `mobile_shop_products`
- Invoices: `mobile_shop_invoices`
- Sales: `mobile_shop_sales`
- Cart: `mobile_shop_cart`

Data persists across page refreshes but is specific to each browser.
