import './App.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Index from './pages/Index';
import Shop from './pages/Shop';
import ShopDetail from './pages/ShopDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Contact from './pages/Contact';
import Policies from './pages/Policies';
import { CartProvider } from './pages/CartContext'; 
import Signup from './pages/User/Signup';
import Login from './pages/User/Login';
import MyOrders from './pages/User/MyOrders';
import OrderDetail from './pages/User/OrderDetail';
import VoucherWarehouse from './pages/VoucherWarehouse';
import Chatbot from './pages/Chatbot';
 

function App() {
  return (
    <div className="App">
      <CartProvider>
        <Router>
          <ToastContainer position="top-right" autoClose={2500} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
          <Routes>
            <Route path="/login" exact Component={Login} />
            <Route path="/signup" exact Component={Signup} />
            
            <Route path="/" exact Component={Index} />
            <Route path="/index" exact Component={Index} />
            <Route path="/shop" exact Component={Shop} />
            <Route path="/shopdetail/:id" exact Component={ShopDetail} />
            <Route path="/cart" exact Component={Cart} />
            <Route path="/checkout" exact Component={Checkout} />
            <Route path="/contact" exact Component={Contact} />
            <Route path="/policies" exact Component={Policies} />
            <Route path="/vouchers" exact Component={VoucherWarehouse} />
            <Route path="/my-orders" exact Component={MyOrders} />
            <Route path="/my-orders/:id" exact Component={OrderDetail} />
          </Routes>
          <Chatbot />
        </Router>
      </CartProvider>
    </div>
  );
}

export default App;