export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  images: string[];
  description: string;
  vendor: string; // Brand/manufacturer name
  available: boolean;
  shopifyVariantId?: string; // Needed for checkout
  ebayLink?: string;
}

export let products: Product[] = [];

export function mapShopifyProduct(node: any): Product {
  const collections = node.collections.edges.map((e: any) => e.node.title);
  
  // Collections to ignore
  const ignoreList = ['home page', 'frontpage', 'all products', 'featured', 'new arrivals'];
  
  // Target categories we want to prioritize
  const targetCategories = ['Garden', 'Health', 'Beauty', 'Home and Kitchen', 'Clothing', 'Tools & Home Improvement', 'Pet', 'Jewelry'];
  
  let category = '';

  // 1. Special redirection for brands/technical terms to categories
  const hasSuperox = collections.some((c: string) => c.toLowerCase().includes('superox')) || (node.productType && node.productType.toLowerCase().includes('superox'));
  
  if (hasSuperox) {
    const isAnimal = node.title.toLowerCase().includes('animal') || node.title.toLowerCase().includes('pet');
    category = isAnimal ? 'Pet' : 'Beauty';
  } else {
    // 2. Check if product belongs to any of our target category collections
    const matchedTarget = targetCategories.find(target => 
      collections.some((c: string) => c.toLowerCase() === target.toLowerCase())
    );

    if (matchedTarget) {
      category = matchedTarget;
    } else {
      // 3. Fallback to productType
      category = node.productType;

      // 4. Fallback to first non-ignored collection
      if (!category || category.toLowerCase() === 'general') {
        const validCollection = collections.find((t: string) => !ignoreList.includes(t.toLowerCase()));
        if (validCollection) category = validCollection;
      }
    }
  }

  // Final fallback
  if (!category || category.toLowerCase() === 'general') category = 'Beauty';

  return {
    id: node.handle, // Use handle for clean URLs
    name: node.title,
    price: parseFloat(node.variants.edges[0]?.node.price.amount || '0'),
    category: category,
    images: node.images.edges.map((e: any) => e.node.url),
    description: node.description,
    vendor: node.vendor || 'SFUYA',
    available: (typeof node.totalInventory === 'number') ? node.totalInventory > 0 : (node.availableForSale ?? (node.variants.edges[0]?.node.availableForSale ?? true)),
    shopifyVariantId: node.variants.edges[0]?.node.id,
    ebayLink: node.metafield?.value || undefined
  };
}

export function setProducts(newProducts: Product[]) {
  products.length = 0;
  products.push(...newProducts);
}

