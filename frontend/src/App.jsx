import { useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';

import './App.scss';
import Header from './components/Customer/Header/Header';
import Footer from './components/Customer/Footer/Footer';
import Banner from './components/Customer/Banner/Banner';
import Login from './pages/Customer/Login/Login';
import Register from './pages/Customer/Register/Register';
import Home from './pages/Customer/Home/Home';
import Detail from './pages/Customer/Detail/Detail';
import Checkout from './pages/Customer/Checkout/Checkout';
import Profile from './pages/Customer/Profile/Profile';
import HistoryOrder from './pages/Customer/HistoryOrder/HistoryOrder';
import Search from './pages/Customer/Search/Search';
import TableReservation from './pages/Customer/Table/TableReservation';
import HistoryReservation from './pages/Customer/HistoryReservation/HistoryReservation';
import TableCheckin from './pages/Customer/Table/TableCheckin';
import Menu from './pages/Customer/Menu/Menu';
import Cart from './components/Customer/Cart/Cart';
import OrderedList from './components/Customer/OrderedList/OrderedList';
import Slider from './components/Staff/Slider/Slider';
import HeaderStaff from './components/Staff/Header/Header';
import RegisterStaff from './pages/Staff/Resgiter/Resgister';
import Staff from './pages/Staff/Home/HomeStaff';
import Charts from './pages/Staff/Charts/Charts';
import Category from './pages/Staff/Category/Category';

import Product from './pages/Staff/Product/Product';
import LoginStaff from './pages/Staff/Login/Login';
import Order from './pages/Staff/Order/Order';
import OrderDetail from './pages/Staff/Order/OrderDetail';
import Table from './pages/Staff/Table/Table';
import ProfileAdmin from './pages/Staff/Profile/Profile';
import StaffList from './pages/Staff/StaffList';
import { ToastContainer } from 'react-toastify';
import Ingredient from './pages/Staff/Ingredient/Ingredient';
import 'react-toastify/dist/ReactToastify.css';
import { RequireAuth } from './middleware/AuthMiddleware';
import Customer from './pages/Staff/Customer/Customer';

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem("user"));
  const pathsCanDisplayBanner = ['/'];
  const accessToken = sessionStorage.getItem("accessToken");
  useEffect(() => {
    if (location.pathname.includes('/staff') && user === null) {
      navigate('/staff/login');
    }
  }, [])

  if (location.pathname.includes('/staff/login')) {
    return (
      <>
        <Routes>
          <Route path='/staff/login' element={<LoginStaff />} />
        </Routes>
      </>
    )
  }

  if (location.pathname.includes('/staff')) {
    return (
      <>
        <Slider />
        <div className="main-content">
          <HeaderStaff />
          <div className="block-content">
            <Routes>
              <Route path='/staff' element={<Staff />} />
              <Route path='/staff/category' element={<Category />} />
              <Route path='/staff/product' element={<Product />} />
              <Route path='/staff/ingredient' element={<Ingredient />} />
              <Route path='/staff/order' element={<Order />} />
              <Route path='/staff/order/detail/:orderId' element={<OrderDetail />} />
              <Route path='/staff/revenue' element={<Charts />} />
              <Route path='/staff/manage' element={<StaffList />} />
              <Route path='/staff/table' element={<Table />} />
              <Route path='/staff/profile' element={<ProfileAdmin />} />
              <Route path='/staff/customer' element={<Customer />} />
            </Routes >
          </div >
        </div >
      </>
    )
  }

  if (location.pathname.includes('/')) {
    return (
      <>
        <Header />
        <Cart accessToken={accessToken} />
        <OrderedList />
        <Banner isDisplay={pathsCanDisplayBanner.includes(location.pathname)} />
        <main className="main-customer-content">
          <Routes>
            <Route path='/login' element={<Login />} />
            <Route path='/register' element={<Register />} />
            <Route path='/' element={<Home />} />
            <Route path='/checkout' element={
              <RequireAuth>
                <Checkout />
              </RequireAuth>
            } />
            <Route path='/detail/:id' element={<Detail />} />
            <Route path='/history-order' element={
              <RequireAuth>
                <HistoryOrder />
              </RequireAuth>
            } />
            <Route path='/profile' element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            } />
            <Route path='/search' element={<Search />} />
            <Route path='/table-reservation' element={
              <RequireAuth>
                <TableReservation />
              </RequireAuth>
            } />
            <Route path='/history-reservation' element={
              <HistoryReservation />
            } />
            <Route path="/table-checkin" element={<TableCheckin />} />
            <Route path="/menu" element={<Menu />} />
          </Routes>
        </main>
        <Footer />
        <ToastContainer
          position="top-right"
          autoClose={1000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnHover
        // theme="colored"
        />
      </>

    )
  }
}

export default App
