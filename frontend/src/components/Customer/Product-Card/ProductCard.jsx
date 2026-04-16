
import { Col } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
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

  const accessToken = sessionStorage.getItem("accessToken");
  const user = JSON.parse(sessionStorage.getItem('user'));
  const isToast = useSelector(state => state.user.isToast);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const addProductInCart = async (idProduct) => {
    const orderSource = sessionStorage.getItem('orderSource');

    if (!user || !accessToken) {
      if (orderSource === 'table') {
        let guestCart = JSON.parse(sessionStorage.getItem('guestCart')) || [];
        const existingItemIndex = guestCart.findIndex(item => item.id === idProduct);

        if (existingItemIndex > -1) {
          guestCart[existingItemIndex].qty += 1;
          guestCart[existingItemIndex].total_price = guestCart[existingItemIndex].qty * price;
        } else {
          // Lấy tên ảnh từ đường dẫn
          const imageName = items.image_url || 'no-image.png';

          guestCart.push({
            id: idProduct,
            product_id: idProduct,
            product_name: name,
            product_image: imageName,
            price: price,
            qty: 1,
            total_price: price
          });
        }

        sessionStorage.setItem('guestCart', JSON.stringify(guestCart));
        dispatch(setCartItems(guestCart));
        dispatch(setCartStore({
          id: 'guest',
          total_item: guestCart.reduce((sum, i) => sum + i.qty, 0),
          total_price: guestCart.reduce((sum, i) => sum + i.total_price, 0)
        }));
        toast.success("Đã thêm vào giỏ hàng!");
        return;
      }
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

      await fetchAddProductToCart(accessToken, itemProduct);

      const response = await fetchGetCart(accessToken);
      const data = await response.json();

      if (data && data.cart) {
        dispatch(setCartStore(data.cart));
        dispatch(setCartItems(data.cartItems));
        toast.success("Đã thêm vào giỏ hàng!");
      } else {
        sessionStorage.removeItem("accessToken");
        sessionStorage.removeItem("user");
        navigate('/login');
      }
    } catch (err) {
      console.error('Add to cart error:', err);
    }
  };

  const orderSource = sessionStorage.getItem('orderSource');
  const isOutOfStock = items?.is_active === false;

  if (orderSource === 'table') {
    return (
      <Col xs={6} sm={6} md={4} lg={3}>
        <div className={`product-card ${isOutOfStock ? 'out-of-stock' : ''}`}>
          <div className="product-img">
            <img src={imageSrc} alt={name} />
            {isOutOfStock && <div className="out-of-stock-label">Đã hết</div>}
          </div>

          <div className="product-info">
            <span className="product-name">
              {name}
            </span>

            <span className="product-price">
              {price?.toLocaleString('vi', {
                style: 'currency',
                currency: 'VND'
              })}
            </span>

            <button
              className="btn btn-add-cart"
              disabled={isOutOfStock}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isOutOfStock) addProductInCart(id);
              }}
            >
              <i className="fa-solid fa-cart-plus"></i>
            </button>
          </div>
        </div>
      </Col>
    );
  }

  return (
    <Col xs={6} sm={6} md={4} lg={3}>
      <Link 
        to={isOutOfStock ? '#' : `/detail/${id}`} 
        className={`product-card ${isOutOfStock ? 'out-of-stock' : ''}`}
        onClick={(e) => isOutOfStock && e.preventDefault()}
      >
        <div className="product-img">
          <img src={imageSrc} alt={name} />
          {isOutOfStock && <div className="out-of-stock-label">Đã hết</div>}
        </div>

        <div className="product-info">
          <span className="product-name">
            {name}
          </span>

          <span className="product-price">
            {price?.toLocaleString('vi', {
              style: 'currency',
              currency: 'VND'
            })}
          </span>

          <button
            className="btn btn-add-cart"
            disabled={isOutOfStock}
            onClick={(e) => {
              e.preventDefault();     // không chuyển sang detail
              e.stopPropagation();    // chặn click lan ra Link
              if (!isOutOfStock) addProductInCart(id);
            }}
          >
            <i className="fa-solid fa-cart-plus"></i>
          </button>
        </div>
      </Link>
    </Col>
  );
}

export default ProductCard;