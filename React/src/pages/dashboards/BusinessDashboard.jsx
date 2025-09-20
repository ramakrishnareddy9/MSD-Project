import { useState } from 'react';

const BusinessDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState({ product: '', units: '', supplier: '' });

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const placeOrder = (e) => {
    e.preventDefault();
    if (!form.product || !form.units) return;
    setOrders((prev) => [...prev, { id: Date.now(), ...form }]);
    setForm({ product: '', units: '', supplier: '' });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Business Dashboard</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-3">Wholesale Purchase</h3>
          <form onSubmit={placeOrder} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Product</label>
              <input className="input-field mt-1" name="product" value={form.product} onChange={onChange} placeholder="e.g., Wheat" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Units (bags/crates)</label>
              <input className="input-field mt-1" name="units" value={form.units} onChange={onChange} placeholder="e.g., 50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Preferred Farmer/Supplier</label>
              <input className="input-field mt-1" name="supplier" value={form.supplier} onChange={onChange} placeholder="Optional" />
            </div>
            <button className="btn-primary" type="submit">Place Wholesale Order</button>
          </form>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-3">Orders</h3>
          {orders.length === 0 ? (
            <p className="text-sm text-gray-600">No orders yet.</p>
          ) : (
            <ul className="space-y-2">
              {orders.map((o) => (
                <li key={o.id} className="border rounded p-3">
                  <p className="font-medium">{o.product} • {o.units} units</p>
                  <p className="text-sm text-gray-600">Supplier: {o.supplier || '—'}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessDashboard;
