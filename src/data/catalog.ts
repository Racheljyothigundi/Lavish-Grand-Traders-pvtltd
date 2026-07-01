import almonds from "@/assets/cat-almonds.jpg";
import cashews from "@/assets/cat-cashews.jpg";
import pistachios from "@/assets/cat-pistachios.jpg";
import walnuts from "@/assets/cat-walnuts.jpg";
import raisins from "@/assets/cat-raisins.jpg";
import anjeer from "@/assets/cat-anjeer.jpg";
import dates from "@/assets/cat-dates.jpg";
import spices from "@/assets/cat-spices.jpg";
import seeds from "@/assets/cat-seeds.jpg";
import dals from "@/assets/cat-dals.jpg";
import millets from "@/assets/cat-millets.jpg";
import mix from "@/assets/cat-mix.jpg";

export const IMAGES = {
  almonds, cashews, pistachios, walnuts, raisins, anjeer, dates,
  spices, seeds, dals, millets, mix,
};

export type CategorySlug =
  | "dry-fruits" | "seeds" | "spices" | "powders"
  | "millets" | "dals" | "flours" | "gift-boxes";

export interface Category {
  slug: CategorySlug;
  name: string;
  blurb: string;
  image: string;
  tint: string;
}

export const categories: Category[] = [
  { slug: "dry-fruits", name: "Dry Fruits", blurb: "Hand-sorted premium nuts & fruits", image: almonds, tint: "oklch(0.95 0.04 60)" },
  { slug: "seeds",      name: "Seeds",      blurb: "Pumpkin, sunflower & more",         image: seeds,   tint: "oklch(0.95 0.05 130)" },
  { slug: "spices",     name: "Whole Spices",blurb: "Cardamom, clove, pepper, cinnamon",image: spices,  tint: "oklch(0.95 0.06 50)" },
  { slug: "powders",    name: "Masala Powders",blurb: "Chilli, turmeric, ginger garlic",image: spices,  tint: "oklch(0.94 0.06 40)" },
  { slug: "millets",    name: "Millets",    blurb: "Wholesome ancient grains",          image: millets, tint: "oklch(0.95 0.03 90)" },
  { slug: "dals",       name: "Dals & Grains", blurb: "All pulses, lentils & legumes",  image: dals,    tint: "oklch(0.95 0.05 70)" },
  { slug: "flours",     name: "Flours",     blurb: "Stone-ground, traceable flours",    image: millets, tint: "oklch(0.95 0.02 80)" },
  { slug: "gift-boxes", name: "Gift Boxes", blurb: "Premium gifting for every occasion",image: mix,     tint: "oklch(0.94 0.04 260)" },
];

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: CategorySlug;
  qty: string;
  mrp: number;
  discount: number; // percent
  image: string;
  stock: number;
  bestseller?: boolean;
  description: string;
  highlights: string[];
}

function price(mrp: number, discount: number) {
  return Math.round(mrp * (1 - discount / 100));
}
export const offerPrice = price;

