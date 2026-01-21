import React, { useEffect, useState } from 'react';
import { Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaRegEdit } from 'react-icons/fa';
import { MdDelete } from 'react-icons/md';

import './category.scss';

function Category(props) {
    const [categoryList, setCategoryList] = useState([]);

    const fetchListCate = async () =>{
        const response = await fetch('/api/category');
        const data = await response.json();
        
        if(data && data.length > 0) setCategoryList(data);
    }

    useEffect(()=>{
        fetchListCate();
    },[]);

    const handleDeleteCateItem = async (cateId)=>{
        const result = confirm('Bạn có muốn xóa');

        if(result && cateId){
            fetchDelete(cateId);
            fetchListCate();
        }
    }

    const fetchDelete = async (cateId) => {
        const response = await fetch(`/api/category/${cateId}`,{
            method: 'delete',
        });
        const data = await response.json();
        return data;
    }

    return (
        <section className="block-category">
            <h3 className="title-admin">Danh sách danh mục</h3>
    
            <div className="category-container background-radius">
                <div className="category-add">
                   <Link to='/staff/category/add'>Thêm mới</Link>
                </div>
        
                <Table className='category-table'>
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Tên danh mục</th>
                            <th>Hình ảnh</th>
                            <th>Trạng thái</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categoryList && categoryList.length > 0 && (
                            categoryList.map((cateItem, index)=>{
                                const {id, name, image, is_active} = cateItem;

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
                                            <span className={`category-status ${is_active ? 'active' : 'inactive'}`}>{is_active ? 'active' : 'inactive'}</span>
                                        </td>
                                        <td>
                                            <Link to={`/staff/category/update/${id}`}>
                                                <FaRegEdit className='icon-update'/>
                                            </Link>

                                            <MdDelete onClick={()=>handleDeleteCateItem(id)} className='icon-delete'/>
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

export default Category;