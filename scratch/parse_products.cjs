const fs = require('fs');

const csvPath = 'C:\\Users\\acer\\Desktop\\eticaretsite\\products_export_1.csv';
const content = fs.readFileSync(csvPath, 'utf8');

function parseShopifyCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i+1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      currentRow.push(currentField);
      if (currentRow.length > 1 || currentRow[0] !== '') {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
      if (char === '\r' && nextChar === '\n') i++; // skip \n in \r\n
    } else {
      currentField += char;
    }
  }
  // catch last row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }
  return rows;
}

const allRows = parseShopifyCSV(content);
const headers = allRows[0].map(h => h.trim());
const dataRows = allRows.slice(1);

const headerIndex = {};
headers.forEach((h, i) => headerIndex[h] = i);

const productsMap = new Map();

dataRows.forEach(cols => {
  const handle = cols[headerIndex['Handle']];
  if (!handle) return;

  const title = cols[headerIndex['Title']];
  const body = cols[headerIndex['Body (HTML)']];
  const price = cols[headerIndex['Variant Price']];
  const category = cols[headerIndex['Product Category']];
  const imgSrc = cols[headerIndex['Image Src']];

  if (!productsMap.has(handle)) {
    let cleanCat = "General";
    if (category) {
       const parts = category.split(' > ');
       cleanCat = parts[parts.length - 1] || parts[0];
    }

    productsMap.set(handle, {
      id: handle,
      name: title || "",
      price: parseFloat(price) || 0,
      category: cleanCat,
      images: imgSrc ? [imgSrc] : [],
      description: body ? body.replace(/<[^>]*>?/gm, ' ').replace(/\s\s+/g, ' ').trim() : ""
    });
  } else {
    const p = productsMap.get(handle);
    if (imgSrc && !p.images.includes(imgSrc)) {
      p.images.push(imgSrc);
    }
    if (!p.name && title) p.name = title;
    if (p.price === 0 && price) p.price = parseFloat(price);
    if (!p.description && body) p.description = body.replace(/<[^>]*>?/gm, ' ').replace(/\s\s+/g, ' ').trim();
  }
});

const productsArray = Array.from(productsMap.values()).filter(p => p.name);

console.log('export interface Product {');
console.log('  id: string;');
console.log('  name: string;');
console.log('  price: number;');
console.log('  category: string;');
console.log('  images: string[];');
console.log('  description: string;');
console.log('}\n');
console.log('export const products: Product[] = ' + JSON.stringify(productsArray, null, 2) + ';');