export const products: Product[] = [
  // Pricing from the supplied catalogue
  { id: "p1",  slug: "almond-jumbo-500g",    name: "Almond Jumbo",       category: "dry-fruits", qty: "500 gm", mrp: 756,  discount: 15, image: almonds,    stock: 124, bestseller: true,
    description: "California jumbo almonds, hand-sorted for size and crunch. Rich in vitamin E, magnesium and plant protein — perfect for daily snacking, baking, or gifting.",
    highlights: ["Hygienically packed", "100% natural", "No preservatives", "Rich in vitamin E"] },
  { id: "p2",  slug: "cashew-premium-180-500g", name: "Cashew Premium W180", category: "dry-fruits", qty: "500 gm", mrp: 787,  discount: 15, image: cashews,    stock: 86,  bestseller: true,
    description: "Grade W180 whole cashew kernels — large, creamy and milky-white. Ethically sourced and steam-pasteurised.",
    highlights: ["W180 grade", "Whole kernels", "Naturally creamy", "Vacuum sealed"] },
  { id: "p3",  slug: "pistachio-roasted-500g", name: "Pistachio Roasted Salted", category: "dry-fruits", qty: "500 gm", mrp: 1007, discount: 20, image: pistachios, stock: 72,  bestseller: true,
    description: "Premium pistachios, lightly roasted with a touch of pink salt. Bright green kernels with a satisfying crunch.",
    highlights: ["Lightly salted", "In-shell", "Antioxidant rich", "Slow-roasted"] },
  { id: "p4",  slug: "walnut-kernels-500g",  name: "Walnut Kernels",       category: "dry-fruits", qty: "500 gm", mrp: 1170, discount: 20, image: walnuts,    stock: 54,
    description: "Light-amber Kashmiri walnut halves — buttery, mild and packed with Omega-3.",
    highlights: ["Light-amber halves", "Omega-3 rich", "No bitterness", "Cold stored"] },
  { id: "p5",  slug: "anjeer-premium-500g",  name: "Anjeer (Dried Figs)",  category: "dry-fruits", qty: "500 gm", mrp: 890,  discount: 18, image: anjeer,     stock: 48,
    description: "Sun-dried Afghan anjeer — naturally sweet, soft centred figs.",
    highlights: ["Sun-dried", "Naturally sweet", "Fibre rich", "No added sugar"] },
  { id: "p6",  slug: "kissmiss-golden-500g", name: "Kissmiss (Golden Raisins)", category: "dry-fruits", qty: "500 gm", mrp: 420, discount: 15, image: raisins,    stock: 160,
    description: "Plump golden raisins, washed and slow-dried. Perfect for kheer, granola and snacking.",
    highlights: ["Slow-dried", "No added oil", "Plump & juicy", "Resealable pack"] },
  { id: "p7",  slug: "dates-medjool-500g",   name: "Medjool Dates",        category: "dry-fruits", qty: "500 gm", mrp: 780,  discount: 18, image: dates,      stock: 90,  bestseller: true,
    description: "Soft, caramel-sweet Medjool dates — the king of dates.",
    highlights: ["Soft & moist", "Naturally caramel", "Iron rich", "Hand-packed"] },
  // Seeds
  { id: "p8",  slug: "pumpkin-seeds-250g",   name: "Pumpkin Seeds",        category: "seeds", qty: "250 gm", mrp: 320, discount: 15, image: seeds, stock: 110,
    description: "Roasted unsalted pumpkin seeds — bright green and crunchy.",
    highlights: ["Zinc rich", "Lightly roasted", "Unsalted", "No oil"] },
  { id: "p9",  slug: "sunflower-seeds-250g", name: "Sunflower Seeds",      category: "seeds", qty: "250 gm", mrp: 240, discount: 15, image: seeds, stock: 130,
    description: "Hulled sunflower kernels for smoothies, salads and trail mixes.",
    highlights: ["Hulled kernels", "Vitamin E", "Crunchy", "Resealable"] },
  // Spices
  { id: "p10", slug: "cardamom-green-50g",   name: "Green Cardamom",       category: "spices", qty: "50 gm",  mrp: 305, discount: 10, image: spices, stock: 64,
    description: "Plump green cardamom pods, aromatic and oil-rich.",
    highlights: ["Hand-picked", "Bold aroma", "Whole pods", "Single origin"] },
  { id: "p11", slug: "pepper-tellicherry-100g", name: "Tellicherry Pepper", category: "spices", qty: "100 gm", mrp: 220, discount: 25, image: spices, stock: 88,
    description: "Tellicherry whole black pepper — bold, citrusy, complex.",
    highlights: ["Tellicherry grade", "Whole peppercorns", "Sun-dried", "Aromatic"] },
  { id: "p12", slug: "clove-whole-100g",     name: "Whole Clove",          category: "spices", qty: "100 gm", mrp: 265, discount: 25, image: spices, stock: 76,
    description: "Premium whole cloves — oil-rich and intensely fragrant.",
    highlights: ["Oil rich", "Whole buds", "Strong aroma", "Hand-sorted"] },
  { id: "p13", slug: "cinnamon-50g",         name: "Ceylon Cinnamon",      category: "spices", qty: "50 gm",  mrp: 358, discount: 25, image: spices, stock: 52,
    description: "True Ceylon cinnamon quills — delicate, sweet and floral.",
    highlights: ["Ceylon (true)", "Soft quills", "Sweet aroma", "Single origin"] },
  // Powders
  { id: "p14", slug: "chilli-powder-500g",   name: "Chilli Powder",        category: "powders", qty: "500 gm", mrp: 360, discount: 20, image: spices, stock: 95,
    description: "Sun-dried Guntur red chilli, stone-ground to a fine vibrant powder.",
    highlights: ["Guntur red", "Stone ground", "No colour added", "Vibrant heat"] },
  { id: "p15", slug: "turmeric-powder-500g", name: "Turmeric Powder",      category: "powders", qty: "500 gm", mrp: 192, discount: 20, image: spices, stock: 140, bestseller: true,
    description: "High curcumin turmeric — bright golden colour, earthy aroma.",
    highlights: ["High curcumin", "No starch", "Stone ground", "Bright colour"] },
  { id: "p16", slug: "ginger-garlic-paste-500g", name: "Ginger Garlic Paste", category: "powders", qty: "500 gm", mrp: 220, discount: 30, image: spices, stock: 60,
    description: "Freshly ground ginger garlic paste with cold-pressed oil for shelf life.",
    highlights: ["Fresh ground", "Cold-pressed oil", "No preservatives", "Ready to cook"] },
  // Millets & Dals
  { id: "p17", slug: "foxtail-millet-1kg",   name: "Foxtail Millet",       category: "millets", qty: "1 kg",   mrp: 240, discount: 15, image: millets, stock: 70,
    description: "Whole foxtail millet — low GI, high fibre, perfect for daily meals.",
    highlights: ["Whole grain", "Low GI", "Gluten free", "High fibre"] },
  { id: "p18", slug: "toor-dal-1kg",         name: "Toor Dal (Arhar)",     category: "dals", qty: "1 kg", mrp: 180, discount: 12, image: dals, stock: 200,
    description: "Premium unpolished toor dal — fast-cooking and richly flavoured.",
    highlights: ["Unpolished", "Premium grade", "Quick cooking", "High protein"] },
  { id: "p19", slug: "moong-dal-1kg",        name: "Moong Dal Yellow",     category: "dals", qty: "1 kg", mrp: 170, discount: 12, image: dals, stock: 180,
    description: "Split yellow moong dal — light, easy to digest, fast cooking.",
    highlights: ["Split yellow", "Easy digest", "High protein", "Quick cook"] },
  { id: "p20", slug: "wheat-flour-5kg",      name: "Chakki Atta",          category: "flours", qty: "5 kg", mrp: 360, discount: 10, image: millets, stock: 110,
    description: "Stone-ground whole wheat flour — soft rotis every time.",
    highlights: ["Stone ground", "Whole wheat", "No additives", "Soft rotis"] },
];

