import React, { useState, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import {
    FaSearch,
    FaBell,
    FaUserAlt,
    FaCircle
} from "react-icons/fa";
import "./header.scss";
function Header() {
    const user = JSON.parse(sessionStorage.getItem("user"));
    const location = useLocation();
    const [openProfile, setOpenProfile] = useState(false);
    const handleLogout = () => {
        sessionStorage.removeItem("user");
        sessionStorage.removeItem("accessToken");
        window.location.href = "/staff";
    };
    const timeoutRef = useRef(null);
    const handleMouseEnter = () => {
        clearTimeout(timeoutRef.current);
        setOpenProfile(true);};
    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => {
            setOpenProfile(false);}, 200); };// delay 200ms};
    return (
        <div className="header-staff">
            {/* LEFT */}
            <div className="header-left">
                <div className="header-search">
                    <FaSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm..."
                    />
                </div>
            </div>

            {/* RIGHT */}
            <div className="header-right">
                {/* NOTIFICATION */}
                <Link
                    to="/staff/notification"
                    className={`header-icon ${location.pathname === "/staff/notification" ? "active" : ""}`}
                >
                    <FaBell />
                </Link>

                {/* PROFILE */}
                <div
  className="header-avatar"
  onMouseEnter={handleMouseEnter}
  onMouseLeave={handleMouseLeave}
>
  <FaUserAlt />

  {openProfile && (
    <div className="profile-dropdown">

      <div className="profile-name">
        {user?.firstName}
      </div>

      <Link to="/staff/profile" className="dropdown-item">
        Hồ sơ cá nhân
      </Link>

      <div
        className="dropdown-item logout"
        onClick={handleLogout}
      >
        Đăng xuất
      </div>

    </div>
  )}
</div>
            </div>
        </div>
    );
}
export default Header;