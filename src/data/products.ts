import { Product, Coupon } from '../types';

export const PLACEHOLDER_PRODUCT_IMAGE = '/assets/products/placeholder.svg';

export const VALID_COUPONS: Coupon[] = [
  {
    code: 'NYX10',
    discountPercent: 10,
    description: '10% off your entire order',
    minOrderAmount: 499,
  },
  {
    code: 'DRIP20',
    discountPercent: 20,
    description: '20% off hardware drop',
    minOrderAmount: 1499,
  },
  {
    code: 'CYBER15',
    discountPercent: 15,
    description: '15% off midnight cyber collection',
    minOrderAmount: 999,
  },
];

export const CATEGORIES_DATA = [
  {
    name: 'Necklaces',
    slug: 'necklaces',
    image: '/nyxdrip/triple cross/IMG-20261002-WA0000.jpg',
    description: 'Layered hardware, cross chains, and cosmic pendants.',
    count: 5,
  },
  {
    name: 'Pendants',
    slug: 'pendants',
    image: '/assets/client-refresh/ch-pendant.webp',
    description: 'Sculpted gothic crosses, dark relics, and cyber emblems.',
    count: 4,
  },
  {
    name: 'Wallets',
    slug: 'wallets',
    image: '/nyxdrip/Black Merttalic Wallet/IMG-20261002-WA0001.jpg',
    description: 'Metallic finished hardware and streetwear wallets.',
    count: 2,
  },
  {
    name: 'Bracelets',
    slug: 'bracelets',
    image: '/nyxdrip/Ch bracelete 1.0/IMG-20261002-WA0006.jpg',
    description: 'Heavy industrial links and hardware cuffs.',
    count: 1,
  },
  {
    name: 'Studs / Earrings',
    slug: 'studs',
    image: '/nyxdrip/Royal Fleur Struds/IMG-20261002-WA0011.jpg',
    description: 'Gothic fleur studs and sculpted ear hardware.',
    count: 1,
  },
  {
    name: 'Caps',
    slug: 'caps',
    image: '/nyxdrip/Y2k Devil Cap/IMG-20261002-WA0039.jpg',
    description: 'Dark streetwear headwear with sculptural devil horns.',
    count: 1,
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    image: '/assets/aistudio/WhatsApp_Image_2026-10-30_at_5.37.28_PM_ec535360.jpeg',
    description: 'Futuristic Y2K shades and signature cyber eyewear accessories.',
    count: 3,
  },
];

/**
 * Historical slug alias mapping to ensure backward-compatibility
 * with saved bookmarks, local carts, and external links.
 */
export const SLUG_ALIASES: Record<string, string> = {
  'ch-bracelet-1-0': 'ch-bracelet',
  'y2k-devil-cap': 'y2k-cap',
  'bersek-pendant': 'berserk-pendant',
  'angled-creed-necklace': 'angel-creed-necklace',
  'angle-creed-necklace': 'angel-creed-necklace',
};