export interface GiftBox {
  id: string;
  number: number;
  name: string;
  tagline: string;
  price: number;
  mrp: number;
  badges: string[];
}

export const giftBoxes: GiftBox[] = [
  { id: "g1",  number: 1, name: "Signature Collection", tagline: "A perfect blend of health & happiness", price: 1499, mrp: 1899, badges: ["Premium Quality","100% Natural","Hygienically Packed"] },
  { id: "g2",  number: 2, name: "Celebrate with Goodness", tagline: "Elegance in every bite", price: 1299, mrp: 1599, badges: ["Finest Nuts","No Artificial Preservatives","Rich in Nutrients"] },
  { id: "g3",  number: 3, name: "Royal Delight", tagline: "Regal taste, just for you", price: 2199, mrp: 2699, badges: ["100% Natural","Hygienically Packed","Premium Quality"] },
  { id: "g4",  number: 4, name: "Blush Collection", tagline: "Thoughtful gifting, beautifully wrapped", price: 1799, mrp: 2199, badges: ["Finest Quality","No Artificial Colors","Healthy & Delicious"] },
  { id: "g5",  number: 5, name: "Elite Collection", tagline: "Premium gifts for premium people", price: 2599, mrp: 3199, badges: ["100% Natural","Hygienically Packed","Rich in Protein"] },
  { id: "g6",  number: 6, name: "Nature's Basket", tagline: "From nature to your doorstep", price: 999,  mrp: 1299, badges: ["Natural & Fresh","No Preservatives","Sustainably Sourced"] },
  { id: "g7",  number: 7, name: "Hexa Harmony", tagline: "Six delights, one perfect gift", price: 1899, mrp: 2299, badges: ["Premium Quality","Hygienically Packed","Wholesome & Nutritious"] },
  { id: "g8",  number: 8, name: "Happiness Box", tagline: "Small box, big smiles", price: 699,  mrp: 899,  badges: ["Finest Nuts","100% Natural","Perfect for Every Occasion"] },
  { id: "g9",  number: 9, name: "Treasure Trove", tagline: "Discover the richness of every bite", price: 2399, mrp: 2999, badges: ["No Artificial Additives","Hygienically Packed","Rich in Nutrients"] },
  { id: "g10", number: 10, name: "Eco Collection", tagline: "Good for you, good for nature", price: 1199, mrp: 1499, badges: ["Eco Friendly Packaging","100% Natural","Sustainably Sourced"] },
];

