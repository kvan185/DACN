import React, {useState, useEffect} from 'react';
import { Button, Form, FloatingLabel } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

function ProductAdd(props) {
    const [categoryList, setCategoryList] = useState([]);
    const [productAdd, setProductAdd] = useState({
        name: '',
        category_id: '',
        detail: '',
        price: 0,
        image: null,
    });
    const navigate = useNavigate();

    const fetchListCate = async () =>{
        const response = await fetch('/api/category');
        const data = await response.json();
        
        if(data && data.length > 0) setCategoryList(data);
    }

    const handleSubmit = async () =>{
        event.preventDefault();

        const formData = new FormData();
        formData.append("name", productAdd.name);
        formData.append("category_id", productAdd.category_id);
        formData.append("detail", productAdd.detail);
        formData.append("price", productAdd.price);
        formData.append("image", productAdd.image);

        const response = await fetch('/api/product',{
            method: 'post',
            body: formData
        });
        const data = await response.json();

        if(data) navigate('/staff/product');
    }

    useEffect(()=>{
        fetchListCate();
    },[]);

    return (
        <section className="block-product-staff">
            <h3 className="title-admin">Thêm mới sản phẩm</h3>

            <div className="product-container background-radius">
                <form className='product-form' onSubmit={handleSubmit}>
                    <Form.Group className='mb-4'>
                        <Form.Label>Tên danh mục</Form.Label>
                        <Form.Control
                            // required
                            onChange={(event)=>setProductAdd({...productAdd, name: event.target.value})}
                            type="text"
                            name="name"
                        />
                    </Form.Group>

                    <Form.Group className="position-relative mb-4">
                        <Form.Label>Danh mục</Form.Label>
                        <Form.Select aria-label="Default select example" 
                            onChange={(event)=>setProductAdd({...productAdd, category_id: event.target.value})}
                        >
                            <option>Chọn danh mục</option>
                            {categoryList && (
                                categoryList.map((cateItem, index)=>{
                                    const {id, name} = cateItem;

                                    return(
                                        <option key={index} value={id}>{name}</option>
                                    )
                                })
                            )}
                        </Form.Select>
                    </Form.Group>

                    <Form.Group className='mb-4'>
                        <Form.Label>Giá sản phẩm</Form.Label>
                        <Form.Control
                            // required
                            onChange={(event)=>setProductAdd({...productAdd, price: event.target.value})}
                            type="number"
                            name="price"
                        />
                    </Form.Group>

                    <Form.Group className="position-relative mb-4">
                        <Form.Label>Hình ảnh</Form.Label>
                        <Form.Control
                            type="file"
                            // required
                            name="image"
                            accept=".jpg, .jpeg, .png"
                            onChange={(event)=> setProductAdd({...productAdd, image: event.target.files[0]})}
                        />
                    </Form.Group>

                    <Form.Group className="position-relative mb-4">
                        <Form.Label>Mô tả</Form.Label>
                        <FloatingLabel controlId="floatingTextarea2">
                            <Form.Control
                            as="textarea"
                            placeholder="Leave a comment here"
                            style={{ height: '200px' }}
                            onChange={(event)=>setProductAdd({...productAdd, detail: event.target.value})}
                            />
                        </FloatingLabel>
                    </Form.Group>

                    <Button className='btn btn-add' type="submit">Thêm mới</Button>
                </form>
            
            </div>
        </section>
    );
}

export default ProductAdd;