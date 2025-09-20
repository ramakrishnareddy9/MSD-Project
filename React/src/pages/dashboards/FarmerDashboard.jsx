import { useState } from 'react';

const FarmerDashboard = () => {
  const [cropForm, setCropForm] = useState({ type: '', landSize: '', available: true });
  const [crops, setCrops] = useState([]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCropForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const addCrop = (e) => {
    e.preventDefault();
    if (!cropForm.type || !cropForm.landSize) return;
    setCrops((prev) => [
      ...prev,
      { id: Date.now(), ...cropForm }
    ]);
    setCropForm({ type: '', landSize: '', available: true });
  };

  const toggleAvailability = (id) => {
    setCrops((prev) => prev.map((c) => (c.id === id ? { ...c, available: !c.available } : c)));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Farmer Dashboard</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-3">Register Crop</h3>
          <form onSubmit={addCrop} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Crop Type</label>
              <input name="type" className="input-field mt-1" value={cropForm.type} onChange={onChange} placeholder="e.g., Wheat" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Land Size (acres)</label>
              <input name="landSize" className="input-field mt-1" value={cropForm.landSize} onChange={onChange} placeholder="e.g., 2" />
            </div>
            <div className="flex items-center gap-2">
              <input id="available" type="checkbox" name="available" checked={cropForm.available} onChange={onChange} />
              <label htmlFor="available" className="text-sm text-gray-700">Available</label>
            </div>
            <button className="btn-primary" type="submit">Add Crop</button>
          </form>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-3">Registered Crops</h3>
          {crops.length === 0 ? (
            <p className="text-sm text-gray-600">No crops registered yet.</p>
          ) : (
            <ul className="space-y-2">
              {crops.map((c) => (
                <li key={c.id} className="flex items-center justify-between border rounded p-3">
                  <div>
                    <p className="font-medium">{c.type}</p>
                    <p className="text-sm text-gray-600">Land: {c.landSize} acres • Status: {c.available ? 'Available' : 'Unavailable'}</p>
                  </div>
                  <button className="btn-secondary" onClick={() => toggleAvailability(c.id)}>
                    Toggle Availability
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default FarmerDashboard;
