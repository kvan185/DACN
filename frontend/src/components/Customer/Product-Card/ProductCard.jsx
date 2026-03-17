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

      await fetchAddProductToCart(accessToken, itemProduct);

      const response = await fetchGetCart(accessToken);
      const data = await response.json();

      if (data) {
        dispatch(setCartStore(data.cart));
        dispatch(setCartItems(data.cartItems));
        toast.success("Đã thêm vào giỏ hàng!");
      }
    } catch (err) {
      console.error('Add to cart error:', err);
    }
  };

return (
<Col xs={6} sm={6} md={4} lg={3}>
  <Link to={`/detail/${id}`} className="product-card">
    <div className="product-img">
      <img src={imageSrc} alt={name} />
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
        onClick={(e) => {
          e.preventDefault();     // không chuyển sang detail
          e.stopPropagation();    // chặn click lan ra Link
          addProductInCart(id);
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