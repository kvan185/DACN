import React from 'react';

import contactImg from '../../../assets/img/contact.png';
import './contact.scss';

function Contact(props) {
    return (
        <div className='block-contact'>
            <div className="contact-form">
                <div className='contact-form-head'>
                    <h3>Bạn có câu hỏi hoặc hỏi về chúng tôi?</h3>
                    <span>Điền vào biểu mẫu này và chúng tôi sẽ liên hệ với bạn trong 48 giờ tới.</span>
                </div>

                <form method='post' action='/'>
                    <div className='contact-form-group'>
                        <input type="text" placeholder='Tên của bạn' name="name" />

                        <input type="text" placeholder='Email của bạn' name="email" />             
                    </div>
                    <div>
                        <textarea placeholder='Vui lòng nhập ý kiến của bạn' name="" id="" cols="30" rows="10"></textarea>
                    </div>

                    <div className='btn-contact'>
                        <input type="submit" value="Gửi" />
                    </div>
                </form>
            </div>
            <div className="contact-img">
                <img src={contactImg} alt="" />
            </div>
        </div>
    );
}

export default Contact;