import React from 'react';
import { Product } from '../../types';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  products: Product[];
  columns?: 2 | 3 | 4;
}

export const ProductGrid: React.FC<ProductGridProps> = ({ products, columns = 4 }) => {
  const columnClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  };

  // Keep sellable products above sold-out items in every product grid.
  // Array.sort is stable, preserving any pre-existing sort within each group.
  const orderedProducts = [...products].sort(
    (a, b) => Number(b.stock > 0) - Number(a.stock > 0)
  );

  return (
    <div className={`grid ${columnClasses[columns]} gap-4 sm:gap-6`}>
      {orderedProducts.map((product, idx) => (
        <ProductCard key={product.id} product={product} priority={idx < 4} />
      ))}
    </div>
  );
};
