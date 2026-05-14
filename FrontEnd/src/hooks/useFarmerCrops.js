import { useState, useCallback } from 'react';
import { productAPI } from '../services/api';

/**
 * Custom hook to manage farmer crops data
 * Handles fetching, creating, updating, and deleting crops
 */
export const useFarmerCrops = () => {
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCrops = useCallback(async (farmerId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await productAPI.getAll({ ownerId: farmerId });
      
      if (response.success && response.data?.products) {
        const mappedCrops = response.data.products.map(p => ({
          id: p._id || p.id,
          type: p.name,
          landSize: p.landSize || '1',
          available: p.status === 'active',
          price: p.basePrice || 0,
          season: p.season || 'Year-round',
          quantity: p.stockQuantity || 0,
          planted: new Date(p.createdAt).toLocaleDateString(),
          status: p.status === 'active' ? 'Ready' : 'Growing',
          _id: p._id,
          category: p.category,
          description: p.description
        }));
        setCrops(mappedCrops);
        return mappedCrops;
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching crops:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addCrop = useCallback(async (cropData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await productAPI.create(cropData);
      
      if (response.success && response.data) {
        const newCrop = {
          id: response.data._id || response.data.id,
          type: response.data.name,
          landSize: response.data.landSize || '1',
          available: response.data.status === 'active',
          price: response.data.basePrice || 0,
          season: response.data.season || 'Year-round',
          quantity: response.data.stockQuantity || 0,
          planted: new Date(response.data.createdAt).toLocaleDateString(),
          status: response.data.status === 'active' ? 'Ready' : 'Growing',
          _id: response.data._id
        };
        setCrops(prev => [...prev, newCrop]);
        return newCrop;
      }
    } catch (err) {
      setError(err.message);
      console.error('Error adding crop:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCrop = useCallback(async (cropId, updateData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await productAPI.update(cropId, updateData);
      
      if (response.success && response.data) {
        setCrops(prev => prev.map(crop => 
          crop.id === cropId 
            ? { ...crop, ...response.data }
            : crop
        ));
        return response.data;
      }
    } catch (err) {
      setError(err.message);
      console.error('Error updating crop:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteCrop = useCallback(async (cropId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await productAPI.delete(cropId);
      
      if (response.success) {
        setCrops(prev => prev.filter(crop => crop.id !== cropId));
        return true;
      }
    } catch (err) {
      setError(err.message);
      console.error('Error deleting crop:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    crops,
    loading,
    error,
    fetchCrops,
    addCrop,
    updateCrop,
    deleteCrop
  };
};
