import React, { useEffect, useState } from 'react';
import { Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaRegEdit } from 'react-icons/fa';
import { MdDelete } from 'react-icons/md';

import './product.scss';

function Product(props) {
    const [productList, setProductList] = useState([]);

    const fetchListProduct = async () =>{
        const response = await fetch('/api/product');
        const data = await response.json();
        
        if(data && data.length > 0) setProductList(data);
    }

    useEffect(()=>{
        fetchListProduct();
    },[]);

    const handleDeleteProItem = async (proId)=>{
        const result = confirm('Bạn có muốn xóa');

        if(result && proId){
            fetchDelete(proId);
            fetchListProduct();
        }
    }

    const fetchDelete = async (proId) => {
        const response = await fetch(`/api/product/${proId}`,{
            method: 'delete',
        });
        const data = await response.json();
        return data;
    }

    return (
        <section className="block-product-staff">
            <h3 className="title-admin">Danh sách sản phẩm</h3>
    
            <div className="product-container background-radius">
                <div className="product-add">
                   <Link to='/staff/product/add'>Thêm mới</Link>
                </div>
        
                <Table className='product-table'>
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Tên sản phẩm</th>
                            <th>Hình ảnh</th>
                            <th>Giá sản phẩm</th>
                            <th>Trạng thái</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {productList && productList.length > 0 && (
                            productList.map((proItem, index)=>{
                                const {id, name, image, price, is_active} = proItem;

                                return(
                                    <tr key={index}>
                                        <td>{index+1}</td>
                                        <td>
                                            {name}
                                        </td>
                                        <td>
                                            <img src={`http://localhost:8080/static/images/${image}`} alt=""/>
                                        </td>
                                        <td>
                                            {price.toLocaleString('vi', { style: 'currency', currency: 'VND' })}
                                        </td>
                                        <td>
                                            <span className={`product-status ${is_active ? 'active' : 'inactive'}`}>{is_active ? 'active' : 'inactive'}</span>
                                        </td>
                                        <td>
                                            <Link to={`/staff/product/update/${id}`}>
                                                <FaRegEdit className='icon-update'/>
                                            </Link>

                                            <MdDelete onClick={()=>handleDeleteProItem(id)} className='icon-delete'/>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </Table>
            </div>
        </section>
    );
}

export default Product;