export interface SubscriptionPlan {
  id: string;
  name: string;
  blurb: string;
  monthly: number;
  includes: string[];
  badge?: string;
}

export const subscriptionPlans: SubscriptionPlan[] = [
  { id: "s1", name: "Family Pack",         blurb: "Daily nutrition for the whole family",      monthly: 1499, includes: ["250g Almonds", "250g Cashews", "250g Raisins", "250g Sunflower Seeds", "250g Pumpkin Seeds"], badge: "Popular" },
  { id: "s2", name: "Fitness Pack",        blurb: "High-protein fuel for active lifestyles",   monthly: 1799, includes: ["500g Almonds", "500g Pistachios", "250g Pumpkin Seeds", "250g Sunflower Seeds"] },
  { id: "s3", name: "Kids Nutrition Pack", blurb: "Brain-boosting snacks for little ones",     monthly: 1199, includes: ["100g Cashews", "100g Walnuts", "100g Almonds", "100g Pistachios", "100g Pumpkin Seeds", "100g Sunflower Seeds"] },
  { id: "s4", name: "Executive Health",    blurb: "Premium curation for busy professionals",   monthly: 2499, includes: ["250g Almonds", "250g Cashews", "250g Walnuts", "250g Pistachios", "250g Anjeer", "250g Raisins", "250g Sunflower Seeds", "250g Pumpkin Seeds"], badge: "Premium" },
];

export const festivalCollections = [
  { id: "f1", name: "Diwali Edition",    tagline: "Light up celebrations",          accent: "linear-gradient(135deg, oklch(0.55 0.22 30), oklch(0.78 0.13 80))" },
  { id: "f2", name: "Christmas Edition", tagline: "Joy in every box",               accent: "linear-gradient(135deg, oklch(0.4 0.18 150), oklch(0.55 0.22 25))" },
  { id: "f3", name: "Corporate Events",  tagline: "Branded gifting at scale",       accent: "linear-gradient(135deg, oklch(0.32 0.21 268), oklch(0.78 0.14 210))" },
  { id: "f4", name: "Wedding Gifts",     tagline: "Memorable hampers for the day",  accent: "linear-gradient(135deg, oklch(0.55 0.18 350), oklch(0.78 0.13 80))" },
];

export const mixIngredients = [
  { id: "m1", name: "Almonds",    pricePer100g: 130, image: almonds },
  { id: "m2", name: "Cashews",    pricePer100g: 140, image: cashews },
  { id: "m3", name: "Pistachios", pricePer100g: 200, image: pistachios },
  { id: "m4", name: "Walnuts",    pricePer100g: 220, image: walnuts },
  { id: "m5", name: "Raisins",    pricePer100g: 70,  image: raisins },
  { id: "m6", name: "Anjeer",     pricePer100g: 180, image: anjeer },
  { id: "m7", name: "Dates",      pricePer100g: 150, image: dates },
  { id: "m8", name: "Pumpkin Seeds", pricePer100g: 110, image: seeds },
];

export const testimonials = [
  { id: "t1", name: "Anitha R.",  city: "Hyderabad", text: "Best quality almonds I've had in years — the packaging feels truly premium, and the freshness is unmatched.", rating: 5 },
  { id: "t2", name: "Rohit M.",   city: "Bengaluru", text: "Ordered the Royal Delight gift box for Diwali. My clients were impressed — beautifully presented and high quality nuts.", rating: 5 },
  { id: "t3", name: "Priya S.",   city: "Mumbai",    text: "The monthly Family Pack subscription keeps my pantry stocked. Always fresh, always on time.", rating: 5 },
  { id: "t4", name: "Karthik V.", city: "Chennai",   text: "Ordered 200 corporate gift boxes — branding was clean and delivery was on schedule. Highly recommend.", rating: 5 },
];
