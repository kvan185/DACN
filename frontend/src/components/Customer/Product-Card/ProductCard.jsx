import { Col } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import './productCard.scss';
import {
  setCartStore,
  setCartItems,
  setDisplayToast
} from '../../../actions/user';
import {
  fetchAddProductToCart,
  fetchGetCart
} from '../../../actions/cart';

function ProductCard({ items, fullCol }) {
  const API_URL = import.meta.env.VITE_API_URL;
  const imageSrc = items?.image_url
    ? `${API_URL}${items.image_url}`
    : '/images/no-image.png';

  const id = items?._id;
  const { name, price } = items || {};

  const accessToken = JSON.parse(sessionStorage.getItem('accessToken'));
  const user = JSON.parse(sessionStorage.getItem('user'));
  const isToast = useSelector(state => state.user.isToast);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Debug an toàn
  // console.log('🧩 ProductCard render:', {
  //   id,
  //   name,
  //   categoryId: items?.category_id,
  //   image_url: items?.image_url,
  //   imageSrc
  // });

  const addProductInCart = async (idProduct) => {
    if (!user || !accessToken) {
      navigate('/login');
      return;
    }

    if (!idProduct) {
      console.error("Product ID is undefined");
      return;
    }

    try {
      const itemProduct = [
        {
          id: idProduct,
          qty: 1
        }
      ];

      // console.log("Send to cart:", itemProduct);

      await fetchAddProductToCart(accessToken, itemProduct);

      const response = await fetchGetCart(accessToken);
      const data = await response.json();

      if (data) {
        dispatch(setCartStore(data.cart));
        dispatch(setCartItems(data.cartItems));
        dispatch(setDisplayToast(!isToast));
      }
    } catch (err) {
      console.error('Add to cart error:', err);
    }
  };

  return (
    <Col xs={6} sm={6} md={4} lg={3}>
      <div className="product-card">
        <Link to={`/detail/${id}`} className="product-img">
          <img
            src={imageSrc}
            alt={name || 'product image'}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/images/no-image.png';
            }}
          />
        </Link>

        <div className="product-info">
          <div className="product-info-left">
            <span className="product-name">{name}</span>
          </div>

          <div className="product-info-right">
            <span className="product-price">
              {price?.toLocaleString('vi', {
                style: 'currency',
                currency: 'VND'
              })}
            </span>

            <div
              className="btn btn-add-cart"
              onClick={() => 
                {
                  // console.log("CLICK ADD CART", items?._id);
                  addProductInCart(id)
                }
              }
            >
              <svg
                width="23"
                height="21"
                viewBox="0 0 23 21"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="0.5" y="0.5" width="22" height="20" rx="5" fill="#F3BA00"/>
                <path
                  d="M11.5991 10.6961V16.1863M6.04956 10.6961H17.1487M11.5991 10.6961V5.20587"
                  stroke="white"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </Col>
  );
}

export default ProductCard;
