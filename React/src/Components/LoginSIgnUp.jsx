import React, { useState } from "react";
import "./signup.css";
import {
  FaEnvelope,
  FaLock,
  FaGoogle,
  FaFacebookF,
  FaTwitter,
} from "react-icons/fa";

export default function SignUpPage() {
  const [activeTab, setActiveTab] = useState("login");

  const renderForm = () => {
    switch (activeTab) {
      case "login":
        return (
          <div className="form active" id="login">
            <h1>Login to your account</h1>
            <div className="input">
              <FaEnvelope />
              <input type="email" placeholder="Email Address" />
            </div>
            <div className="input">
              <FaLock />
              <input type="password" placeholder="Password" />
            </div>
            <button>Login</button>
            <div className="social">
              <p>Or login with</p>
              <div className="socialicons">
                <a href="#"><FaGoogle /></a>
                <a href="#"><FaFacebookF /></a>
                <a href="#"><FaTwitter /></a>
              </div>
            </div>
          </div>
        );

      case "register":
        return (
          <div className="form active" id="Register">
            <h1>Create New Account</h1>
            <div className="input">
              <FaEnvelope />
              <input type="email" placeholder="Email Address" />
            </div>
            <div className="input">
              <FaLock />
              <input type="password" placeholder="Password" />
            </div>
            <div className="input">
              <input type="number" placeholder="Adhar Number" />
            </div>
            <div className="input">
              <input type="text" placeholder="Name" />
            </div>
            <div className="input">
              <input type="number" placeholder="Mobile Number" />
            </div>
            <div className="input">
              <select name="Type" id="Type">
                <option value="Customer">Customer</option>
                <option value="Farmer">Farmer</option>
                <option value="Transporter">Transporter</option>
              </select>
            </div>
            <button>Create account</button>
          </div>
        );

      case "forget":
        return (
          <div className="form active" id="ForgetPassword">
            <h1>Reset Your Password</h1>
            <p>
              Enter your email address and we'll send you a link to reset your
              password.
            </p>
            <div className="input-group">
              <FaEnvelope />
              <input type="email" placeholder="Email Address" />
            </div>
            <button>Send Reset Link</button>
            <div className="form-footer" style={{ textAlign: "center", marginTop: "20px" }}>
              <a
                href="#"
                className="back-to-login"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab("login");
                }}
              >
                Back to Login
              </a>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="Container">
      <div className="imageSection">
        <div className="imageContent">
          <h2>Welcome Back!</h2>
          <p>
            Sign in to access your personalized dashboard and manage your
            account settings.
          </p>
        </div>
      </div>
      <div className="MainContainer">
        <div className="Header">
          <div
            className={activeTab === "login" ? "active" : ""}
            onClick={() => setActiveTab("login")}
          >
            Login
          </div>
          <div
            className={activeTab === "register" ? "active" : ""}
            onClick={() => setActiveTab("register")}
          >
            Register
          </div>
          <div
            className={activeTab === "forget" ? "active" : ""}
            onClick={() => setActiveTab("forget")}
          >
            Forget
          </div>
        </div>
        <div className="mainData">{renderForm()}</div>
      </div>
    </div>
  );
}