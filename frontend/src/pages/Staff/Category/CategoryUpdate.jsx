import React, { useEffect, useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';

function CategoryAdd(props) {
    const [cateItem, setCateItem] = useState(null);
    const { id } = useParams();
    const navigate = useNavigate();

    useEffect(()=>{
        if(id !== null && id !== undefined){
            const fetchCategoryItem = async ()=>{
                const response = await fetch(`/api/category/${id}`);
                const data = await response.json();
                
                if(data) setCateItem(data);
            }

            fetchCategoryItem();
        }
    },[]);

    const handleUpdateCate = async (event) =>{
        event.preventDefault();
        
        const formData = new FormData();
        formData.append("name", cateItem.name);
        formData.append("image", cateItem.image);

        const response = await fetch(`/api/category/${id}`,{
            method: 'put',
            body: formData
        });        
        const data = await response.json();

        if(data) navigate('/staff/category');
    }

    return (
        <section className="block-category">
            <h3 className="title-admin">Cập nhập danh mục</h3>
    
            <div className="category-container background-radius">
                {cateItem && (
                    <Form className='category-form' onSubmit={handleUpdateCate}>
                        <Form.Group className='mb-4'>
                            <Form.Label>Tên danh mục</Form.Label>
                            <Form.Control
                                // required
                                type="text"
                                name="name"
                                value={cateItem.name || ''}
                                onChange={(event)=> setCateItem({...cateItem, name: event.target.value})}
                            />
                        </Form.Group>

                        <Form.Group className="position-relative mb-4">
                            <Form.Label>Hình ảnh</Form.Label>
                            <Form.Control
                                type="file"
                                // required
                                name="image"
                                accept=".jpg, .jpeg, .png"
                                onChange={(event)=> setCateItem({...cateItem, image: event.target.files[0]})}
                            />
                        </Form.Group>
                        <Button className='btn-add' type="submit">Cập nhập</Button>
                    </Form>
                )}
            </div>
        </section>
    );
}

export default CategoryAdd;