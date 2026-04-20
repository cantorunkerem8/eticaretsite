
export const SHOPIFY_CONFIG = {
  domain: 'ot3889.myshopify.com',
  storefrontAccessToken: import.meta.env.VITE_SHOPIFY_ACCESS_TOKEN,
  apiVersion: '2024-01'
};

export async function fetchShopify(query: string, variables = {}) {
  const endpoint = `https://${SHOPIFY_CONFIG.domain}/api/${SHOPIFY_CONFIG.apiVersion}/graphql.json`;
  
  if (!SHOPIFY_CONFIG.storefrontAccessToken) {
    console.error('CRITICAL: Shopify Access Token is MISSING (undefined). Check Vercel Env Vars.');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': SHOPIFY_CONFIG.storefrontAccessToken || '',
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await response.json();
  if (json.errors) {
    console.error('Shopify API Error:', json.errors);
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
          collections(first: 1) {
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

export const CREATE_CHECKOUT_MUTATION = `
  mutation checkoutCreate($input: CheckoutCreateInput!) {
    checkoutCreate(input: $input) {
      checkout {
        id
        webUrl
      }
      checkoutUserErrors {
        code
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

