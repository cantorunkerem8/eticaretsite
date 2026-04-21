export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  images: string[];
  description: string;
  vendor: string; // Brand/manufacturer name
  shopifyVariantId?: string; // Needed for checkout
}

export let products: Product[] = [];

export function mapShopifyProduct(node: any): Product {
  return {
    id: node.handle, // Use handle for clean URLs
    name: node.title,
    price: parseFloat(node.variants.edges[0]?.node.price.amount || '0'),
    category: node.productType || (node.collections.edges[0]?.node.title) || 'General',
    images: node.images.edges.map((e: any) => e.node.url),
    description: node.description,
    vendor: node.vendor || 'SFUYA',
    shopifyVariantId: node.variants.edges[0]?.node.id
  };
}

export function setProducts(newProducts: Product[]) {
  products.length = 0;
  products.push(...newProducts);
}