export const PRODUCTS: Product[] = [
  // 1. Triple Cross CH Necklace — ₹349
  {
    id: 'prod-triple-cross-ch-necklace',
    slug: 'triple-cross-ch-necklace',
    name: 'Triple Cross CH Necklace',
    price: 349,
    category: 'Necklaces',
    description: 'Triple Cross CH Necklace from the NYx DRIPstore collection. Heavy industrial cross layered chains in blackened chrome finish.',
    images: [
      '/assets/client-refresh/triple-cross-ch-necklace.webp',
      '/nyxdrip/triple cross/IMG-20261002-WA0000.jpg',
      '/assets/client-refresh/triple-cross-ch-necklace-secondary.webp',
    ],
    stock: 10,
    isNewArrival: true,
  },

  // 2. Y2K Glass — ₹149
  {
    id: 'prod-y2k-glass',
    slug: 'y2k-glass',
    name: 'Y2K Glass',
    price: 149,
    category: 'Accessories',
    style: 'Y2K',
    description: 'Y2K Glass from the NYx DRIPstore collection. Futuristic cyber aesthetic eyewear accessory.',
    images: [
      '/assets/client-refresh/y2k-glass.webp',
    ],
    stock: 10,
    isNewArrival: true,
  },

  // 3. Black Metallic Wallet — ₹449
  {
    id: 'prod-black-metallic-wallet',
    slug: 'black-metallic-wallet',
    name: 'Black Metallic Wallet',
    price: 449,
    category: 'Wallets',
    color: 'Black',
    description: 'Black Metallic Wallet from the NYx DRIPstore collection. Sleek metallic cyber hardware finish.',
    images: [
      '/nyxdrip/Black Merttalic Wallet/IMG-20261002-WA0001.jpg',
      '/nyxdrip/Black Merttalic Wallet/IMG-20261002-WA0005.jpg',
    ],
    stock: 10,
    isNewArrival: true,
  },

  // 4. Angled Creed Necklace — ₹399
  {
    id: 'prod-angel-creed-necklace',
    slug: 'angel-creed-necklace',
    name: 'Angel Creed Necklace',
    price: 399,
    category: 'Necklaces',
    description: 'Angel Creed Necklace from the NYx DRIPstore collection. Sculpted gothic wing and cross insignia.',
    images: [
      '/assets/client-refresh/angel-creed-necklace.webp',
      '/nyxdrip/Angle creed necklace/IMG-20261002-WA0008.jpg',
      '/assets/client-refresh/angel-creed-necklace-secondary.webp',
    ],
    stock: 10,
    isNewArrival: true,
  },

  // 5. CH Bracelet — ₹200
  {
    id: 'prod-ch-bracelet',
    slug: 'ch-bracelet',
    name: 'CH Bracelet',
    price: 200,
    category: 'Bracelets',
    description: 'CH Bracelet from the NYx DRIPstore collection. Heavy gothic link hardware bracelet.',
    images: [
      '/nyxdrip/Ch bracelete 1.0/IMG-20261002-WA0006.jpg',
      '/nyxdrip/Ch bracelete 1.0/IMG-20261002-WA0040.jpg',
    ],
    stock: 10,
    isNewArrival: true,
  },

  // 6. Royal Fleur Studs — ₹99 (1 PC)
  {
    id: 'prod-royal-fleur-studs',
    slug: 'royal-fleur-studs',
    name: 'Royal Fleur Studs',
    price: 99,
    pieceUnit: '1 PC',
    category: 'Studs / Earrings',
    description: 'Royal Fleur Studs from the NYx DRIPstore collection. Price is for 1 PC (Single Piece). Intricate sculpted silver fleur hardware.',
    images: [
      '/assets/client-refresh/royal-fleur-studs-product.webp',
      '/assets/client-refresh/royal-fleur-studs-worn.webp',
    ],
    stock: 10,
    isNewArrival: true,
  },

  // 7. Y2K Cap — ₹199
  {
    id: 'prod-y2k-cap',
    slug: 'y2k-cap',
    name: 'Y2K Cap',
    price: 199,
    category: 'Caps',
    style: 'Y2K',
    description: 'Y2K Cap from the NYx DRIPstore collection. Dark streetwear headwear featuring signature sculptural horns.',
    images: [
      '/assets/client-refresh/y2k-cap.webp',
    ],
    stock: 10,
    isNewArrival: true,
  },

  // 8. CH Pendant — ₹149
  {
    id: 'prod-ch-pendant',
    slug: 'ch-pendant',
    name: 'CH Pendant',
    price: 149,
    category: 'Pendants',
    description: 'CH Pendant from the NYx DRIPstore collection. Sculpted gothic cross centerpiece.',
    images: [
      '/assets/client-refresh/ch-pendant.webp',
    ],
    stock: 10,
    isNewArrival: true,
  },

  // 9. Red Cross Pendant — ₹159
  {
    id: 'prod-red-cross-pendant',
    slug: 'red-cross-pendant',
    name: 'Red Cross Pendant',
    price: 159,
    category: 'Pendants',
    color: 'Red',
    description: 'Red Cross Pendant from the NYx DRIPstore collection. Crimson accent chrome cross pendant.',
    images: [
      '/nyxdrip2.0/red cross pendent/file_00000000ccc081f48693e3f5597033c2.png',
    ],
    stock: 10,
    isNewArrival: true,
  },

  // 10. Double Cross Pendant — ₹169
  {
    id: 'prod-double-cross-pendant',
    slug: 'double-cross-pendant',
    name: 'Double Cross Pendant',
    price: 169,
    category: 'Pendants',
    description: 'Double Cross Pendant from the NYx DRIPstore collection. Interlocking double cross motif.',
    images: [
      '/assets/client-refresh/double-cross-pendant-new.webp',
    ],
    stock: 10,
    isNewArrival: true,
  },

  // 11. Berserk Pendant — ₹149
  {
    id: 'prod-berserk-pendant',
    slug: 'berserk-pendant',
    name: 'Berserk Pendant',
    price: 149,
    category: 'Pendants',
    description: 'Berserk Pendant from the NYx DRIPstore collection. Dark fantasy emblem hardware.',
    images: [
      '/assets/client-refresh/berserk-pendant.webp',
    ],
    stock: 10,
    isNewArrival: true,
  },

  // 12. Blue Metallic Wallet — ₹449
  {
    id: 'prod-blue-metallic-wallet',
    slug: 'blue-metallic-wallet',
    name: 'Blue Metallic Wallet',
    price: 449,
    category: 'Wallets',
    color: 'Blue',
    description: 'Blue Metallic Wallet from the NYx DRIPstore collection. Deep cobalt metallic sheen cyber finish.',
    images: [
      '/assets/client-refresh/blue-metallic-wallet-front.webp',
      '/assets/client-refresh/blue-metallic-wallet-inside.webp',
    ],
    stock: 10,
    isNewArrival: true,
  },

  // 13. Red Cosmic Star Necklace — ₹299
  {
    id: 'prod-red-cosmic-star-necklace',
    slug: 'red-cosmic-star-necklace',
    name: 'Red Cosmic Star Necklace',
    price: 299,
    category: 'Necklaces',
    color: 'Red',
    description: 'Red Cosmic Star Necklace from the NYx DRIPstore collection. Celestial star motif with blood red core.',
    images: [
      '/nyxdrip/Red Cosmic Star Necklace/IMG-20261002-WA0031.jpg',
      '/assets/client-refresh/red-cosmic-star-necklace.webp',
    ],
    stock: 10,
    isNewArrival: true,
  },

  // 14. Y2K Heart Necklace — ₹299
  {
    id: 'prod-y2k-heart-necklace',
    slug: 'y2k-heart-necklace',
    name: 'Y2K Heart Necklace',
    price: 299,
    category: 'Necklaces',
    style: 'Y2K',
    description: 'Y2K Heart Necklace from the NYx DRIPstore collection. Cyber barbed chrome heart silhouette.',
    images: [
      '/nyxdrip/Y2k heart Necklace/IMG-20261002-WA0041.jpg',
      '/nyxdrip/Y2k heart Necklace/IMG-20261002-WA0042.jpg',
    ],
    stock: 10,
    isNewArrival: true,
  },

  // 15. Snake Cross Necklace — ₹299
  {
    id: 'prod-snake-cross-necklace',
    slug: 'snake-cross-necklace',
    name: 'Snake Cross Necklace',
    price: 299,
    category: 'Necklaces',
    description: 'Snake Cross Necklace from the NYx DRIPstore collection. Serpentine chrome cross entwined chain.',
    images: [
      '/assets/client-refresh/snake-cross-necklace.webp',
    ],
    stock: 10,
    isNewArrival: true,
  },

  // 16. Chrome Earbuds (C Type) — ₹499
  {
    id: 'prod-chrome-earbuds-c-type',
    slug: 'chrome-earbuds-c-type',
    name: 'Chrome Earbuds (C Type)',
    price: 499,
    category: 'Accessories',
    style: 'Y2K',
    description: 'Chrome Earbuds (C Type) from the NYx DRIPstore collection. Heavy chrome finished wired earphones with USB Type-C interface.',
    images: [
      '/assets/aistudio/WhatsApp_Image_2026-10-30_at_5.24.39_PM_db92a737.jpeg',
      '/assets/aistudio/WhatsApp_Image_2026-10-30_at_5.24.37_PM_b310b39e.jpeg',
    ],
    stock: 10,
    isNewArrival: true,
  },

  // 17. Chrome Silver Rimless Glass — ₹599
  {
    id: 'prod-chrome-silver-rimless-glass',
    slug: 'chrome-silver-rimless-glass',
    name: 'Chrome Silver Rimless Glass',
    price: 599,
    category: 'Accessories',
    style: 'Y2K',
    description: 'Chrome Silver Rimless Glass from the NYx DRIPstore collection. Sleek rimless cyber shades with sculptural metallic temples.',
    images: [
      '/assets/aistudio/Screenshot_2026-10-30_180247_6b8d3fa6.png',
    ],
    stock: 10,
    isNewArrival: true,
  },
];
