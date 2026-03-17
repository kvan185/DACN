import React, { useState, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { getCategoryId } from '../../../actions/user';
import './category.scss';

function Category({ categories = [] }) {
    const dispatch = useDispatch();

    const wrapperRef = useRef(null);
    const listRef = useRef(null);

    const [activeIndex, setActiveIndex] = useState(0);
    const [offset, setOffset] = useState(0);
    const [maxOffset, setMaxOffset] = useState(0);

    /* ===== CALC WIDTH RESPONSIVE ===== */
    useEffect(() => {
        const calc = () => {
            if (!wrapperRef.current || !listRef.current) return;

            const wrapperWidth = wrapperRef.current.offsetWidth;
            const listWidth = listRef.current.scrollWidth;

            setMaxOffset(Math.max(listWidth - wrapperWidth, 0));

            // fix khi resize về mobile
            setOffset(prev => Math.min(prev, Math.max(listWidth - wrapperWidth, 0)));
        };


        calc();
        window.addEventListener('resize', calc);
        return () => window.removeEventListener('resize', calc);
    }, [categories]);

    const showNav = maxOffset > 0;

    const handlePrev = () => {
        if (!wrapperRef.current) return;
        setOffset(prev => Math.max(prev - wrapperRef.current.offsetWidth, 0));
    };

    const handleNext = () => {
        if (!wrapperRef.current) return;
        setOffset(prev =>
            Math.min(prev + wrapperRef.current.offsetWidth, maxOffset)
        );
    };

    const handleGetCateId = (id, index) => {
        dispatch(getCategoryId(id));
        setActiveIndex(index);
    };

    return (
        <div className="home-category">
            {showNav && (
                <button className="nav-btn" onClick={handlePrev} disabled={offset === 0}>
                    ◀
                </button>
            )}

            <div className="category-wrapper" ref={wrapperRef}>
                <ul
                    className="category-list"
                    ref={listRef}
                    style={{ transform: `translateX(-${offset}px)` }}
                >
                    {categories.map((cate, index) => (
                        <li
                            key={cate.id}
                            className={`category-item ${index === activeIndex ? 'active' : ''}`}
                            onClick={() => handleGetCateId(cate.id, index)}
                        >
                            {cate.name}
                        </li>
                    ))}
                </ul>
            </div>

            {showNav && (
                <button
                    className="nav-btn"
                    onClick={handleNext}
                    disabled={offset >= maxOffset}
                >
                    ▶
                </button>
            )}
        </div>
    );
}

export default Category;
