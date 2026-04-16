import React, { useState, useEffect } from 'react';
import { Container, Row } from 'react-bootstrap';
import { useSelector, useDispatch } from 'react-redux';
import { ToastContainer, toast } from 'react-toastify';
import { useLocation, useNavigate } from 'react-router-dom';
import './menu.scss';
import ProductCard from '../../../components/Customer/Product-Card/ProductCard';
import CategoryList from '../../../components/Customer/Category/Category';
import Cart from '../../../components/Customer/Cart/Cart';
import { setDisplayToast, getCategoryId } from '../../../actions/user';
import { socket } from '../../../socket';
import GuestJoin from './GuestJoin';

function Menu() {
    const [tableNumber, setTableNumber] = useState(null);
    const [products, setProducts] = useState([]);
    const [orderSource, setOrderSource] = useState('online');
    const accessToken = sessionStorage.getItem("accessToken");
    const dispatch = useDispatch();
    const isToast = useSelector(state => state.user.isToast);
    const location = useLocation();
    const navigate = useNavigate();
    const categoryId = useSelector(state => state.user.categoryId);
    const [categories, setCategories] = useState([]);

    const fetchCategory = async () => {
        const response = await fetch('/api/category/');
        const data = await response.json();

        const categoryActive = data.filter(item => item.is_active);
        setCategories(categoryActive);

        const categoryFirst = categoryActive[0];
        if (categoryFirst) {
            dispatch(getCategoryId(categoryFirst.id));
            const res = await fetch(`/api/product/category/${categoryFirst.id}`);
            const productsData = await res.json();
            setProducts(productsData);
        }
    };
    useEffect(() => {
        fetchCategory();
    }, []);

    const fetchProducts = async () => {
        if (categoryId) {
            const response = await fetch(`/api/product/category/${categoryId}`);
            const data = await response.json();
            setProducts(data);
        }
    };
    useEffect(() => {
        fetchProducts();
    }, [categoryId]);

    const [showGuestJoin, setShowGuestJoin] = useState(false);
    const [guestName, setGuestName] = useState(null);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        let table = params.get('table');

        if (table) {
            setOrderSource('table');
            // Kiểm tra format table=3/khanhvan+code 
            if (table.includes('/')) {
                const slashIndex = table.indexOf('/');
                const tabNum = table.substring(0, slashIndex);
                const userCode = table.substring(slashIndex + 1);
                
                setTableNumber(tabNum);
                sessionStorage.setItem('tableNumber', tabNum);
                sessionStorage.setItem('orderSource', 'table');
                
                // userCode có thể là "Khánh Văn 0375266538"
                // Ta tìm khoảng trắng cuối cùng để tách số điện thoại (code)
                const lastSpaceIndex = userCode.lastIndexOf(' ');
                let uname = userCode;
                let ucode = '';

                if (lastSpaceIndex !== -1) {
                    uname = userCode.substring(0, lastSpaceIndex).trim();
                    ucode = userCode.substring(lastSpaceIndex + 1).trim();
                }

                setGuestName(uname);
                sessionStorage.setItem('guest_session', JSON.stringify({ 
                    table: tabNum, 
                    username: uname, 
                    code: ucode, 
                    sessionId: ucode 
                }));
            } else {
                setTableNumber(table);
                sessionStorage.setItem('tableNumber', table);
                sessionStorage.setItem('orderSource', 'table');

                // Mở model check session
                setShowGuestJoin(true);
            }
        } else {
            setOrderSource('online');
            sessionStorage.setItem('orderSource', 'online');
        }
    }, [location]);

    const handleGuestJoined = (username, code, sessionId) => {
        setShowGuestJoin(false);
        setGuestName(username);
        // Thay đổi URL mà không reload trang 
        navigate(`/menu?table=${tableNumber}/${username}+${code}`, { replace: true });
    };

    useEffect(() => {
        const savedOrderSource = sessionStorage.getItem('orderSource');
        const savedTableNumber = sessionStorage.getItem('tableNumber');

        if (savedOrderSource) {
            setOrderSource(savedOrderSource);
            if (savedOrderSource === 'table' && savedTableNumber) {
                setTableNumber(savedTableNumber);
            }
        }

        // Lắng nghe tín hiệu kho thay đổi để tải lại dữ liệu mới nhất
        socket.on('stock_changed', () => {
            fetchProducts();
        });

        return () => {
            socket.off('stock_changed');
        };
    }, []);

    useEffect(() => {
        if (isToast) {
            toast.success('Đã thêm vào giỏ hàng');
            dispatch(setDisplayToast(!isToast));
        }
    }, [isToast]);


    return (
        <>
            <ToastContainer
                position="top-right"
                autoClose={1000}
            />
            <Cart accessToken={accessToken} />
            <Container className='block-menu'>
                <div className="menu-products">
                    {/* <h2>Thực Đơn</h2> */}
                    <div className="order-info">
                        {orderSource === 'table' ? (
                            <div className="table-info">
                                <span> THỰC ĐƠN | Bàn: {tableNumber} | Khách: {guestName || 'Khách vãng lai'} </span>
                            </div>
                        ) : (
                            <div className="online-info">
                                <span>Đặt hàng online</span>
                            </div>
                        )}
                    </div>
                    
                    <GuestJoin 
                        show={showGuestJoin} 
                        tableNumber={tableNumber} 
                        onJoined={handleGuestJoined} 
                    />
                    <div className="mb-2"> {/* mb-5 tạo khoảng cách lớn phía dưới category */}
                        <CategoryList categories={categories} />
                    </div>
                    <Row>
                        {products
                            .filter(product => {
                                if (!categoryId) return false;
                                return product.category_id === categoryId;
                            })
                            .map((product, index) => (
                                <ProductCard
                                    key={index}
                                    items={product}
                                    orderSource={orderSource}
                                    className="m-2" />))}
                    </Row>
                </div>
            </Container>
        </>
    );
}

export default Menu;
