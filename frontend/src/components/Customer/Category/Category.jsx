import React, { useState } from 'react';
import { useDispatch } from 'react-redux';

import { getCategoryId } from '../../../actions/user';
import './category.scss';

function Category({categories}) {
    const [indexActive, setIndexActive] = useState(0);
    const dispatch = useDispatch();

    const handleGetCateId = (categoryId, index) =>{
        const action = getCategoryId(categoryId);
        dispatch(action);
        setIndexActive(index);
    }

    return (
        <div className='home-category'>
            <ul className="category-list">
                {
                    categories && (
                        categories.map((cate,index)=>{
                            const {id, name} = cate;

                            return(
                                <li onClick={()=>handleGetCateId(id, index)} key={id} className={`category-item ${index === indexActive ? "active" : ""}`}>{name}</li>
                            )
                        })
                    )
                }
            </ul>
        </div>
    );
}

export default Category;