import { useMemo, useState } from 'react';
import { Grid, Box, Typography, TextField, MenuItem, Select, InputLabel, FormControl } from '@mui/material';
import { ProductCard } from '../../Components/products';

const SAMPLE_PRODUCTS = [
  { id: 'p1', name: 'Tomatoes', image: '/assets/tomatoes.jpg', price: 60, rating: 4.5, farmer: 'Green Farm' },
  { id: 'p2', name: 'Potatoes', image: '/assets/potatoes.jpg', price: 40, rating: 4.2, farmer: 'Fresh Fields' },
  { id: 'p3', name: 'Onions', image: '/assets/onions.jpg', price: 45, rating: 4.1, farmer: 'Nature Farm' },
  { id: 'p4', name: 'Carrots', image: '/assets/carrots.jpg', price: 55, rating: 4.3, farmer: 'Green Farm' }
];

const ProductCatalog = () => {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('price-asc');

  const products = useMemo(() => {
    const filtered = SAMPLE_PRODUCTS.filter(p =>
      p.name.toLowerCase().includes(query.toLowerCase())
    );
    const sorted = [...filtered].sort((a,b) => {
      if (sort === 'price-asc') return a.price - b.price;
      if (sort === 'price-desc') return b.price - a.price;
      if (sort === 'rating') return (b.rating || 0) - (a.rating || 0);
      return 0;
    });
    return sorted;
  }, [query, sort]);

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <TextField
          label="Search products"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          fullWidth
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="sort-label">Sort by</InputLabel>
          <Select labelId="sort-label" label="Sort by" value={sort} onChange={(e) => setSort(e.target.value)}>
            <MenuItem value="price-asc">Price: Low to High</MenuItem>
            <MenuItem value="price-desc">Price: High to Low</MenuItem>
            <MenuItem value="rating">Rating</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Typography variant="h6" sx={{ mb: 1 }}>Products</Typography>
      <Grid container spacing={2}>
        {products.map((p) => (
          <Grid key={p.id} item xs={12} sm={6} md={4} lg={3}>
            <ProductCard product={p} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ProductCatalog;
