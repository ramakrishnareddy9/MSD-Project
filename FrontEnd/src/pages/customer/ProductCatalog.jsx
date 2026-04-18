import { useMemo, useState, useEffect } from 'react';
import { Grid, Box, Typography, TextField, MenuItem, Select, InputLabel, FormControl } from '@mui/material';
import { ProductCard } from '../../Components/products';
import { productAPI } from '../../services/api';

const ProductCatalog = () => {
  const [allProducts, setAllProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('price-asc');
  const [loading, setLoading] = useState(true);

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await productAPI.getProducts();
        setAllProducts(response || []);
      } catch (error) {
        console.error('Error fetching products:', error);
        setAllProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const products = useMemo(() => {
    const filtered = allProducts.filter(p =>
      p.name.toLowerCase().includes(query.toLowerCase())
    );
    const sorted = [...filtered].sort((a,b) => {
      if (sort === 'price-asc') return (a.price || 0) - (b.price || 0);
      if (sort === 'price-desc') return (b.price || 0) - (a.price || 0);
      if (sort === 'rating') return (b.rating || 0) - (a.rating || 0);
      return 0;
    });
    return sorted;
  }, [query, sort, allProducts]);

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Loading products...</Typography>
      </Box>
    );
  }

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
