import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncCatalog() {
  console.log('Connecting to Supabase at:', supabaseUrl);

  // 1. Update Angled Creed Necklace price to 399
  console.log('Updating Angled Creed Necklace price to ₹399 in Supabase...');
  try {
    const { data: updateData, error: updateError } = await supabase
      .from('products')
      .update({ price: 399 })
      .or('slug.eq.angled-creed-necklace,slug.eq.angel-creed-necklace,name.ilike.%creed%');

    if (updateError) {
      console.warn('Update price error (or table paused):', updateError.message);
    } else {
      console.log('Price updated successfully in Supabase.');
    }
  } catch (err) {
    console.warn('Exception updating price in Supabase:', err);
  }

  // Update Y2K Glass images in Supabase
  try {
    await supabase
      .from('products')
      .update({
        images: ['/assets/aistudio/WhatsApp_Image_2026-10-30_at_5.37.28_PM_ec535360.jpeg'],
      })
      .eq('slug', 'y2k-glass');
  } catch {}

  // 2. Upsert the two new products
  interface SyncProduct {
    id: string;
    slug: string;
    name: string;
    price: number;
    category_name: string;
    style?: string;
    description: string;
    images: string[];
    stock: number;
    is_active: boolean;
    is_new_arrival: boolean;
  }

  const newProducts: SyncProduct[] = [
    {
      id: 'prod-chrome-earbuds-c-type',
      slug: 'chrome-earbuds-c-type',
      name: 'Chrome Earbuds (C Type)',
      price: 499,
      category_name: 'Accessories',
      description: 'Chrome Earbuds (C Type) from the NYx DRIPstore collection. Heavy chrome finished wired earphones with USB Type-C interface.',
      images: [
        '/assets/aistudio/WhatsApp_Image_2026-10-30_at_5.24.39_PM_db92a737.jpeg',
        '/assets/aistudio/WhatsApp_Image_2026-10-30_at_5.24.37_PM_b310b39e.jpeg',
      ],
      stock: 10,
      is_active: true,
      is_new_arrival: true,
    },
    {
      id: 'prod-chrome-silver-rimless-glass',
      slug: 'chrome-silver-rimless-glass',
      name: 'Chrome Silver Rimless Glass',
      price: 599,
      category_name: 'Accessories',
      style: 'Y2K',
      description: 'Chrome Silver Rimless Glass from the NYx DRIPstore collection. Sleek rimless cyber shades with sculptural metallic temples.',
      images: [
        '/assets/aistudio/WhatsApp_Image_2026-10-30_at_5.25.27_PM_fd4c30d4.jpeg',
        '/assets/aistudio/Screenshot_2026-10-30_180247_6b8d3fa6.png',
      ],
      stock: 10,
      is_active: true,
      is_new_arrival: true,
    },
  ];

  for (const prod of newProducts) {
    console.log(`Upserting ${prod.name} into Supabase...`);
    try {
      const { data, error } = await supabase
        .from('products')
        .upsert(prod, { onConflict: 'slug' });

      if (error) {
        console.warn(`Upsert error for ${prod.name}:`, error.message);
      } else {
        console.log(`Successfully upserted ${prod.name}`);
      }
    } catch (err) {
      console.warn(`Exception upserting ${prod.name}:`, err);
    }
  }
}

syncCatalog();
