import { useState } from 'react';

const TransporterDashboard = () => {
  const [form, setForm] = useState({ vehicle: '', costPerKm: '', available: true, pickup: '', drop: '' });
  const [slots, setSlots] = useState([]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const addSlot = (e) => {
    e.preventDefault();
    if (!form.vehicle || !form.costPerKm || !form.pickup || !form.drop) return;
    setSlots((prev) => [...prev, { id: Date.now(), ...form }]);
    setForm({ vehicle: '', costPerKm: '', available: true, pickup: '', drop: '' });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Transporter Dashboard</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-3">Set Availability</h3>
          <form onSubmit={addSlot} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Vehicle</label>
              <input name="vehicle" className="input-field mt-1" value={form.vehicle} onChange={onChange} placeholder="e.g., Truck" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Cost per km (₹)</label>
              <input name="costPerKm" className="input-field mt-1" value={form.costPerKm} onChange={onChange} placeholder="e.g., 25" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Pickup</label>
                <input name="pickup" className="input-field mt-1" value={form.pickup} onChange={onChange} placeholder="City A" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Drop</label>
                <input name="drop" className="input-field mt-1" value={form.drop} onChange={onChange} placeholder="City B" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input id="t-available" type="checkbox" name="available" checked={form.available} onChange={onChange} />
              <label htmlFor="t-available" className="text-sm text-gray-700">Available</label>
            </div>
            <button className="btn-primary" type="submit">Add Availability</button>
          </form>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-3">Availability List</h3>
          {slots.length === 0 ? (
            <p className="text-sm text-gray-600">No availability added yet.</p>
          ) : (
            <ul className="space-y-2">
              {slots.map((s) => (
                <li key={s.id} className="border rounded p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{s.vehicle} • ₹{s.costPerKm}/km</p>
                      <p className="text-sm text-gray-600">{s.pickup} → {s.drop}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${s.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {s.available ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransporterDashboard;
