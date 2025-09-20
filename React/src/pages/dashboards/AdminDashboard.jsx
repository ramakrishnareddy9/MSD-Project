import { useEffect, useState } from 'react';

const AdminDashboard = () => {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    // Dummy aggregation of user activities from localStorage keys we used in this app
    const cart = JSON.parse(localStorage.getItem('farmkart_customer_cart') || '[]');
    const items = cart.map((c) => ({ type: 'Customer Cart', message: `${c.name} x${c.qty}`, ts: Date.now() - Math.random()*100000 }));

    const combined = [
      { type: 'System', message: 'System initialized', ts: Date.now() - 200000 },
      ...items,
      { type: 'Info', message: 'Transporter slots and Farmer crops are kept in session state for demo', ts: Date.now() - 100000 },
    ].sort((a,b) => b.ts - a.ts);

    setActivities(combined);
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Admin Dashboard</h2>
      <div className="card">
        <h3 className="text-lg font-semibold mb-3">Recent Activities (Dummy)</h3>
        {activities.length === 0 ? (
          <p className="text-sm text-gray-600">No activity yet.</p>
        ) : (
          <ul className="space-y-2">
            {activities.map((a, idx) => (
              <li key={idx} className="border rounded p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{a.type}</p>
                  <p className="text-sm text-gray-600">{a.message}</p>
                </div>
                <span className="text-xs text-gray-500">{new Date(a.ts).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
