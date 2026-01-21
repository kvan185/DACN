import React from 'react';
import Modal from 'react-bootstrap/Modal';
import { Link } from 'react-router-dom';

import './popupOrderSuccess.scss';

function PopupOrderSuccess(props) {

    return (
        <>
            <Modal
                {...props}
                size="lg"
                aria-labelledby="contained-modal-title-vcenter"
                centered
                className='modal__success'
                >
                <Modal.Header>
                    <Modal.Title id="contained-modal-title-vcenter">
                        Thông báo
                    </Modal.Title>

                </Modal.Header>
                <Modal.Body>
                    <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g filter="url(#filter0_d_186_1861)">
                        <rect x="30" y="20" width="100" height="100" rx="50" fill="#1AC073"/>
                        </g>
                        <path d="M64.7222 70.6945L75.3703 81.1112L96.6666 60.2778" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
                        <defs>
                        <filter id="filter0_d_186_1861" x="0" y="0" width="160" height="160" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                        <feOffset dy="10"/>
                        <feGaussianBlur stdDeviation="15"/>
                        <feColorMatrix type="matrix" values="0 0 0 0 0.25098 0 0 0 0 0.74902 0 0 0 0 1 0 0 0 0.24 0"/>
                        <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_186_1861"/>
                        <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_186_1861" result="shape"/>
                        </filter>
                        </defs>
                    </svg>

                    <h4 className='success-title'>Đặt hàng thành công</h4>

                </Modal.Body>
                <Modal.Footer>
                    <Link to='/history-order' className='btn-success-follow'>Theo dõi đơn hàng</Link>
                    <Link to='/' className='btn-success-continue'>Tiếp tục mua hàng</Link>
                </Modal.Footer>
            </Modal>
        </>
    );
}

export default PopupOrderSuccess;