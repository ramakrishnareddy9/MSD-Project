import { useState } from 'react';

const Signup = () => {
  const [form, setForm] = useState({ name: '', email: '', role: 'customer', password: '' });

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const onSubmit = (e) => {
    e.preventDefault();
    alert('Signup successful (dummy). You can now login with predefined credentials.');
  };

  return (
    <div className="min-h-[70vh] grid place-items-center">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">Signup</h1>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input name="name" className="input-field mt-1" value={form.name} onChange={onChange} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" name="email" className="input-field mt-1" value={form.email} onChange={onChange} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select name="role" className="input-field mt-1" value={form.role} onChange={onChange}>
              <option value="customer">Customer</option>
              <option value="farmer">Farmer</option>
              <option value="transporter">Transporter</option>
              <option value="community">Community</option>
              <option value="business">Business</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input type="password" name="password" className="input-field mt-1" value={form.password} onChange={onChange} />
          </div>
          <button className="btn-primary w-full" type="submit">Create Account</button>
          <p className="text-xs text-gray-500">Note: This is a dummy page. Use predefined credentials on the Login page.</p>
        </form>
      </div>
    </div>
  );
};

export default Signup;
