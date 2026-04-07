import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Row, Col, Spinner } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { setCartStore, setCartItems, setDisplayToast } from '../../../actions/user';
import Cart from '../../../components/Customer/Cart/Cart';
import { fetchAddProductToCart, fetchGetCart } from '../../../actions/cart';
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import './detail.scss';

function Detail(props) {
    const [productItem, setProductItem] = useState(null);
    const [categoryID, setCategoryID] = useState(null);
    const [productRelated, setProductRelated] = useState([]);
    const [inputValue, setInputValue] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const dispatch = useDispatch();
    const isToast = useSelector(state => state.user.isToast);
    const [ingredients, setIngredients] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [maxQuantity, setMaxQuantity] = useState(0);

    const API_URL = import.meta.env.VITE_API_URL;
    const inputRef = useRef();
    let { id } = useParams();
    const navigate = useNavigate();
    const user = JSON.parse(sessionStorage.getItem("user"));
    const accessToken = sessionStorage.getItem("accessToken");

    const fetchIngredientsByProduct = async (productId) => {
        try {
            const res = await fetch(`/api/productBom/product/${productId}`);
            const data = await res.json();
            setIngredients(data || []);

            if (data && data.length > 0) {
                let max = Infinity;

                data.forEach(item => {
                    const stock = item.ingredient_id?.qty;
                    if (stock === undefined) return;

                    const need = item.quantity;
                    if (!need || need <= 0) return;

                    const possible = Math.floor(stock / need);
                    max = Math.min(max, possible);
                });

                const finalMax = max === Infinity ? 0 : max;
                setMaxQuantity(finalMax);
            }
            else {
                setMaxQuantity(0);
            }
        } catch (err) {
            console.error(err);
            setIngredients([]);
        }
    };

    useEffect(() => {
        if (productItem?._id) {
            fetchIngredientsByProduct(productItem._id);
        }
    }, [productItem]);

    useEffect(() => {
        if (inputValue > maxQuantity && maxQuantity !== 0) {
            setInputValue(maxQuantity);
        }
    }, [maxQuantity, inputValue]);

    useEffect(() => {
        if (isToast) {
            toast.success("Đã thêm vào giỏ hàng", {
                position: "top-right",
                autoClose: 1000,
            });

            dispatch(setDisplayToast(false));
        }
    }, [isToast, dispatch]);

    const fetchProductDetail = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/product/${id}`);
            const data = await response.json();

            if (data) {
                setProductItem(data);
                setCategoryID(data.category_id);
            }
        } catch (error) {
            console.error("Error fetching product detail:", error);
        }
    }

    const fetchProductRelated = async () => {
        if (!categoryID) return;
        try {
            const response = await fetch(`/api/product/category/${categoryID}`);
            const products = await response.json();

            if (products && Array.isArray(products)) {
                // Lọc bỏ sản phẩm hiện tại để không bị lặp trong danh sách Gợi ý
                const filteredProducts = products.filter(
                    (product) => product._id !== id && product.id !== id
                );
                setProductRelated(filteredProducts);
            }
        } catch (error) {
            console.error("Error fetching related products:", error);
        } finally {
            setIsLoading(false);
        }
    }

    // Scroll to top khi thay đổi sản phẩm
    useEffect(() => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }, [id]);

    // Fetch lại Detail mỗi khi `id` thay đổi
    useEffect(() => {
        if (id) {
            fetchProductDetail();
            setInputValue(1);
        }
    }, [id]);

    // Fetch Danh sách Related khi tìm ra CategoryID
    useEffect(() => {
        if (categoryID) {
            fetchProductRelated();
        }
    }, [categoryID, id]);

    const addProductInCart = async (idProduct) => {
        if (maxQuantity === 0) {
            toast.error("Món đã hết nguyên liệu");
            return;
        }

        if (inputValue > maxQuantity) {
            toast.error(`Chỉ còn tối đa ${maxQuantity} món`);
            return;
        }

        if (user && accessToken) {
            if (!idProduct) return;

            let itemProduct = [{ id: idProduct, qty: inputValue }];

            await fetchAddProductToCart(accessToken, itemProduct);

            const response = await fetchGetCart(accessToken);
            const data = await response.json();

            if (data && data.cart) {
                const cartAction = setCartStore(data.cart);
                const cartItemsAction = setCartItems(data.cartItems);
                dispatch(cartAction);
                dispatch(cartItemsAction);
                dispatch(setDisplayToast(true));
            } else {
                sessionStorage.removeItem("accessToken");
                sessionStorage.removeItem("user");
                navigate('/login');
            }

        } else {
            const orderSource = localStorage.getItem('orderSource');
            if (orderSource === 'table') {
                let guestCart = JSON.parse(localStorage.getItem('guestCart')) || [];
                const existingItemIndex = guestCart.findIndex(item => item.id === idProduct);

                if (existingItemIndex > -1) {
                    guestCart[existingItemIndex].qty += inputValue;
                    guestCart[existingItemIndex].total_price = guestCart[existingItemIndex].qty * productItem.price;
                } else {
                    guestCart.push({
                        id: idProduct,
                        product_id: idProduct,
                        product_name: productItem.name,
                        product_image: productItem.image_url || 'no-image.png',
                        price: productItem.price,
                        qty: inputValue,
                        total_price: productItem.price * inputValue
                    });
                }

                localStorage.setItem('guestCart', JSON.stringify(guestCart));
                dispatch(setCartItems(guestCart));
                dispatch(setCartStore({
                    id: 'guest',
                    total_item: guestCart.reduce((sum, i) => sum + i.qty, 0),
                    total_price: guestCart.reduce((sum, i) => sum + i.total_price, 0)
                }));
                dispatch(setDisplayToast(true));
            } else {
                navigate('/login');
            }
        }
    }

    const onChangeHandler = event => {
        let value = +event.target.value;

        if (value > maxQuantity) value = maxQuantity;
        if (value < 1) value = 1;

        setInputValue(value);
    };

    const handlePlusProduct = () => {
        if (inputValue < maxQuantity) {
            setInputValue(inputValue + 1);
        }
    }

    const handleMinusProduct = () => {
        if (inputValue > 1) {
            setInputValue(inputValue - 1);
        }
    }

    const imageSrc = productItem?.image_url
        ? `${API_URL}${productItem.image_url}`
        : '/images/no-image.png';

    return (
        <>
            <Cart accessToken={accessToken} />
            <div className='detail-page-wrapper'>
                <div className='product-details container'>
                    <div className='product-details__nav'>
                        <button className='product-details__back' onClick={() => navigate('/')}>
                            <i className="fa fa-arrow-left pe-2"></i>
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
                            <Spinner animation="border" variant="success" />
                        </div>
                    ) : (
                        <>
                            <div className='product-details__head'>
                                <div className='product-details__images'>
                                    <div className='product-details__images-main'>
                                        <img src={imageSrc} alt={productItem?.name || 'product image'}
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = '/images/no-image.png';
                                            }} />
                                    </div>
                                </div>
                                <div className='product-details__options'>
                                    <div className='product-details__options__name'>
                                        {productItem && productItem.name}
                                    </div>
                                    <div className='product-details__desc'>
                                        <div className='product-details__desc__text'>
                                            {productItem && productItem.detail}
                                        </div>
                                    </div>
                                    <div className='product-details__options__price'>
                                        {productItem && productItem.price.toLocaleString('vi', { style: 'currency', currency: 'VND' })}
                                    </div>
                                    <div style={{ marginTop: "10px" }}>
                                        {maxQuantity > 0 ? (
                                            <p style={{ color: "#1ac073", fontWeight: "600", fontSize: "15px" }}>
                                                <i className="fa fa-check-circle pe-1"></i> Có thể đặt tối đa: {maxQuantity} món
                                            </p>
                                        ) : (
                                            <p style={{ color: "red", fontWeight: "600", fontSize: "15px" }}>
                                                <i className="fa fa-times-circle pe-1"></i> Món ăn đã hết nguyên liệu
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        className="btn-view-ingredients mt-2"
                                        onClick={() => {
                                            setShowModal(true);
                                        }}
                                    >
                                        <i className="fa fa-list pe-1"></i> Xem thành phần
                                    </button>
                                    <hr className="my-4" />
                                    <div className='product-details__options__group'>
                                        <div className='product-details__options__group-quantity'>
                                            <button className='minus' type='button' onClick={() => handleMinusProduct()}>
                                                <i className="fa fa-minus" style={{ color: "#1AC073" }}></i>
                                            </button>
                                            <input
                                                disabled={maxQuantity === 0}
                                                ref={inputRef}
                                                type='number'
                                                value={inputValue}
                                                min={1}
                                                max={maxQuantity}
                                                onChange={onChangeHandler}
                                            />
                                            <button className='add' type='button' onClick={() => handlePlusProduct()}>
                                                <i className="fa fa-plus" style={{ color: "#1AC073" }}></i>
                                            </button>
                                        </div>
                                        <button
                                            className='product-details__submit'
                                            disabled={maxQuantity === 0}
                                            onClick={() => addProductInCart(productItem._id)}
                                        >
                                            <i className="fa fa-shopping-cart pe-2"></i> Thêm vào giỏ hàng
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* KHU VỰC SẢN PHẨM LIÊN QUAN */}
                            <div className='product-details__related mt-5 mb-5'>
                                <div className='product-details__related__title mb-4 pb-2'>
                                    <h3 className="fs-4 fw-bold m-0">Gợi ý cho bạn</h3>
                                    <div className="title-underline"></div>
                                </div>
                                <div className='product-details__related__list'>
                                    {productRelated.length > 0 ? (
                                        <Row className="g-4">
                                            {productRelated.slice(0, 4).map((product, index) => {
                                                const isHot = index % 2 === 0;
                                                return (
                                                    <Col lg={3} md={4} sm={6} xs={12} key={product._id || index}>
                                                        <div className="modern-product-card" onClick={() => navigate(`/detail/${product._id || product.id}`)}>
                                                            <div className="mpc-image-wrapper">
                                                                <img
                                                                    src={product.image_url ? `${API_URL}${product.image_url}` : `${API_URL}/static/images/${product.image}`}
                                                                    alt={product.name}
                                                                    className="mpc-image"
                                                                    onError={(e) => {
                                                                        e.target.onerror = null;
                                                                        e.target.src = '/images/no-image.png';
                                                                    }}
                                                                />
                                                                {isHot && (
                                                                    <div className="mpc-badge mpc-badge-hot">Bán chạy</div>
                                                                )}
                                                                {!isHot && (
                                                                    <div className="mpc-badge mpc-badge-new">Mới</div>
                                                                )}
                                                                <div className="mpc-overlay">
                                                                    <button className="mpc-btn-view">Xem chi tiết</button>
                                                                </div>
                                                            </div>
                                                            <div className="mpc-info">
                                                                <h5 className="mpc-name" title={product.name}>{product.name}</h5>
                                                                <p className="mpc-price">
                                                                    {product.price?.toLocaleString('vi', { style: 'currency', currency: 'VND' })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </Col>
                                                )
                                            })}
                                        </Row>
                                    ) : (
                                        <div className="text-center py-4 text-muted fst-italic">
                                            Không tìm thấy sản phẩm liên quan nào cùng danh mục.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Modal Components */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content border-0 p-4 rounded-4" onClick={(e) => e.stopPropagation()}>
                        <h4 className="border-bottom pb-3 mb-3 text-success fw-bold">Thành phần chi tiết</h4>

                        {ingredients.length > 0 ? (
                            <div className="table-responsive">
                                <table className="table table-hover modal-table">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Nguyên liệu</th>
                                            <th className="text-center">Mức tiêu hao</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ingredients.map((ing) => (
                                            <tr key={ing._id}>
                                                <td className="fw-medium text-dark">{ing.ingredient_id?.name}</td>
                                                <td className="text-center">
                                                    <span className="badge bg-success bg-opacity-10 text-success px-3 py-2 fs-6 rounded-pill">
                                                        {ing.quantity} {ing.ingredient_id?.unit}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-muted text-center py-4">Sản phẩm này chưa được kê khai thành phần.</p>
                        )}

                        <div className="modal-actions mt-3 d-flex justify-content-end">
                            <button className="btn btn-secondary px-4 py-2 rounded-3" onClick={() => setShowModal(false)}>Đóng</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default Detail;
