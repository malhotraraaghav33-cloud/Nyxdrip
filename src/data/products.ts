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
    image: '/nyxdrip2.0/Ch pendent/file_000000008d208210a4fb4b6cb8b9613b.png',
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
    image: '/nyxdrip/Y2k Glass/y2k-glass.jpg',
    description: 'Futuristic Y2K shades and signature cyber eyewear accessories.',
    count: 1,
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
      '/nyxdrip/triple cross/IMG-20261002-WA0000.jpg',
      '/nyxdrip/triple cross/IMG-20261002-WA0002.jpg',
      '/nyxdrip/triple cross/IMG-20261002-WA0014.jpg',
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
      '/nyxdrip/Y2k Glass/y2k-glass.jpg',
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

  // 4. Angel Creed Necklace — ₹399
  {
    id: 'prod-angel-creed-necklace',
    slug: 'angel-creed-necklace',
    name: 'Angel Creed Necklace',
    price: 399,
    category: 'Necklaces',
    description: 'Angel Creed Necklace from the NYx DRIPstore collection. Sculpted gothic wing and cross insignia.',
    images: [
      '/nyxdrip/Angle creed necklace/IMG-20261002-WA0008.jpg',
      '/nyxdrip/Angle creed necklace/IMG-20261002-WA0013.jpg',
      '/nyxdrip/Angle creed necklace/IMG-20261002-WA0034.jpg',
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
      '/nyxdrip/Royal Fleur Struds/IMG-20261002-WA0011.jpg',
      '/nyxdrip/Royal Fleur Struds/IMG-20261002-WA0035.jpg',
      '/nyxdrip/Royal Fleur Struds/IMG-20261002-WA0038.jpg',
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
      '/nyxdrip/Y2k Devil Cap/IMG-20261002-WA0039.jpg',
    ],
    stock: 10,
    isNewArrival: true,
  },

  // 8. CH Pendant — ₹169
  {
    id: 'prod-ch-pendant',
    slug: 'ch-pendant',
    name: 'CH Pendant',
    price: 169,
    category: 'Pendants',
    description: 'CH Pendant from the NYx DRIPstore collection. Sculpted gothic cross centerpiece.',
    images: [
      '/nyxdrip2.0/Ch pendent/file_000000008d208210a4fb4b6cb8b9613b.png',
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

  // 10. Double Cross Pendant — ₹149
  {
    id: 'prod-double-cross-pendant',
    slug: 'double-cross-pendant',
    name: 'Double Cross Pendant',
    price: 149,
    category: 'Pendants',
    description: 'Double Cross Pendant from the NYx DRIPstore collection. Interlocking double cross motif.',
    images: [
      '/nyxdrip2.0/Double cross pendent/file_00000000f2a082108e6a99793e3bbfff.png',
      '/nyxdripscreenshot/Double cross pendent/IMG_20261002_125433_250.jpg',
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
      '/nyxdrip2.0/Bersek pendent/file_00000000669c82108310d8a5f6ca67a5.png',
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
      '/nyxdrip/Blue Mettalic wallet/IMG-20261002-WA0029.jpg',
      '/nyxdrip/Blue Mettalic wallet/IMG-20261002-WA0030.jpg',
      '/nyxdrip/Blue Mettalic wallet/IMG-20261002-WA0033.jpg',
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
      '/nyxdrip/Red Cosmic Star Necklace/IMG-20261002-WA0032.jpg',
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
      '/nyxdrip2.0/Snake cross nekclace/IMG_20261002_125440_660.jpg',
    ],
    stock: 10,
    isNewArrival: true,
  },
];
