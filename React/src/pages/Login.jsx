import LoginForm from '../Components/LoginForm';

const Login = () => {
  return (
    <div className="min-h-[70vh] grid place-items-center">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">Login</h1>
        <LoginForm />
      </div>
    </div>
  );
};

export default Login;
