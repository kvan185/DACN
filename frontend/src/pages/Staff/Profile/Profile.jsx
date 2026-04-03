import React, { useState, useRef } from "react";
import { Container, Row, Col } from "react-bootstrap";
import { ToastContainer, toast } from "react-toastify";
import { FaUser } from "react-icons/fa";
import "react-toastify/dist/ReactToastify.css";

import "./profile.scss";

function Profile() {

    const user = JSON.parse(sessionStorage.getItem("user"));
    const accessToken = sessionStorage.getItem("accessToken");

    const [userUpdate, setUserUpdate] = useState(user);
    const [selectedImage, setSelectedImage] = useState(null);
    const fileInputRef = useRef(null);

    const API_URL = import.meta.env.VITE_API_URL || "";

    const handleAvatarClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleImageChange = async (event) => {
        const file = event.target.files[0];
        if (file) {
            // Hiển thị preview ngay lập tức
            setSelectedImage(file);

            // Tự động Upload lên API
            const formData = new FormData();
            formData.append("avatar", file);

            try {
                const response = await fetch("/api/admin/update-avatar", {
                    method: "PUT",
                    body: formData,
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                const data = await response.json();

                if (response.ok) {
                    toast.success("Cập nhật ảnh đại diện thành công");
                    // Cập nhật lại state và sessionStorage
                    const updatedUser = { ...userUpdate, avatar: data.avatar };
                    setUserUpdate(updatedUser);
                    sessionStorage.setItem("user", JSON.stringify(updatedUser));
                } else {
                    toast.error(data.message || "Lỗi cập nhật ảnh đại diện");
                    // Rollback nếu lỗi
                    setSelectedImage(null);
                }

            } catch (error) {
                toast.error("Lỗi kết nối khi cập nhật ảnh");
                setSelectedImage(null);
            }
        }
    };

    const fetchUpdateInfoUser = async (event) => {
        event.preventDefault();

        const formData = new FormData();

        formData.append("first_name", userUpdate?.first_name || "");
        formData.append("last_name", userUpdate?.last_name || "");
        formData.append("phone", userUpdate?.phone || "");
        formData.append("age", userUpdate?.age || "");
        formData.append("gender", userUpdate?.gender || "");

        // Form submit thông thường không cần gửi avatar nữa vì đã tự update khi click

        try {
            const response = await fetch("/api/admin/profile", {
                method: "PUT",
                body: formData,
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });

            const data = await response.json();

            if (response.ok && data) {
                // Ensure we don't lose avatar that might have been updated earlier
                const finalData = { ...data, avatar: userUpdate.avatar };
                setUserUpdate(finalData);
                sessionStorage.setItem("user", JSON.stringify(finalData));
                toast.success("Cập nhật thông tin thành công");
            } else {
                toast.error(data.message || "Lỗi cập nhật thông tin");
            }

        } catch (error) {
            toast.error("Lỗi cập nhật thông tin");
        }
    };

    return (
        <>
            <ToastContainer position="top-right" autoClose={1000} />

            <div className="staff-profile">

                <Container>

                    <Row>

                        {/* Avatar */}
                        <Col md={4}>

                            <div className="profile-avatar">

                                <div 
                                    className="avatar-box" 
                                    onClick={handleAvatarClick} 
                                    style={{ cursor: "pointer" }}
                                >

                                    {selectedImage || userUpdate?.avatar ? (

                                        <img
                                            src={
                                                selectedImage
                                                    ? URL.createObjectURL(selectedImage)
                                                    : `${API_URL}${userUpdate.avatar}`
                                            }
                                            alt="avatar"
                                            style={{ objectFit: "cover", width: "100%", height: "100%", borderRadius: "50%" }}
                                        />

                                    ) : (

                                        <div className="avatar-default">
                                            <FaUser size={120} />
                                        </div>

                                    )}

                                    <input
                                        type="file"
                                        accept="image/jpeg, image/png, image/jpg"
                                        onChange={handleImageChange}
                                        ref={fileInputRef}
                                        style={{ display: "none" }}
                                    />

                                </div>

                                <p className="upload-text" onClick={handleAvatarClick} style={{ cursor: "pointer" }}>
                                    Nhấn vào ảnh để thay đổi
                                </p>

                            </div>

                        </Col>

                        {/* Info */}
                        <Col md={8}>

                            <div className="profile-info">

                                <h2>Thông tin nhân viên</h2>

                                <form onSubmit={fetchUpdateInfoUser}>

                                    <div className="form-row">

                                        <input
                                            type="text"
                                            placeholder="Họ"
                                            value={userUpdate?.first_name || ""}
                                            onChange={(e) =>
                                                setUserUpdate({
                                                    ...userUpdate,
                                                    first_name: e.target.value
                                                })
                                            }
                                        />

                                        <input
                                            type="text"
                                            placeholder="Tên"
                                            value={userUpdate?.last_name || ""}
                                            onChange={(e) =>
                                                setUserUpdate({
                                                    ...userUpdate,
                                                    last_name: e.target.value
                                                })
                                            }
                                        />

                                    </div>

                                    <input
                                        type="email"
                                        disabled
                                        value={userUpdate?.email || ""}
                                    />

                                    <div className="form-row">

                                        <input
                                            type="number"
                                            placeholder="Age"
                                            value={userUpdate?.age || ""}
                                            onChange={(e) =>
                                                setUserUpdate({
                                                    ...userUpdate,
                                                    age: e.target.value
                                                })
                                            }
                                        />

                                        <input
                                            type="text"
                                            placeholder="Phone"
                                            value={userUpdate?.phone || ""}
                                            onChange={(e) =>
                                                setUserUpdate({
                                                    ...userUpdate,
                                                    phone: e.target.value
                                                })
                                            }
                                        />

                                    </div>

                                    <select
                                        value={userUpdate?.gender || ""}
                                        onChange={(e) =>
                                            setUserUpdate({
                                                ...userUpdate,
                                                gender: e.target.value
                                            })
                                        }
                                    >
                                        <option value="">Giới tính</option>
                                        <option value="male">Nam</option>
                                        <option value="female">Nữ</option>
                                    </select>

                                    <button className="btn-update">
                                        Cập nhật
                                    </button>

                                </form>

                            </div>

                        </Col>

                    </Row>

                </Container>

            </div>
        </>
    );
}

export default Profile;