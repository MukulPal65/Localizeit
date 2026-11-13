import type { Product } from '@/types'
import { isoDaysFromNow, isoMinutesAgo } from '@/utils'

let updatedCursor = 0

function product(
  id: string,
  shopId: string,
  categoryId: string,
  name: string,
  unit: string,
  price: number,
  stock: number,
  extra: Partial<Product> = {},
): Product {
  updatedCursor += 1
  return {
    id,
    shopId,
    categoryId,
    name,
    unit,
    price,
    stock,
    inStock: stock > 0,
    stockUpdatedAt: isoMinutesAgo(12 + ((updatedCursor * 37) % 280)),
    description:
      extra.description ??
      `${name} (${unit}) available at your neighbourhood store. Prices updated by the shopkeeper.`,
    tags: extra.tags ?? [],
    ...extra,
  }
}

export const seedProducts: Product[] = [
  // ── s1 · Sharma Kirana, Gyanpur ─────────────────────────────
  product('p-s1-rice', 's1', 'kirana', 'India Gate Basmati Rice', '1 kg', 118, 24, {
    mrp: 132,
    tags: ['rice', 'basmati', 'grain'],
  }),
  product('p-s1-sona', 's1', 'kirana', 'Sona Masoori Rice', '1 kg', 82, 40, {
    mrp: 92,
    tags: ['rice', 'grain'],
  }),
  product('p-s1-atta', 's1', 'kirana', 'Aashirvaad Whole Wheat Atta', '5 kg', 268, 18, {
    mrp: 295,
    tags: ['atta', 'flour', 'wheat'],
  }),
  product('p-s1-oil', 's1', 'kirana', 'Fortune Sunflower Oil', '1 L', 142, 12, {
    mrp: 158,
    tags: ['oil', 'cooking'],
  }),
  product('p-s1-mustard', 's1', 'kirana', 'Kachi Ghani Mustard Oil', '1 L', 168, 9, {
    tags: ['oil', 'mustard', 'cooking'],
  }),
  product('p-s1-salt', 's1', 'kirana', 'Tata Salt', '1 kg', 28, 60, {
    tags: ['salt', 'namak'],
  }),
  product('p-s1-sugar', 's1', 'kirana', 'Madhur Sugar', '1 kg', 46, 30, {
    tags: ['sugar', 'cheeni'],
  }),
  product('p-s1-dal', 's1', 'kirana', 'Toor Dal', '1 kg', 165, 14, {
    mrp: 182,
    tags: ['dal', 'pulse', 'arhar'],
  }),
  product('p-s1-tea', 's1', 'kirana', 'Tata Tea Premium', '500 g', 245, 8, {
    tags: ['tea', 'chai'],
  }),
  product('p-s1-biscuit', 's1', 'kirana', 'Parle-G Biscuits', '250 g', 26, 50, {
    tags: ['biscuit', 'snack'],
  }),
  product('p-s1-soap', 's1', 'kirana', 'Dettol Soap', '3 × 125 g', 99, 22, {
    tags: ['soap', 'bath'],
  }),
  product('p-s1-detergent', 's1', 'kirana', 'Surf Excel Detergent', '1 kg', 118, 0, {
    tags: ['detergent', 'wash'],
  }),
  product('p-s1-maggi', 's1', 'kirana', 'Maggi Noodles', '4 pack', 56, 16, {
    tags: ['noodles', 'snack'],
  }),
  product('p-s1-milk', 's1', 'kirana', 'Amul Taaza Toned Milk', '1 L', 56, 30, {
    expiry: isoDaysFromNow(4),
    tags: ['milk', 'dairy'],
  }),
  product('p-s1-besan', 's1', 'kirana', 'Besan', '500 g', 55, 12, {
    tags: ['besan', 'gram flour'],
  }),
  product('p-s1-poha', 's1', 'kirana', 'Poha', '500 g', 32, 20, {
    tags: ['poha', 'breakfast'],
  }),

  // ── s2 · Gupta Dairy, Gyanpur ───────────────────────────────
  product('p-s2-milk', 's2', 'dairy', 'Amul Taaza Toned Milk', '500 ml', 28, 40, {
    expiry: isoDaysFromNow(3),
    tags: ['milk', 'dairy'],
  }),
  product('p-s2-curd', 's2', 'dairy', 'Fresh Dahi (Curd)', '400 g', 40, 12, {
    expiry: isoDaysFromNow(2),
    tags: ['curd', 'dahi'],
  }),
  product('p-s2-paneer', 's2', 'dairy', 'Fresh Paneer', '200 g', 95, 8, {
    mrp: 110,
    expiry: isoDaysFromNow(1),
    tags: ['paneer', 'dairy'],
    deal: { dealPrice: 75, expiresAt: isoDaysFromNow(1), qtyLeft: 6 },
  }),
  product('p-s2-ghee', 's2', 'dairy', 'Desi Cow Ghee', '500 ml', 340, 5, {
    tags: ['ghee', 'dairy'],
  }),
  product('p-s2-butter', 's2', 'dairy', 'Amul Butter', '500 g', 285, 10, {
    expiry: isoDaysFromNow(25),
    tags: ['butter', 'dairy'],
  }),
  product('p-s2-barfi', 's2', 'dairy', 'Khoya Barfi', '250 g', 140, 0, {
    tags: ['sweets', 'mithai'],
  }),
  product('p-s2-lassi', 's2', 'dairy', 'Sweet Lassi', '200 ml', 25, 18, {
    expiry: isoDaysFromNow(2),
    tags: ['lassi', 'drink'],
  }),
  product('p-s2-chena', 's2', 'dairy', 'Bengali Chhena', '250 g', 110, 4, {
    expiry: isoDaysFromNow(1),
    tags: ['chena', 'sweets'],
  }),

  // ── s3 · Bhadohi Stationery ─────────────────────────────────
  product('p-s3-notebook', 's3', 'stationery', 'Classmate Notebook', '200 pages', 60, 45, {
    mrp: 70,
    tags: ['notebook', 'school'],
  }),
  product('p-s3-longbook', 's3', 'stationery', 'Navneet Long Notebook', '172 pages', 55, 30, {
    tags: ['notebook', 'longbook'],
  }),
  product('p-s3-pen', 's3', 'stationery', 'Reynolds Ball Pens', 'pack of 5', 40, 60, {
    tags: ['pen', 'writing'],
  }),
  product('p-s3-pencil', 's3', 'stationery', 'Apsara Pencils', '10 pack', 35, 50, {
    tags: ['pencil', 'school'],
  }),
  product('p-s3-geometry', 's3', 'stationery', 'Camlin Geometry Box', '1 pc', 185, 12, {
    mrp: 210,
    tags: ['geometry', 'maths'],
  }),
  product('p-s3-a4', 's3', 'stationery', 'JK A4 Paper Ream', '500 sheets', 320, 6, {
    tags: ['paper', 'a4', 'office'],
  }),
  product('p-s3-glue', 's3', 'stationery', 'Fevicol Adhesive', '100 g', 45, 25, {
    tags: ['glue', 'craft'],
  }),
  product('p-s3-chalk', 's3', 'stationery', 'Dustless White Chalk', '100 pcs', 25, 0, {
    tags: ['chalk', 'school'],
  }),

  // ── s4 · Maa Bhagwati Sabzi, Aurai ──────────────────────────
  product('p-s4-potato', 's4', 'vegetables', 'Desi Potato', '1 kg', 24, 50, {
    tags: ['potato', 'aloo'],
  }),
  product('p-s4-onion', 's4', 'vegetables', 'Onion', '1 kg', 32, 35, {
    tags: ['onion', 'pyaz'],
  }),
  product('p-s4-tomato', 's4', 'vegetables', 'Hybrid Tomato', '1 kg', 28, 20, {
    tags: ['tomato', 'tamatar'],
    deal: { dealPrice: 22, expiresAt: isoDaysFromNow(2), qtyLeft: 14 },
  }),
  product('p-s4-spinach', 's4', 'vegetables', 'Palak (Spinach)', '1 bundle', 12, 15, {
    tags: ['spinach', 'palak', 'greens'],
  }),
  product('p-s4-coriander', 's4', 'vegetables', 'Coriander', '100 g', 10, 0, {
    tags: ['dhania', 'coriander'],
  }),
  product('p-s4-brinjal', 's4', 'vegetables', 'Brinjal (Baingan)', '500 g', 18, 22, {
    tags: ['brinjal', 'baingan'],
  }),
  product('p-s4-peas', 's4', 'vegetables', 'Green Peas', '500 g', 35, 10, {
    tags: ['peas', 'matar'],
  }),
  product('p-s4-banana', 's4', 'vegetables', 'Banana', '6 pcs', 30, 25, {
    tags: ['banana', 'fruit'],
  }),

  // ── s5 · Jai Bharat Medical, Gyanpur ────────────────────────
  product('p-s5-paracetamol', 's5', 'pharmacy', 'Paracetamol 500 mg', 'strip of 10', 22, 40, {
    expiry: isoDaysFromNow(300),
    tags: ['fever', 'pain'],
  }),
  product('p-s5-ors', 's5', 'pharmacy', 'ORS Electrolyte Powder', '1 sachet', 22, 30, {
    expiry: isoDaysFromNow(240),
    tags: ['ors', 'hydration'],
  }),
  product('p-s5-vitd', 's5', 'pharmacy', 'Vitamin D3 60K', '4 capsules', 165, 12, {
    expiry: isoDaysFromNow(180),
    tags: ['vitamin', 'supplement'],
  }),
  product('p-s5-cough', 's5', 'pharmacy', 'Cough Syrup', '100 ml', 95, 7, {
    expiry: isoDaysFromNow(150),
    tags: ['cough', 'syrup'],
  }),
  product('p-s5-bandage', 's5', 'pharmacy', 'Sterile Bandage Roll', '1 pc', 30, 25, {
    tags: ['bandage', 'first aid'],
  }),
  product('p-s5-thermometer', 's5', 'pharmacy', 'Digital Thermometer', '1 pc', 240, 4, {
    tags: ['thermometer', 'device'],
  }),

  // ── s6 · Verma Hardware, Gyanpur ────────────────────────────
  product('p-s6-paint', 's6', 'hardware', 'Asian Paints Tractor Emulsion', '1 L', 310, 10, {
    tags: ['paint', 'wall'],
  }),
  product('p-s6-pipe', 's6', 'hardware', 'PVC Pipe', '10 ft', 180, 18, {
    tags: ['pipe', 'plumbing'],
  }),
  product('p-s6-hammer', 's6', 'hardware', 'Steel Claw Hammer', '1 pc', 165, 5, {
    tags: ['hammer', 'tool'],
  }),
  product('p-s6-bulb', 's6', 'hardware', 'LED Bulb 9W', '1 pc', 95, 22, {
    tags: ['bulb', 'led', 'light'],
  }),
  product('p-s6-lock', 's6', 'hardware', 'Brass Door Lock', '1 pc', 285, 6, {
    tags: ['lock', 'door'],
  }),
  product('p-s6-wire', 's6', 'hardware', 'Copper Wire', '10 m', 340, 8, {
    tags: ['wire', 'electrical'],
  }),
  product('p-s6-tape', 's6', 'hardware', 'Teflon Tape', '2 pcs', 20, 40, {
    tags: ['tape', 'plumbing'],
  }),

  // ── s7 · Saree Sansar, Bhadohi ──────────────────────────────
  product('p-s7-banarasi', 's7', 'fashion', 'Banarasi Silk Saree', '1 pc', 2450, 4, {
    mrp: 3200,
    tags: ['saree', 'silk', 'banarasi', 'wedding'],
  }),
  product('p-s7-cotton', 's7', 'fashion', 'Cotton Handloom Saree', '1 pc', 850, 8, {
    tags: ['saree', 'cotton', 'handloom'],
  }),
  product('p-s7-kurta', 's7', 'fashion', 'Cotton Kurta (Men)', '1 pc', 620, 10, {
    tags: ['kurta', 'men'],
  }),
  product('p-s7-dupatta', 's7', 'fashion', 'Chanderi Dupatta', '1 pc', 380, 12, {
    tags: ['dupatta', 'chanderi'],
  }),
  product('p-s7-stole', 's7', 'fashion', 'Woollen Stole', '1 pc', 450, 0, {
    tags: ['stole', 'winter'],
  }),
  product('p-s7-blouse', 's7', 'fashion', 'Readymade Blouse', '1 pc', 320, 15, {
    tags: ['blouse', 'stitched'],
  }),

  // ── s8 · Nalanda Fresh Mart, Biharsharif ────────────────────
  product('p-s8-rice', 's8', 'kirana', 'Sona Masoori Rice', '1 kg', 76, 60, {
    mrp: 85,
    tags: ['rice', 'grain'],
  }),
  product('p-s8-basmati', 's8', 'kirana', 'Basmati Rice', '1 kg', 110, 25, {
    tags: ['rice', 'basmati'],
  }),
  product('p-s8-atta', 's8', 'kirana', 'Aashirvaad Whole Wheat Atta', '5 kg', 262, 14, {
    mrp: 290,
    tags: ['atta', 'flour'],
  }),
  product('p-s8-oil', 's8', 'kirana', 'Fortune Sunflower Oil', '1 L', 138, 20, {
    mrp: 155,
    tags: ['oil', 'cooking'],
  }),
  product('p-s8-salt', 's8', 'kirana', 'Tata Salt', '1 kg', 27, 80, {
    tags: ['salt'],
  }),
  product('p-s8-milk', 's8', 'kirana', 'Sudha Toned Milk', '500 ml', 26, 30, {
    expiry: isoDaysFromNow(3),
    tags: ['milk', 'dairy', 'sudha'],
  }),
  product('p-s8-sattu', 's8', 'kirana', 'Bihari Sattu', '500 g', 65, 18, {
    tags: ['sattu', 'bihar'],
  }),
  product('p-s8-chana', 's8', 'kirana', 'Chana Dal', '1 kg', 95, 22, {
    tags: ['dal', 'chana'],
  }),
  product('p-s8-notebook', 's8', 'stationery', 'Classmate Notebook', '200 pages', 58, 35, {
    mrp: 70,
    tags: ['notebook', 'school'],
  }),
  product('p-s8-tea', 's8', 'kirana', 'Tata Tea Premium', '500 g', 240, 9, {
    tags: ['tea', 'chai'],
  }),

  // ── s9 · Rajput Mobile Care, Gyanpur ────────────────────────
  product('p-s9-usbc', 's9', 'electronics', 'USB-C Charging Cable', '1 m', 149, 25, {
    tags: ['cable', 'usb-c', 'charging'],
  }),
  product('p-s9-glass', 's9', 'electronics', 'Tempered Glass Guard', '1 pc', 120, 18, {
    tags: ['screen guard', 'tempered'],
  }),
  product('p-s9-earphones', 's9', 'electronics', 'Wired Earphones', '1 pc', 399, 7, {
    tags: ['earphones', 'audio'],
  }),
  product('p-s9-charger', 's9', 'electronics', '20W Fast Charger', '1 pc', 549, 5, {
    tags: ['charger', 'fast'],
  }),
  product('p-s9-cover', 's9', 'electronics', 'Silicone Phone Cover', '1 pc', 199, 0, {
    tags: ['cover', 'case'],
  }),
  product('p-s9-powerbank', 's9', 'electronics', 'Power Bank 10000 mAh', '1 pc', 899, 3, {
    mrp: 1099,
    tags: ['power bank', 'battery'],
  }),

  // ── s10 · Anand Bakery, Varanasi ────────────────────────────
  product('p-s10-bread', 's10', 'bakery', 'Fresh Milk Bread', '400 g', 35, 20, {
    expiry: isoDaysFromNow(3),
    tags: ['bread', 'bakery'],
  }),
  product('p-s10-cake', 's10', 'bakery', 'Chocolate Truffle Cake', '500 g', 320, 6, {
    mrp: 380,
    expiry: isoDaysFromNow(4),
    tags: ['cake', 'birthday', 'chocolate'],
  }),
  product('p-s10-rusk', 's10', 'bakery', 'Anand Rusk', '400 g', 45, 12, {
    expiry: isoDaysFromNow(20),
    tags: ['rusk', 'tea time'],
  }),
  product('p-s10-cookies', 's10', 'bakery', 'Butter Cookies', '250 g', 80, 10, {
    expiry: isoDaysFromNow(18),
    tags: ['cookies', 'bakery'],
  }),
  product('p-s10-puff', 's10', 'bakery', 'Veg Puff', '1 pc', 25, 15, {
    expiry: isoDaysFromNow(1),
    tags: ['puff', 'snack'],
    deal: { dealPrice: 18, expiresAt: isoDaysFromNow(1), qtyLeft: 9 },
  }),
  product('p-s10-photocake', 's10', 'bakery', 'Photo Cake', '1 kg', 750, 2, {
    tags: ['cake', 'custom', 'photo'],
  }),

  // ── s11 · Kishan Agro, Aurai ────────────────────────────────
  product('p-s11-dap', 's11', 'agriculture', 'DAP Fertiliser', '50 kg', 1350, 8, {
    tags: ['khaad', 'fertiliser', 'dap'],
  }),
  product('p-s11-urea', 's11', 'agriculture', 'Urea Fertiliser', '45 kg', 266, 15, {
    tags: ['urea', 'fertiliser'],
  }),
  product('p-s11-seeds', 's11', 'agriculture', 'Hybrid Tomato Seeds', '10 g', 45, 40, {
    tags: ['seeds', 'tomato', 'beej'],
  }),
  product('p-s11-sprayer', 's11', 'agriculture', 'Knapsack Sprayer', '16 L', 1450, 3, {
    mrp: 1650,
    tags: ['sprayer', 'equipment'],
  }),
  product('p-s11-compost', 's11', 'agriculture', 'Vermicompost', '5 kg', 120, 20, {
    tags: ['compost', 'organic'],
  }),
  product('p-s11-pump', 's11', 'agriculture', 'Diesel Water Pump', '1 pc', 8900, 0, {
    tags: ['pump', 'irrigation'],
  }),
  product('p-s11-bags', 's11', 'agriculture', 'Jute Gunny Bags', '10 pcs', 350, 12, {
    tags: ['bags', 'jute'],
  }),

  // ── s12 · Chhindwara Kirana Bazaar ──────────────────────────
  product('p-s12-rice', 's12', 'kirana', 'Basmati Rice', '1 kg', 105, 30, {
    tags: ['rice', 'basmati'],
  }),
  product('p-s12-atta', 's12', 'kirana', 'MP Wheat Atta', '5 kg', 245, 16, {
    tags: ['atta', 'wheat'],
  }),
  product('p-s12-oil', 's12', 'kirana', 'Soybean Refined Oil', '1 L', 125, 22, {
    tags: ['oil', 'soybean'],
  }),
  product('p-s12-dal', 's12', 'kirana', 'Toor Dal', '1 kg', 158, 18, {
    tags: ['dal', 'arhar'],
  }),
  product('p-s12-tea', 's12', 'kirana', 'Tata Tea Premium', '500 g', 238, 7, {
    tags: ['tea', 'chai'],
  }),
  product('p-s12-notebook', 's12', 'stationery', 'Classmate Notebook', '200 pages', 62, 20, {
    tags: ['notebook', 'school'],
  }),
  product('p-s12-sugar', 's12', 'kirana', 'Sugar', '1 kg', 44, 35, {
    tags: ['sugar'],
  }),
  product('p-s12-poha', 's12', 'kirana', 'Poha', '500 g', 30, 25, {
    tags: ['poha', 'breakfast'],
  }),

  // ── s13 · Banswara Tribal Haat ──────────────────────────────
  product('p-s13-rice', 's13', 'kirana', 'Tribal Desi Rice', '1 kg', 68, 40, {
    tags: ['rice', 'desi'],
  }),
  product('p-s13-makai', 's13', 'kirana', 'Maize Flour (Makai Atta)', '1 kg', 32, 25, {
    tags: ['makai', 'flour'],
  }),
  product('p-s13-ghee', 's13', 'dairy', 'A2 Desi Ghee', '500 ml', 380, 6, {
    tags: ['ghee', 'a2'],
  }),
  product('p-s13-saree', 's13', 'fashion', 'Kota Doria Saree', '1 pc', 1150, 5, {
    tags: ['saree', 'kota', 'handloom'],
  }),
  product('p-s13-dupatta', 's13', 'fashion', 'Bandhani Dupatta', '1 pc', 220, 14, {
    tags: ['dupatta', 'bandhani'],
  }),
  product('p-s13-chana', 's13', 'kirana', 'Chana Dal', '1 kg', 92, 20, {
    tags: ['dal', 'chana'],
  }),
  product('p-s13-honey', 's13', 'kirana', 'Forest Honey', '500 g', 260, 9, {
    tags: ['honey', 'forest'],
  }),
  product('p-s13-papad', 's13', 'kirana', 'Handmade Papad', '250 g', 60, 0, {
    tags: ['papad', 'snack'],
  }),

  // ── s14 · Deepak General Store, Biharsharif ─────────────────
  product('p-s14-rice', 's14', 'kirana', 'Sona Masoori Rice', '1 kg', 78, 45, {
    tags: ['rice'],
  }),
  product('p-s14-salt', 's14', 'kirana', 'Tata Salt', '1 kg', 26, 60, {
    tags: ['salt'],
  }),
  product('p-s14-oil', 's14', 'kirana', 'Fortune Sunflower Oil', '1 L', 140, 15, {
    tags: ['oil', 'cooking'],
  }),
  product('p-s14-notebook', 's14', 'stationery', 'Navneet Long Notebook', '172 pages', 52, 28, {
    tags: ['notebook'],
  }),
  product('p-s14-milk', 's14', 'kirana', 'Sudha Toned Milk', '500 ml', 26, 20, {
    expiry: isoDaysFromNow(3),
    tags: ['milk'],
  }),
  product('p-s14-biscuit', 's14', 'kirana', 'Parle-G Biscuits', '250 g', 25, 40, {
    tags: ['biscuit'],
  }),
]

export const productById = (id: string) => seedProducts.find((p) => p.id === id)
