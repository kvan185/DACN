import React, { useState } from "react";
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

    const API_URL = import.meta.env.VITE_API_URL;

    const handleImageChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedImage(file);
        }
    };

    const fetchUpdateInfoUser = async (event) => {
        event.preventDefault();

        const formData = new FormData();

        formData.append("firstName", userUpdate.firstName);
        formData.append("lastName", userUpdate.lastName);
        formData.append("phone", userUpdate.phone);
        formData.append("age", userUpdate.age);
        formData.append("gender", userUpdate.gender);

        if (selectedImage) {
            formData.append("avatar", selectedImage);
        }

        try {
            const response = await fetch("/api/staff", {
                method: "POST",
                body: formData,
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });

            const data = await response.json();

            if (data) {
                setUserUpdate(data);
                sessionStorage.setItem("user", JSON.stringify(data));
                toast.success("Cập nhật thông tin thành công");
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

                                <div className="avatar-box">

                                    {selectedImage || userUpdate?.avatar ? (

                                        <img
                                            src={
                                                selectedImage
                                                    ? URL.createObjectURL(selectedImage)
                                                    : `${API_URL}${userUpdate.avatar}`
                                            }
                                            alt="avatar"
                                        />

                                    ) : (

                                        <div className="avatar-default">
                                            <FaUser size={120} />
                                        </div>

                                    )}

                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                    />

                                </div>

                                <p className="upload-text">
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
                                            placeholder="First Name"
                                            value={userUpdate?.firstName || ""}
                                            onChange={(e) =>
                                                setUserUpdate({
                                                    ...userUpdate,
                                                    firstName: e.target.value
                                                })
                                            }
                                        />

                                        <input
                                            type="text"
                                            placeholder="Last Name"
                                            value={userUpdate?.lastName || ""}
                                            onChange={(e) =>
                                                setUserUpdate({
                                                    ...userUpdate,
                                                    lastName: e.target.value
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