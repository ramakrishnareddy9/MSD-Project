import "./FarmKartLanding.css";
import {
  FaLeaf,
  FaSearch,
  FaCartShopping,
  FaStar,
  FaStarHalfAlt,
  FaInstagram,
  FaFacebook,
  FaTwitter,
  FaYoutube,
} from "react-icons/fa6";

function FarmKartLanding() {
  return (
    <>
      {/* Header */}
      <div className="header">
        <div className="logo">
          <FaLeaf />
          <div>FarmKart</div>
        </div>

        <div className="searchContainer">
          <FaSearch />
          <div className="search">Search fresh produce...</div>
        </div>

        <div className="navLinks">
          <div className="nav-item">Deals</div>
          <div className="nav-item">Support</div>
          <div className="nav-item">Community</div>
          <div className="auth-buttons">
            <button className="btn btn-signup">Sign up</button>
            <button className="btn btn-login">Log in</button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="mainContainer">
        {/* Cart Sidebar */}
        <div className="cartSidebar">
          <div className="cart-title">
            <FaCartShopping />
            <div>Your Cart</div>
          </div>

          <div className="cart-promo">
            <p>Start shopping</p>
            <p>It's easy, fresh & local</p>
            <button className="btn-shop">Shop Now</button>
          </div>

          <div className="cart-items">
            <div className="cart-item">
              <span>Organic Tomatoes</span>
              <span>₹40</span>
            </div>
            <div className="cart-item">
              <span>Fresh Carrots</span>
              <span>₹60</span>
            </div>
            <div className="cart-item">
              <span>Seasonal Mangoes</span>
              <span>₹150</span>
            </div>
            <div className="cart-total">Total: ₹250</div>
          </div>

          <div className="links">
            <a href="#">About Us</a>
            <a href="#">Privacy Policy</a>
            <a href="#">Delivery Info</a>
            <a href="#">Terms</a>
          </div>

          <div className="language">
            <button className="btn-login">English</button>
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          <h2 className="section-title">Fresh Vegetables</h2>
          <div className="products-grid">
            <div className="product-card fresh-item">
              <img
                src="https://cdn.pixabay.com/photo/2016/02/23/17/08/tomatoes-1218973_1280.png"
                alt="Tomatoes"
                className="product-image"
              />
              <p className="product-title">Organic Tomatoes</p>
              <p className="product-price">₹40/kg</p>
              <button className="btn-add">Add to Cart</button>
            </div>

            <div className="product-card fresh-item">
              <img
                src="https://cdn.pixabay.com/photo/2016/03/05/19/02/carrot-1238251_1280.jpg"
                alt="Carrots"
                className="product-image"
              />
              <p className="product-title">Fresh Carrots</p>
              <p className="product-price">₹60/kg</p>
              <button className="btn-add">Add to Cart</button>
            </div>

            <div className="product-card fresh-item">
              <img
                src="https://cdn.pixabay.com/photo/2018/07/19/07/24/eggplant-3547077_1280.jpg"
                alt="Brinjal"
                className="product-image"
              />
              <p className="product-title">Local Brinjal</p>
              <p className="product-price">₹50/kg</p>
              <button className="btn-add">Add to Cart</button>
            </div>

            <div className="product-card fresh-item">
              <img
                src="https://cdn.pixabay.com/photo/2016/11/23/18/31/potatoes-1854184_1280.jpg"
                alt="Potatoes"
                className="product-image"
              />
              <p className="product-title">Farm Potatoes</p>
              <p className="product-price">₹30/kg</p>
              <button className="btn-add">Add to Cart</button>
            </div>
          </div>

          <h2 className="section-title">Fresh Fruits</h2>
          <div className="products-grid">
            <div className="product-card fresh-item">
              <img
                src="https://cdn.pixabay.com/photo/2016/08/09/11/47/apple-1589874_1280.jpg"
                alt="Apples"
                className="product-image"
              />
              <p className="product-title">Himalayan Apples</p>
              <p className="product-price">₹120/kg</p>
              <button className="btn-add">Add to Cart</button>
            </div>

            <div className="product-card fresh-item">
              <img
                src="https://cdn.pixabay.com/photo/2018/03/02/13/41/mango-3196175_1280.jpg"
                alt="Mango"
                className="product-image"
              />
              <p className="product-title">Seasonal Mangoes</p>
              <p className="product-price">₹150/kg</p>
              <button className="btn-add">Add to Cart</button>
            </div>

            <div className="product-card fresh-item">
              <img
                src="https://cdn.pixabay.com/photo/2016/02/19/10/00/bananas-1209959_1280.jpg"
                alt="Bananas"
                className="product-image"
              />
              <p className="product-title">Organic Bananas</p>
              <p className="product-price">₹60/dozen</p>
              <button className="btn-add">Add to Cart</button>
            </div>

            <div className="product-card fresh-item">
              <img
                src="https://cdn.pixabay.com/photo/2016/01/03/17/59/bananas-1119790_1280.jpg"
                alt="Oranges"
                className="product-image"
              />
              <p className="product-title">Sweet Oranges</p>
              <p className="product-price">₹80/kg</p>
              <button className="btn-add">Add to Cart</button>
            </div>
          </div>

          <h2 className="section-title">Popular Farmers</h2>
          <div className="farmers">
            <div className="farmer-card">
              <img
                src="https://cdn.pixabay.com/photo/2016/11/23/18/29/farmer-1850027_1280.jpg"
                alt="Farmer"
                className="farmer-image"
              />
              <p className="farmer-name">Ramesh Patel</p>
              <p className="farmer-specialty">Organic Vegetables</p>
              <p className="farmer-rating">
                <FaStar /> <FaStar /> <FaStar /> <FaStar /> <FaStarHalfAlt /> 4.5
                (120 reviews)
              </p>
            </div>

            <div className="farmer-card">
              <img
                src="https://cdn.pixabay.com/photo/2017/01/20/15/06/farmers-market-1993004_1280.jpg"
                alt="Farmer"
                className="farmer-image"
              />
              <p className="farmer-name">Meera Sharma</p>
              <p className="farmer-specialty">Seasonal Fruits</p>
              <p className="farmer-rating">
                <FaStar /> <FaStar /> <FaStar /> <FaStar /> <FaStar /> 5.0 (95
                reviews)
              </p>
            </div>
          </div>

          <h2 className="section-title">FarmKart Specials</h2>
          <div className="specials">
            <div className="special-card">
              <h3>Weekly Basket</h3>
              <p>
                Curated farm-fresh produce delivered every week. Save up to 20%
                compared to retail prices while enjoying the freshest seasonal
                items.
              </p>
              <button className="btn-special">Subscribe Now</button>
            </div>

            <div className="special-card">
              <h3>Community Cart</h3>
              <p>
                Order together with neighbors for discounts. Combine orders with
                people in your area and save on delivery fees while supporting
                local farmers.
              </p>
              <button className="btn-special">Join Group</button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="footer">
        <div className="footer-main">
          <div className="columns">
            <div className="column">
              <h4>Company</h4>
              <a href="#">About</a>
              <a href="#">Careers</a>
              <a href="#">Sustainability</a>
              <a href="#">Press</a>
            </div>

            <div className="column">
              <h4>Support</h4>
              <a href="#">Help Center</a>
              <a href="#">Delivery Info</a>
              <a href="#">Returns</a>
              <a href="#">Contact Us</a>
            </div>

            <div className="column">
              <h4>Useful Links</h4>
              <a href="#">Community</a>
              <a href="#">Seasonal Deals</a>
              <a href="#">Gift Cards</a>
              <a href="#">Farm Stories</a>
            </div>
          </div>

          <div className="column">
            <h4>Connect With Us</h4>
            <div className="social">
              <a href="#">
                <FaInstagram />
              </a>
              <a href="#">
                <FaFacebook />
              </a>
              <a href="#">
                <FaTwitter />
              </a>
              <a href="#">
                <FaYoutube />
              </a>
            </div>
          </div>
        </div>

        <div className="copyright">
          &copy; 2023 FarmKart. All rights reserved. Fresh from farm to your
          cart.
        </div>
      </div>
    </>
  );
}

export default FarmKartLanding;
