import { Product } from '../types';

export const ICE_CAKES: Product[] = [
  // Half Kg (0.5kg) - ₹380
  { id: 'ice-cake-1-05', name: 'Butterscotch Cake (0.5kg)', price: 380, originalPrice: 760, category: 'Ice Cakes', type: 'food', image: '/images/butterscotch_cake.jpg', description: 'Premium butterscotch ice cream cake.', isVeg: true, isTopPick: true },
  { id: 'ice-cake-2-05', name: 'Red Velvet Cake (0.5kg)', price: 380, originalPrice: 760, category: 'Ice Cakes', type: 'food', image: '/images/red_velvet_cake.jpg', description: 'Luxurious red velvet ice cream cake.', isVeg: true, isTopPick: true },
  { id: 'ice-cake-3-05', name: 'Strawberry Cake (0.5kg)', price: 380, originalPrice: 760, category: 'Ice Cakes', type: 'food', image: '/images/strawberry_cake.jpg', description: 'Fresh strawberry delight.', isVeg: true },
  { id: 'ice-cake-4-05', name: 'Mango Cake (0.5kg)', price: 380, originalPrice: 760, category: 'Ice Cakes', type: 'food', image: '/images/mango_special.jpg', description: 'Tropical mango perfection.', isVeg: true },
  { id: 'ice-cake-5-05', name: 'Kiwi Cake (0.5kg)', price: 380, originalPrice: 760, category: 'Ice Cakes', type: 'food', image: '/images/kiwi_cake.jpg', description: 'Tangy and sweet kiwi ice cake.', isVeg: true },

  // 1 Kg (1kg) - ₹680
  { id: 'ice-cake-1-1', name: 'Butterscotch Cake (1kg)', price: 680, originalPrice: 1360, category: 'Ice Cakes', type: 'food', image: '/images/butterscotch_cake.jpg', description: 'Premium butterscotch ice cream cake.', isVeg: true, isTopPick: true },
  { id: 'ice-cake-2-1', name: 'Red Velvet Cake (1kg)', price: 680, originalPrice: 1360, category: 'Ice Cakes', type: 'food', image: '/images/red_velvet_cake.jpg', description: 'Luxurious red velvet ice cream cake.', isVeg: true, isTopPick: true },
  { id: 'ice-cake-3-1', name: 'Strawberry Cake (1kg)', price: 680, originalPrice: 1360, category: 'Ice Cakes', type: 'food', image: '/images/strawberry_cake.jpg', description: 'Fresh strawberry delight.', isVeg: true },
  { id: 'ice-cake-4-1', name: 'Mango Cake (1kg)', price: 680, originalPrice: 1360, category: 'Ice Cakes', type: 'food', image: '/images/mango_special.jpg', description: 'Tropical mango perfection.', isVeg: true },
  { id: 'ice-cake-5-1', name: 'Kiwi Cake (1kg)', price: 680, originalPrice: 1360, category: 'Ice Cakes', type: 'food', image: '/images/kiwi_cake.jpg', description: 'Tangy and sweet kiwi ice cake.', isVeg: true },
];

export const NORMAL_CAKES: Product[] = [
  // Half Kg (0.5kg) - ₹200
  { id: 'cake-1-05', name: 'Vanilla Cake (0.5kg)', price: 200, originalPrice: 400, category: 'Normal Cakes', type: 'food', image: '/images/black_forest_cake.jpg', description: 'Classic creamy vanilla cake.', isVeg: true },
  { id: 'cake-2-05', name: 'Chocolate Cake (0.5kg)', price: 200, originalPrice: 400, category: 'Normal Cakes', type: 'food', image: '/images/black_forest_cake.jpg', description: 'Rich chocolate truffle cake.', isVeg: true },
  { id: 'cake-3-05', name: 'Mango Cake (0.5kg)', price: 200, originalPrice: 400, category: 'Normal Cakes', type: 'food', image: '/images/mango_special.jpg', description: 'Delightful tropical mango cake.', isVeg: true },

  // 1 Kg (1kg) - ₹400
  { id: 'cake-1-1', name: 'Vanilla Cake (1kg)', price: 400, originalPrice: 800, category: 'Normal Cakes', type: 'food', image: '/images/black_forest_cake.jpg', description: 'Classic creamy vanilla cake.', isVeg: true },
  { id: 'cake-2-1', name: 'Chocolate Cake (1kg)', price: 400, originalPrice: 800, category: 'Normal Cakes', type: 'food', image: '/images/black_forest_cake.jpg', description: 'Rich chocolate truffle cake.', isVeg: true },
  { id: 'cake-3-1', name: 'Mango Cake (1kg)', price: 400, originalPrice: 800, category: 'Normal Cakes', type: 'food', image: '/images/mango_special.jpg', description: 'Delightful tropical mango cake.', isVeg: true },
];

export const PARTY_ITEMS: Product[] = [
  { id: 'party-1', name: 'Party Spray', price: 69, category: 'Party Items', type: 'food', image: '/images/party_spray.jpg', description: 'Perfect for Birthday!', isVeg: true },
  { id: 'party-2', name: 'Party Popper', price: 99, category: 'Party Items', type: 'food', image: '/images/party_popper.jpg', description: 'Perfect for Birthday!', isVeg: true },
  { id: 'party-3', name: 'Spark Candle', price: 25, category: 'Party Items', type: 'food', image: '/images/spark_candle.jpg', description: 'Perfect for Birthday!', isVeg: true },
  { id: 'party-4', name: 'Party Cap', price: 20, category: 'Party Items', type: 'food', image: '/images/party_cap.jpg', description: 'Perfect for Birthday!', isVeg: true },
  { id: 'party-5', name: '5 Balloons Pack', price: 20, category: 'Party Items', type: 'food', image: '/images/balloons_pack.jpg', description: 'Perfect for Birthday!', isVeg: true },
];

export const SNACKS: Product[] = [
  { id: 'snack-1', name: 'Veg Puffs', price: 25, category: 'Snacks', type: 'food', image: '/images/egg_puff.jpg', description: 'Crispy and hot veg puffs.', isVeg: true },
  { id: 'snack-2', name: 'Egg Puffs', price: 30, category: 'Snacks', type: 'food', image: '/images/egg_puff.jpg', description: 'Delicious hot egg puffs.', isVeg: false },
];
