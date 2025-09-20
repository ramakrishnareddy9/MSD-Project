import { useState } from 'react';

const CommunityDashboard = () => {
  const [bulkOrders, setBulkOrders] = useState([]);
  const [form, setForm] = useState({ item: '', quantity: '', notes: '' });

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const placeOrder = (e) => {
    e.preventDefault();
    if (!form.item || !form.quantity) return;
    setBulkOrders((prev) => [...prev, { id: Date.now(), ...form }]);
    setForm({ item: '', quantity: '', notes: '' });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Community Dashboard</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-3">Place Bulk/Community Order</h3>
          <form onSubmit={placeOrder} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Item</label>
              <input className="input-field mt-1" name="item" value={form.item} onChange={onChange} placeholder="e.g., Rice" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Quantity (kg)</label>
              <input className="input-field mt-1" name="quantity" value={form.quantity} onChange={onChange} placeholder="e.g., 100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea className="input-field mt-1" name="notes" value={form.notes} onChange={onChange} placeholder="Delivery preferences, dates" />
            </div>
            <button className="btn-primary" type="submit">Place Order</button>
          </form>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-3">Orders</h3>
          {bulkOrders.length === 0 ? (
            <p className="text-sm text-gray-600">No bulk orders yet.</p>
          ) : (
            <ul className="space-y-2">
              {bulkOrders.map((o) => (
                <li key={o.id} className="border rounded p-3">
                  <p className="font-medium">{o.item} • {o.quantity} kg</p>
                  <p className="text-sm text-gray-600">Notes: {o.notes || '—'}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommunityDashboard;
