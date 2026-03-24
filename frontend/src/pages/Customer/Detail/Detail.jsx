import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; 
import { Row } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { setCartStore, setCartItems, setDisplayToast } from '../../../actions/user';
import Cart from '../../../components/Customer/Cart/Cart';
import ProductCard from '../../../components/Customer/Product-Card/ProductCard';
import { fetchAddProductToCart, fetchGetCart } from '../../../actions/cart';
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";import './detail.scss';
import "swiper/css";
import "swiper/css/navigation";
//
function Detail(props) {
    const [productItem, setProductItem] = useState(null);
    const [categoryID, setCategoryID] = useState(null);
    const [productRelated, setProductRelated] = useState([]);
    const [inputValue, setInputValue] = useState(1);
    const dispatch = useDispatch();
    const isToast = useSelector(state => state.user.isToast);
    
    useEffect(() => {
    if (isToast) {
        toast.success("Đã thêm vào giỏ hàng", {
            position: "top-right",
            autoClose: 1000,
        });

        dispatch(setDisplayToast(false));
    }
    }, [isToast, dispatch]);

    
    const API_URL = import.meta.env.VITE_API_URL;
    const imageSrc = productItem?.image_url
        ? `${API_URL}${productItem.image_url}`
        : '/images/no-image.png';
    const inputRef =useRef();
    let { id } = useParams();
    const navigate = useNavigate();
    const user = JSON.parse(sessionStorage.getItem("user"));
    const accessToken = sessionStorage.getItem("accessToken");

    const fetchProductDetail = async()=>{
        const response = await fetch(`/api/product/${id}`);
        const data = await response.json();

        // console.log("Product detail API:", data);

        if(data){
            setProductItem(data);
            setCategoryID(data.category_id);
            return;
        }
    }


    const fetchProductRelated = async () =>{
        const response = await fetch(`/api/product/category/${categoryID}`);
        const products = await response.json();

        if(products) setProductRelated(products);
        return;
    }
    
    useEffect(() => {
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
    }, [id]);

    useEffect(() => {
        if (id) {
            fetchProductDetail();
            setInputValue(1);
        }
    }, [id]);

    useEffect(() => {
        if (categoryID) {
            fetchProductRelated();
        }
    }, [categoryID]);

    const addProductInCart = async (idProduct) =>{  
        // console.log("Product ID nhận được:", idProduct);
        // console.log("productItem:", productItem);

        if(user && accessToken){
            if(!idProduct){
                console.error("❌ idProduct bị undefined");
                return;
            }

            let itemProduct = [{id: idProduct, qty: inputValue}];
            // console.log("Data gửi lên API:", itemProduct);

            await fetchAddProductToCart(accessToken, itemProduct);

            const response = await fetchGetCart(accessToken);
            const data = await response.json();

            if(data && data.cart){
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

        }else{
            navigate('/login');
        }
    }

    const onChangeHandler = event => {
        setInputValue(event.target.value);
    };

    const handlePlusProduct = () =>{
        let quantity = +inputRef.current.value + 1;
        setInputValue(quantity);
    }

    const handleMinusProduct = () =>{
        let quantity = +inputRef.current.value - 1;
        if(quantity < 0) quantity = 0;
        
        setInputValue(quantity);
    }
    
    return (
        <>
            <Cart accessToken={accessToken}/>
            <div className=''>
                <div className='product-details container'>
                    <div className='product-details__nav'>
                        <button className='product-details__back' onClick={() => navigate('/')}>
                             {/* ← Trang chủ  */}
                            </button>
                    </div>
                    <div className='product-details__head'>
                        <div className='product-details__images'>
                            <div className='product-details__images-main'>
                                <img  src={imageSrc} alt={productItem?.name || 'product image'} 
                                    onError={(e) => { e.target.onerror = null;
                                    e.target.src = '/images/no-image.png'; }} />
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
                            <hr />
                            <div className='product-details__options__group'>
                                <div className='product-details__options__group-quantity'>
                                    <button className='minus' type='button' onClick={() => handleMinusProduct()}>
                                        <svg width="10" height="3" viewBox="0 0 10 3" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M9.1904 0.393311H0.169434V2.51996H9.1904V0.393311Z" fill="#1AC073"/>
                                        </svg>
                                    </button>
                                    <input ref={inputRef} id='quantity' type='number' value={inputValue} name='quantity' onChange={onChangeHandler}/>
                                    <button className='add' type='button' onClick={() => handlePlusProduct()}>
                                        <svg width="10" height="9" viewBox="0 0 10 9" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M9.63367 3.39331H0.612793V5.51996H9.63367V3.39331Z" fill="#1AC073"/>
                                            <path d="M6.25098 8.70996L6.25098 0.203308L3.99573 0.203308L3.99573 8.70996H6.25098Z" fill="#1AC073"/>
                                        </svg>
                                    </button>
                                </div>
                                <button className='product-details__submit' type='submit' onClick={() => addProductInCart(productItem._id)}>
                                    <svg width="19" height="18" viewBox="0 0 19 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path fillRule="evenodd" clipRule="evenodd" d="M15.43 11.8456C15.95 11.8448 16.4537 11.6739 16.855 11.3621C17.2564 11.0503 17.5307 10.617 17.6311 10.1358L18.7588 4.81917C18.8241 4.51102 18.8161 4.19303 18.7356 3.8881C18.655 3.58318 18.5038 3.29891 18.2927 3.05569C18.0817 2.81247 17.8162 2.61632 17.5152 2.48145C17.2142 2.34658 16.8852 2.27631 16.552 2.27565H5.32544V1.21232C5.32544 0.930305 5.20662 0.659858 4.99515 0.460445C4.78368 0.261031 4.49688 0.148987 4.19782 0.148987H1.95273C1.65367 0.148987 1.36684 0.261031 1.15537 0.460445C0.943897 0.659858 0.825113 0.930305 0.825113 1.21232C0.825113 1.49433 0.943897 1.76478 1.15537 1.96419C1.36684 2.1636 1.65367 2.27565 1.95273 2.27565H3.08035V12.909C2.63388 12.9071 2.19685 13.0302 1.82465 13.2627C1.45245 13.4953 1.16179 13.8267 0.989534 14.2151C0.817284 14.6036 0.771178 15.0315 0.857047 15.4446C0.942917 15.8578 1.1569 16.2376 1.47189 16.536C1.78688 16.8344 2.18871 17.0378 2.62645 17.1207C3.0642 17.2035 3.5182 17.162 3.93088 17.0013C4.34356 16.8407 4.69637 16.568 4.94463 16.2181C5.19289 15.8682 5.32543 15.4566 5.32544 15.0356H13.1838C13.1856 15.4542 13.3188 15.8629 13.5667 16.2101C13.8146 16.5573 14.1661 16.8275 14.5767 16.9865C14.9873 17.1455 15.4386 17.1862 15.8737 17.1035C16.3089 17.0209 16.7083 16.8184 17.0215 16.5218C17.3347 16.2253 17.5478 15.8479 17.6337 15.4372C17.7197 15.0266 17.6746 14.6011 17.5044 14.2146C17.3341 13.828 17.0462 13.4977 16.677 13.2653C16.3078 13.033 15.8739 12.909 15.43 12.909H5.32544V11.8456H15.43ZM16.5576 4.40231L15.43 9.71897H5.32544V4.40231H16.552H16.5576Z" fill="#1AC073"/>
                                    </svg>
                                    Add To Cart
                                </button>
                            </div>
                            <hr />
                        </div>
                    </div>
                    <div className='product-details__related'>
                        <div className='product-details__related__title'>Sản phẩm liên quan</div>
                        <div className='product-details__related__list'>
                            <Row>
                                {productRelated.length > 0 && productRelated.map((product, index)=>{
                                        return <ProductCard key={index} items={product}/>
                                    })}
                            </Row>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default Detail;