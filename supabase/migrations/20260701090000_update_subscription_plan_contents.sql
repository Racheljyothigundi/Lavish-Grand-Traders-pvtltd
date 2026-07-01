UPDATE public.subscription_plans
SET includes = ARRAY[
  '250g Almonds',
  '250g Cashews',
  '250g Raisins',
  '250g Sunflower Seeds',
  '250g Pumpkin Seeds'
]
WHERE id = 's1';

UPDATE public.subscription_plans
SET includes = ARRAY[
  '100g Cashews',
  '100g Walnuts',
  '100g Almonds',
  '100g Pistachios',
  '100g Pumpkin Seeds',
  '100g Sunflower Seeds'
]
WHERE id = 's3';

UPDATE public.subscription_plans
SET includes = ARRAY[
  '250g Almonds',
  '250g Cashews',
  '250g Walnuts',
  '250g Pistachios',
  '250g Anjeer',
  '250g Raisins',
  '250g Sunflower Seeds',
  '250g Pumpkin Seeds'
]
WHERE id = 's4';
