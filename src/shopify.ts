
export const SHOPIFY_CONFIG = {
  domain: 'cd3889.myshopify.com',
  storefrontAccessToken: import.meta.env.VITE_SHOPIFY_ACCESS_TOKEN,
  apiVersion: '2024-04'
};

export async function fetchShopify(query: string, variables = {}) {
  const endpoint = `https://${SHOPIFY_CONFIG.domain}/api/${SHOPIFY_CONFIG.apiVersion}/graphql.json`;

  if (!SHOPIFY_CONFIG.storefrontAccessToken) {
    console.warn('Shopify Token check: MISSING (VITE_SHOPIFY_ACCESS_TOKEN is undefined)');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': SHOPIFY_CONFIG.storefrontAccessToken || '',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    console.error(`Shopify API Fetch Failed! Status: ${response.status} ${response.statusText}`);
    const errBody = await response.text();
    console.error('Error Body:', errBody);
    throw new Error(`Shopify API Error: ${response.status}`);
  }

  const json = await response.json();
  if (json.errors) {
    console.error('Shopify API Error (Detailed):', JSON.stringify(json.errors, null, 2));
    throw new Error('Shopify API Error');
  }
  return json.data;
}

export const GET_PRODUCTS_QUERY = `
  {
    products(first: 50) {
      edges {
        node {
          id
          title
          handle
          description
          productType
          vendor
          collections(first: 5) {
            edges {
              node {
                title
              }
            }
          }
          images(first: 10) {
            edges {
              node {
                url
              }
            }
          }
          variants(first: 1) {
            edges {
              node {
                id
                price {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const CREATE_CART_MUTATION = `
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


export const GET_COLLECTIONS_QUERY = `
  {
    collections(first: 20) {
      edges {
        node {
          id
          title
          handle
          image {
            url
          }
        }
      }
    }
  }
`;

export const GET_SITE_SETTINGS_QUERY = `
  {
    metaobjects(type: "site_ayarlari", first: 1) {
      edges {
        node {
          id
          handle
          hero: field(key: "hero_mesajlari") {
            value
          }
          slogan: field(key: "slogan") {
            value
          }
          email: field(key: "destek_e_posta") {
            value
          }
          address: field(key: "adres") {
            value
          }
          whatsapp: field(key: "whatsapp_numarasi") {
            value
          }
        }
      }
    }
  }
`;

export const GET_PAGES_QUERY = `
  {
    pages(first: 50) {
      edges {
        node {
          handle
          title
          body
        }
      }
    }
  }
`;

export const GET_MENU_QUERY = `
  {
    menu(handle: "main-menu") {
      items {
        title
        url
      }
    }
  }
`;

