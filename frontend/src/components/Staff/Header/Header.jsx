import React from 'react';
import { 
    FaSearch,
    FaBell,
    FaUser,
    FaRunning,
    FaUserAlt
} from "react-icons/fa";

import './header.scss';

function Header(props) {
    const user = JSON.parse(sessionStorage.getItem("user"));
    
    const handleClickLogOut = (event)=>{
        event.preventDefault();

        sessionStorage.setItem('user', JSON.stringify(null));
        sessionStorage.setItem('accessToken', JSON.stringify(''));
        window.location.href = '/staff';
    }

    return (
        <div className="header-staff">
            <div className="col-2">
                {/* <img src={listImg} className="slider__header-showicon" /> */}
            </div>
            <div className="header__search">
                <span className="search-icon">
                <FaSearch />
                </span>
                <input type="text" className="form-search" placeholder="Search" />
            </div>

            <div className="header__user">
                <div className="header__notifi">
                    <FaBell />
                </div>

                <div className="header__user-avatar">
                    {/* <img src={userImg} alt="" className="user-img" /> */}
                    <FaUserAlt />
                    <div className="header__user-profile">
                        <div className="user-profile-name">
                            <h4>{user && user.firstName}</h4>
                        </div>

                        <ul className="profile-list">
                            <li className="profile-item">
                                <a href="" className="profile-item-link">
                                    <FaUser />
                                    Thông tin cá nhân
                                </a>
                            </li>
                        </ul>

                        <div className="user-logout">
                            <FaRunning />
                            <a onClick={(event) => handleClickLogOut(event)} href="" className="profile-item-link">
                                Đăng xuất
                            </a>
                        </div>
                    </div>
                </div>

                {/* <p>{user && user.firstName}</p> */}
            </div>
        </div>
    );
}

export default Header;