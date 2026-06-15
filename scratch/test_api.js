
const SHOPIFY_CONFIG = {
  domain: 'cd3889.myshopify.com',
  storefrontAccessToken: 'eccd5506535afd8bb587f18f589a3833',
  apiVersion: '2024-04'
};

async function testShopify() {
  const endpoint = `https://${SHOPIFY_CONFIG.domain}/api/${SHOPIFY_CONFIG.apiVersion}/graphql.json`;
  
  // 1. Test Fetching Products
  const productsQuery = `
    {
      products(first: 5) {
        edges {
          node {
            id
            title
            variants(first: 1) {
              edges {
                node {
                  id
                  price {
                    amount
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  console.log('Testing Storefront API connection...');
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': SHOPIFY_CONFIG.storefrontAccessToken,
      },
      body: JSON.stringify({ query: productsQuery }),
    });
    
    const json = await res.json();
    if (json.errors) {
      console.error('API Error:', json.errors);
      return;
    }
    
    console.log('Successfully fetched products!');
    const products = json.data.products.edges;
    if (products.length === 0) {
      console.log('No products found in the store.');
      return;
    }

    const firstProduct = products[0].node;
    const variantId = firstProduct.variants.edges[0].node.id;
    console.log(`First product: ${firstProduct.title}, Variant ID: ${variantId}`);

    // 2. Test Creating Cart (Checkout URL)
    const cartMutation = `
      mutation cartCreate($input: CartInput) {
        cartCreate(input: $input) {
          cart {
            id
            checkoutUrl
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    console.log('Testing cart creation and checkout URL generation...');
    const cartRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': SHOPIFY_CONFIG.storefrontAccessToken,
      },
      body: JSON.stringify({
        query: cartMutation,
        variables: {
          input: {
            lines: [
              {
                merchandiseId: variantId,
                quantity: 1
              }
            ]
          }
        }
      }),
    });

    const cartJson = await cartRes.json();
    if (cartJson.errors) {
      console.error('Cart API Error:', cartJson.errors);
      return;
    }

    const cartCreate = cartJson.data.cartCreate;
    if (cartCreate.userErrors && cartCreate.userErrors.length > 0) {
      console.error('Cart User Errors:', cartCreate.userErrors);
      return;
    }

    console.log('Cart created successfully!');
    console.log('Checkout URL:', cartCreate.cart.checkoutUrl);

  } catch (error) {
    console.error('Request failed:', error);
  }
}

testShopify();
