import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaShoppingCart, FaTable, FaUserPlus, FaList, FaBox, FaChartBar } from 'react-icons/fa';

import './menus.scss';

const sliders = [
    {
        url: '/staff',
        icon: <FaHome />,
        name: 'Trang chủ',
    },
    {
        url: '/staff/order',
        icon: <FaShoppingCart />,
        name: 'Đơn hàng',
    },
    {
        url: '/staff/table',
        icon: <FaTable />,
        name: 'Quản lý bàn',
    },
    {
        url: '/staff/register',
        icon: <FaUserPlus />,
        name: 'Đăng ký',
        role: 'ADMIN'
    },
    {
        url: '/staff/category',
        icon: <FaList />,
        name: 'Danh mục',
        role: 'ADMIN'
    },
    {
        url: '/staff/product',
        icon: <FaBox />,
        name: 'Sản phẩm',
        role: 'ADMIN'
    },
    {
        url: '/staff/revenue',
        icon: <FaChartBar />,
        name: 'Doanh thu',
        role: 'ADMIN'
    },
];

function Menus() {
    const user = JSON.parse(sessionStorage.getItem("user"));
    let roleUser = user ? user.role : null;
    const location = useLocation();

    return (
        <div className="slider__menu">
            <ul className="slider__menu-list">
                {sliders.map((item, index) => {
                    const { url, icon, name, role } = item;
                    const isActive = location.pathname === url;

                    return (
                        <li 
                            className={`slider__menu-item ${isActive ? 'active' : ''}`}
                            key={index}
                        >
                            <Link 
                                to={url} 
                                className={`slider__menu-link ${role && role !== roleUser ? 'disable' : ''}`}
                            >
                                {icon}
                                <span className="slider__menu-name">{name}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

export default Menus;