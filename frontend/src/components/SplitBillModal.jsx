import React, { useState, useEffect } from 'react';
import { Modal, Button, Tabs, Tab, Table, Form, ProgressBar, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';

export default function SplitBillModal({ show, onHide, order, orderItems, onSuccess }) {
    const [tab, setTab] = useState('item');
    const [numPeople, setNumPeople] = useState(2);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Original items from order 
    const [itemsState, setItemsState] = useState([]);
    
    // Array of users
    const [users, setUsers] = useState([]);

    // Input quantity for assigning items en masse
    const [assignQtys, setAssignQtys] = useState({});

    // Raw total of all items (unit_price * qty) without VAT/Discounts if they differ
    const [rawItemsTotal, setRawItemsTotal] = useState(0);

    // State lưu giá trị đang nhập tạm thời để tránh nhảy số khi đang gõ
    const [localEdits, setLocalEdits] = useState({});

    useEffect(() => {
        if (order && show) {
            setupInitialState();
        }
    }, [order, show, orderItems]);

    const setupInitialState = () => {
        let iState = orderItems.map(i => ({ 
            ...i, 
            unit_price: i.price / i.qty, 
            leftQty: i.qty 
        }));
        setItemsState(iState);
        
        let sumRaw = iState.reduce((acc, it) => acc + (it.price || 0), 0);
        setRawItemsTotal(sumRaw);

        // Khởi tạo mặc định chia 2 người với số tiền được tính sẵn
        const n = 2;
        const baseAmt = Math.floor(order.total_price / n);
        const u1 = { id: 1, name: 'Khách 1', amount: baseAmt, percent: ((baseAmt / order.total_price) * 100).toFixed(1), items: [] };
        const u2 = { id: 2, name: 'Khách 2', amount: order.total_price - baseAmt, percent: (((order.total_price - baseAmt) / order.total_price) * 100).toFixed(1), items: [] };

        setUsers([u1, u2]);
        setNumPeople(2);
    };

    const handleNumPeopleChange = (e) => {
        let n = parseInt(e.target.value) || 2;
        if (n < 2) n = 2;
        if (n > 20) n = 20;
        setNumPeople(n);
        
        let newUsers = [];
        const baseAmt = Math.floor(order.total_price / n);
        let currentSum = 0;
        
        for (let i = 0; i < n; i++) {
            let amt = baseAmt;
            if (i === n - 1) {
                // Last user takes the remainder
                amt = order.total_price - currentSum;
            }
            currentSum += amt;
            const pct = (amt / order.total_price) * 100;
            newUsers.push({ id: i + 1, name: `Người ${i + 1}`, amount: amt, percent: pct.toFixed(1), items: [] });
        }
        setUsers(newUsers);
    };

    const handleAddUser = () => {
        const id = new Date().getTime(); // unique id
        const newName = `Khách ${users.length + 1}`;
        setUsers([...users, { id, name: newName, amount: 0, percent: 0, items: [] }]);
    };

    const handleDeleteUser = (userIndex) => {
        let targetUser = users[userIndex];
        
        // Trả lại các món đã gán vào kho leftQty
        let newItemsState = [...itemsState];
        if (targetUser.items && targetUser.items.length > 0) {
             targetUser.items.forEach(ui => {
                 let pIdx = newItemsState.findIndex(is => is.product_id === ui.product_id);
                 if (pIdx > -1) {
                     newItemsState[pIdx].leftQty += ui.qty;
                 }
             });
        }
        
        // Xóa user
        let newUsers = [...users];
        newUsers.splice(userIndex, 1);
        
        recalcItemSplitAmounts(newUsers);
        setItemsState(newItemsState);
    };

    // --- Tab: Percent / Custom ---
    const handlePercentChange = (index, value) => {
        let pct = parseFloat(value) || 0;
        if (pct < 0) pct = 0;
        if (pct > 100) pct = 100;
        let amt = Math.floor((pct / 100) * order.total_price);
        
        let newUsers = [...users];
        newUsers[index].percent = pct;
        newUsers[index].amount = amt;
        
        // Nếu người đang sửa là người cuối cùng, ta cần điều chỉnh người áp chót để bù trừ
        // Nếu không, chỉ điều chỉnh người cuối cùng
        redistributeToTarget(index, newUsers);
        setUsers(newUsers);
    };

    const handleAmountChange = (index, value) => {
        let amt = parseInt(value) || 0;
        if (amt < 0) amt = 0;
        if (amt > order.total_price) amt = order.total_price;
        
        let newUsers = [...users];
        newUsers[index].amount = amt;
        newUsers[index].percent = parseFloat(((amt / order.total_price) * 100).toFixed(1));
        
        redistributeToTarget(index, newUsers);
        setUsers(newUsers);
    };

    const redistributeToTarget = (changedIndex, newUsers) => {
        if (newUsers.length < 2) return;

        // Xác định người sẽ nhận phần bù trừ (mặc định là người cuối cùng)
        // Nếu đang sửa người cuối cùng, thì người bù trừ là người áp chót (hoặc người đầu tiên tùy logic, ở đây chọn cuối - 1)
        let targetIndex = newUsers.length - 1;
        if (changedIndex === newUsers.length - 1) {
            targetIndex = 0; // Hoặc newUsers.length - 2
        }

        let sumOthers = 0;
        for (let i = 0; i < newUsers.length; i++) {
            if (i !== targetIndex) {
                sumOthers += (parseInt(newUsers[i].amount) || 0);
            }
        }

        let remaining = order.total_price - sumOthers;
        newUsers[targetIndex].amount = remaining; // Có thể âm nếu tổng vượt quá, UI sẽ báo đỏ
        newUsers[targetIndex].percent = parseFloat(((remaining / order.total_price) * 100).toFixed(1));
    };

    // --- Tab: Item ---
    const handleAssignItem = (itemIndex, userIndex) => {
        let newItemsState = [...itemsState];
        let p = newItemsState[itemIndex];
        let addQty = assignQtys[itemIndex] || 1;
        
        if (p.leftQty <= 0) return;
        if (addQty > p.leftQty) addQty = p.leftQty;

        p.leftQty -= addQty;
        
        let newUsers = [...users];
        let tUser = newUsers[userIndex];
        const existIdx = tUser.items.findIndex(i => i.product_id === p.product_id);
        
        if (existIdx > -1) {
            tUser.items[existIdx].qty += addQty;
            tUser.items[existIdx].price += (addQty * p.unit_price);
        } else {
            tUser.items.push({
                product_id: p.product_id,
                product_name: p.product_name,
                qty: addQty,
                unit_price: p.unit_price,
                price: addQty * p.unit_price
            });
        }

        recalcItemSplitAmounts(newUsers);
        setItemsState(newItemsState);
    };

    const handleRemoveIndividualItem = (userIndex, uItemIndex, removeQty = 1) => {
        let newUsers = [...users];
        let tUser = newUsers[userIndex];
        let itemToRemove = tUser.items[uItemIndex];
        
        let newItemsState = [...itemsState];
        let pIdx = newItemsState.findIndex(is => is.product_id === itemToRemove.product_id);

        if (removeQty > itemToRemove.qty) removeQty = itemToRemove.qty;

        if (pIdx > -1) {
            newItemsState[pIdx].leftQty += removeQty;
        }
        
        if (itemToRemove.qty > removeQty) {
            tUser.items[uItemIndex].qty -= removeQty;
            tUser.items[uItemIndex].price -= (removeQty * itemToRemove.unit_price);
        } else {
            tUser.items.splice(uItemIndex, 1);
        }
        
        recalcItemSplitAmounts(newUsers);
        setItemsState(newItemsState);
    };

    // Recalculates amount ensuring exact match with order.total_price
    const recalcItemSplitAmounts = (newUsers) => {
        let userRawSums = newUsers.map(u => u.items.reduce((s, it) => s + (it.price || 0), 0));
        let totalAssignedRaw = userRawSums.reduce((a, b) => a + b, 0);

        if (totalAssignedRaw === 0) {
            // No items assigned, reset
            newUsers.forEach(u => {
                u.amount = 0;
                u.percent = 0;
            });
            setUsers(newUsers);
            return;
        }

        // If items assigned amount is not equal to order total, we pro-rate
        let currentAssignedTotal = 0;
        const totalToDistribute = order.total_price;
        const ratio = totalToDistribute / rawItemsTotal;

        for (let i = 0; i < newUsers.length; i++) {
            if (i === newUsers.length - 1) {
                // Last user gets the remainder if all items are assigned fully
                if (totalAssignedRaw === rawItemsTotal) {
                    newUsers[i].amount = totalToDistribute - currentAssignedTotal;
                } else {
                    newUsers[i].amount = Math.round(userRawSums[i] * ratio);
                }
            } else {
                let amt = Math.round(userRawSums[i] * ratio);
                newUsers[i].amount = amt;
                currentAssignedTotal += amt;
            }
            newUsers[i].percent = ((newUsers[i].amount / totalToDistribute) * 100).toFixed(1);
        }

        // Failsafe negative
        newUsers.forEach(u => { if (u.amount < 0) u.amount = 0 });
        setUsers(newUsers);
    };

    const handleSplit = async () => {
        if (!users || users.length === 0) return;
        
        let sum = users.reduce((acc, u) => acc + (parseInt(u.amount) || 0), 0);
        if (Math.abs(sum - order.total_price) > 10) {
            toast.error(`Tổng chia không bằng tổng bill ! Vui lòng kiểm tra lại.`);
            return;
        }
        
        // Validate amounts and names
        let nameSet = new Set();
        for (let u of users) {
             if (!u.name || u.name.trim() === '') {
                 toast.error('Có một khách chưa được đặt tên!');
                 return;
             }
             if (nameSet.has(u.name.trim().toLowerCase())) {
                 toast.error(`Tên khách "${u.name}" bị trùng lặp!`);
                 return;
             }
             nameSet.add(u.name.trim().toLowerCase());
             
             if (u.amount === 0 && (!u.items || u.items.length === 0)) {
                 toast.error(`Khách "${u.name}" chưa có món nào hoặc số tiền bằng 0!`);
                 return;
             }
             if (u.amount < 0) {
                 toast.error('Số tiền không hợp lệ!');
                 return;
             }
        }

        // Must assign all items if tab is item split
        if (tab === 'item') {
            let leftOver = itemsState.some(i => i.leftQty > 0);
            if (leftOver) {
                toast.error('Vui lòng phân bổ HẾT các món trong danh sách trước khi xác nhận!');
                return;
            }
        }
        
        setIsSubmitting(true);

        const data = users.filter(u => u.amount > 0).map(u => ({
            user: u.name.trim(),
            amount: u.amount,
            percent: u.percent,
            items: u.items
        }));
        
        try {
            const resp = await fetch('/api/payment/split', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: order._id || order.id,
                    splitType: tab,
                    data
                })
            });
            const resData = await resp.json();
            if (resData.success) {
                toast.success('Xác nhận chia hóa đơn thành công!');
                onHide();
                if (onSuccess) onSuccess(resData.splits, resData.orderId);
            } else {
                toast.error(resData.message || 'Lỗi chia hóa đơn');
            }
        } catch(e) {
            toast.error('Lỗi server. Vui lòng thử lại!');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!order) return null;

    const currentSum = users.reduce((acc, u) => acc + (parseInt(u.amount) || 0), 0);
    const diff = order.total_price - currentSum;
    
    // Valid condition
    let isSumValid = Math.abs(diff) <= 10;
    if (tab === 'item') {
        const hasLeftover = itemsState.some(i => i.leftQty > 0);
        if (hasLeftover) isSumValid = false;
    }
    const hasEmptyOrZeroUser = users.some(u => u.name.trim() === '' || (u.amount === 0 && u.items.length === 0));
    if (hasEmptyOrZeroUser) isSumValid = false;

    const progressVal = (currentSum / order.total_price) * 100;

    return (
        <Modal show={show} onHide={onHide} size="xl" backdrop="static" dialogClassName="modal-90w" scrollable>
            <Modal.Header closeButton className="bg-light py-2">
                <Modal.Title className="w-100 d-flex justify-content-between align-items-center">
                    <span>Chia hóa đơn - #{order.id}</span>
                    <h5 className="mb-0 text-danger fw-bold me-4 px-3 py-1 bg-white border border-danger rounded shadow-sm">
                        Tổng Bill: {order.total_price.toLocaleString()} VNĐ
                    </h5>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0 bg-light">
                <Tabs activeKey={tab} onSelect={(k) => { setTab(k); setupInitialState(); }} className="px-3 pt-2 bg-white border-bottom shadow-sm" variant="pills">
                    <Tab eventKey="item" title="Chia Theo Món" className="p-3">
                        <div className="d-flex w-100 h-100">
                            {/* CỘT TRÁI: DANH SÁCH MÓN */}
                            <div className="w-50 pe-3 border-end d-flex flex-column" style={{ height: '50vh', minHeight: '350px' }}>
                                <div className="d-flex justify-content-between align-items-end mb-2">
                                    <h5 className="fw-bold fs-6 text-primary mb-0">Danh Sách Món</h5>
                                    <small className="text-secondary fst-italic">Phải chia hết 100% món ăn</small>
                                </div>
                                <div className="flex-grow-1 overflow-auto pe-1">
                                    {itemsState.map((it, idx) => (
                                        <div key={idx} className={`d-flex align-items-center p-3 mb-2 border rounded shadow-sm ${it.leftQty === 0 ? 'bg-light opacity-50' : 'bg-white'}`}>
                                            <div className="flex-grow-1">
                                                <div className="fw-bold">{it.product_name}</div>
                                                <div className="text-secondary small">{it.unit_price.toLocaleString()} đ/cái</div>
                                            </div>
                                            <div className="text-center px-2 border-end border-start mx-2">
                                                <div className="small text-muted mb-1" style={{fontSize: '11px'}}>Tồn/Tổng</div>
                                                <b className="fs-6 text-primary">{it.leftQty}</b><span className="text-muted small">/{it.qty}</span>
                                            </div>
                                            <div className="d-flex flex-column align-items-end gap-1" style={{width: '200px'}}>
                                                <div className="d-flex align-items-center gap-1 mb-1">
                                                    <span className="text-muted fw-medium" style={{fontSize: '11px'}}>SL chuyển:</span>
                                                    <Form.Control 
                                                        type="number" size="sm" style={{width: '50px', textAlign: 'center', borderColor: '#0d6efd', fontSize: '12px', padding: '2px'}}
                                                        min="1" max={it.leftQty}
                                                        value={assignQtys[idx] || 1}
                                                        onChange={(e) => {
                                                            let val = parseInt(e.target.value);
                                                            if (isNaN(val) || val < 1) val = 1;
                                                            if (val > it.leftQty) val = it.leftQty;
                                                            setAssignQtys(prev => ({...prev, [idx]: val}))
                                                        }}
                                                        disabled={it.leftQty <= 0}
                                                    />
                                                </div>
                                                <div className="d-flex flex-wrap gap-1 justify-content-end">
                                                    {users.map((u, ui) => (
                                                        <Button 
                                                            key={ui} size="sm" variant="outline-primary"
                                                            className="text-truncate px-2 py-0 fw-bold" style={{maxWidth: '85px', fontSize: '11px'}}
                                                            disabled={it.leftQty <= 0} 
                                                            onClick={() => {
                                                                handleAssignItem(idx, ui);
                                                                setAssignQtys(prev => ({...prev, [idx]: 1})); 
                                                            }}
                                                            title={`Gán món cho ${u.name}`}
                                                        >
                                                            {u.name} <span className="ms-1">+</span>
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* CỘT PHẢI: DANH SÁCH NGƯỜI */}
                            <div className="w-50 ps-3 d-flex flex-column" style={{ height: '50vh', minHeight: '350px' }}>
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <h5 className="fw-bold fs-6 text-success mb-0">Hóa Đơn Tách Nhỏ</h5>
                                    <Button variant="success" size="sm" onClick={handleAddUser} className="d-flex align-items-center shadow-sm fw-bold px-2 py-1" style={{fontSize: '12px'}}>
                                        <span className="me-1">+</span> Thêm Người Trả
                                    </Button>
                                </div>
                                <div className="flex-grow-1 overflow-auto pe-1">
                                    {users.map((u, ui) => (
                                        <div key={ui} className="mb-3 border rounded shadow-sm bg-white overflow-hidden">
                                            <div className="bg-success bg-opacity-10 p-2 px-3 border-bottom d-flex justify-content-between align-items-center">
                                                <div className="d-flex align-items-center flex-grow-1">
                                                    <span className="me-2 text-success">👤</span>
                                                    <Form.Control 
                                                        value={u.name} 
                                                        onChange={e => {
                                                            let nu = [...users]; nu[ui].name = e.target.value; setUsers(nu);
                                                        }}
                                                        className="fw-bold border-bottom border-success border-top-0 border-start-0 border-end-0 bg-transparent px-1 text-success fs-6 shadow-none py-0"
                                                        style={{width: '200px', outline: 'none', borderRadius: 0}}
                                                        placeholder="Nhập tên người trả..."
                                                    />
                                                </div>
                                                <span className="fs-6 fw-bold text-danger">{u.amount.toLocaleString()} đ</span>
                                            </div>
                                            <div className="p-2">
                                                {u.items.length === 0 ? (
                                                    <div className="text-center text-muted py-2 fst-italic bg-light rounded border border-dashed" style={{fontSize: '12px'}}>
                                                        Hãy chọn số lượng món ở bên trái và bấm <b className="text-primary">+ {u.name}</b> để gán vào hóa đơn này.
                                                    </div>
                                                ) : (
                                                    <div className="d-flex flex-column gap-2">
                                                    {u.items.map((it, ixx) => (
                                                        <div key={ixx} className="d-flex justify-content-between align-items-center p-2 bg-light border rounded">
                                                            <div className="w-50 text-truncate fw-medium text-dark" title={it.product_name}>
                                                                {it.product_name}
                                                            </div>
                                                            <div className="d-flex align-items-center bg-white border rounded shadow-sm">
                                                                <Button variant="light" size="sm" className="border-0 px-2 py-1 text-danger fw-bold" onClick={() => handleRemoveIndividualItem(ui, ixx, 1)}>
                                                                    -
                                                                </Button>
                                                                <span className="px-3 fw-bold text-primary">{it.qty}</span>
                                                                <Button variant="light" size="sm" className="border-0 px-2 py-1 text-success fw-bold" onClick={() => {
                                                                    let gIdx = itemsState.findIndex(is => is.product_id === it.product_id);
                                                                    if (gIdx > -1) {
                                                                        setAssignQtys(prev => ({...prev, [gIdx]: 1}));
                                                                        handleAssignItem(gIdx, ui);
                                                                    }
                                                                }}>
                                                                    +
                                                                </Button>
                                                            </div>
                                                            <div className="text-end fw-bold" style={{width: '90px'}}>
                                                                {it.price.toLocaleString()} đ
                                                            </div>
                                                        </div>
                                                    ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="bg-light px-3 py-1 border-top d-flex justify-content-between align-items-center">
                                                <small className="text-muted fw-medium" style={{fontSize: '11px'}}>Trọng số: {u.percent}% / {u.items.length} món</small>
                                                <Button variant="outline-danger" size="sm" className="px-2 py-0 text-decoration-none d-flex align-items-center fw-bold rounded" style={{fontSize: '11px'}} onClick={() => handleDeleteUser(ui)}>
                                                    <span className="me-1">✖</span> Xóa Hóa Đơn Này
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Tab>
                    
                    <Tab eventKey="even" title="Chia Đều" className="p-4 bg-white">
                        <div className="w-50 mx-auto">
                            <Form.Group className="mb-4">
                                <Form.Label className="fw-bold fs-5 text-center w-100">Chia đều cho bao nhiêu người?</Form.Label>
                                <Form.Control type="number" min="2" max="20" size="lg" value={numPeople} onChange={handleNumPeopleChange} className="text-center fs-3 fw-bold text-primary" />
                            </Form.Group>
                            <Table bordered hover className="text-center shadow-sm">
                                <thead className="table-primary"><tr><th>Tên Người Trả</th><th>Số Tiền Phải Trả</th></tr></thead>
                                <tbody>
                                    {users.map((u, ui) => (
                                        <tr key={u.id}>
                                            <td className="align-middle">
                                                 <Form.Control className="fw-bold text-center border-0 shadow-none bg-transparent" value={u.name} onChange={e => {
                                                     let nu = [...users]; nu[ui].name = e.target.value; setUsers(nu);
                                                 }} />
                                            </td>
                                            <td className="text-danger fs-5 fw-bold align-middle">{u.amount.toLocaleString()} đ</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    </Tab>
                    
                    <Tab eventKey="percent" title="Định Mức Tùy Chỉnh (% / Số Tiền)" className="p-4 bg-white">
                        <Button variant="success" size="sm" onClick={handleAddUser} className="mb-3 shadow-sm d-flex align-items-center fw-bold">
                            <span className="me-1">+</span> Thêm Người Trả
                        </Button>
                        <Table bordered hover className="align-middle shadow-sm text-center">
                            <thead className="table-dark">
                                <tr>
                                    <th style={{width: '35%'}}>Tên Khách Hàng (Click để sửa)</th>
                                    <th style={{width: '20%'}}>Chiếm Tỷ Lệ (%)</th>
                                    <th style={{width: '35%'}}>Số Tiền Thực Tế (đ)</th>
                                    <th style={{width: '10%'}}>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u, i) => (
                                    <tr key={u.id}>
                                        <td>
                                            <Form.Control className="fw-bold fs-6" value={localEdits[`${i}_name`] !== undefined ? localEdits[`${i}_name`] : u.name} 
                                                onChange={e => setLocalEdits({...localEdits, [`${i}_name`]: e.target.value})}
                                                onBlur={e => {
                                                    let nu = [...users]; nu[i].name = e.target.value; setUsers(nu);
                                                    setLocalEdits(prev => { const n = {...prev}; delete n[`${i}_name`]; return n; });
                                                }}
                                                onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                                            />
                                        </td>
                                        <td>
                                            <div className="input-group">
                                                <Form.Control type="number" className="text-center fw-bold text-primary" step="0.1" 
                                                    value={localEdits[`${i}_percent`] !== undefined ? localEdits[`${i}_percent`] : u.percent} 
                                                    onChange={e => setLocalEdits({...localEdits, [`${i}_percent`]: e.target.value})}
                                                    onBlur={e => {
                                                        handlePercentChange(i, e.target.value);
                                                        setLocalEdits(prev => { const n = {...prev}; delete n[`${i}_percent`]; return n; });
                                                    }}
                                                    onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                                                />
                                                <span className="input-group-text bg-primary text-white">%</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="input-group">
                                                <Form.Control type="number" className="text-end text-danger fw-bold fs-5" 
                                                    value={localEdits[`${i}_amount`] !== undefined ? localEdits[`${i}_amount`] : u.amount} 
                                                    onChange={e => setLocalEdits({...localEdits, [`${i}_amount`]: e.target.value})}
                                                    onBlur={e => {
                                                        handleAmountChange(i, e.target.value);
                                                        setLocalEdits(prev => { const n = {...prev}; delete n[`${i}_amount`]; return n; });
                                                    }}
                                                    onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                                                />
                                                <span className="input-group-text bg-danger text-white fw-bold">VNĐ</span>
                                            </div>
                                        </td>
                                        <td>
                                            <Button variant="outline-danger" size="sm" onClick={() => handleDeleteUser(i)}>
                                                Xóa
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                        <div className="text-muted text-center mt-3 fst-italic">
                            Lưu ý: Mọi thay đổi % sẽ tự nhảy số tiền ngay lập tức. Tổng số tiền phải đúng 100% Bill.
                        </div>
                    </Tab>
                </Tabs>
                
                {/* STATUS PROGRESS BAR FOOTER */}
                <div className="bg-white p-2 border-top shadow-sm z-3 position-relative">
                    <div className="d-flex justify-content-between align-items-end mb-1">
                        <div style={{width: '60%'}}>
                            <div className="d-flex justify-content-between mb-1">
                                <span className="fw-bold" style={{fontSize: '13px'}}>Tiến độ phân bổ:</span>
                                <span className={`fw-bold ${isSumValid ? 'text-success' : 'text-danger'}`} style={{fontSize: '13px'}}>{Math.min(progressVal, 100).toFixed(1)}%</span>
                            </div>
                            <ProgressBar variant={isSumValid ? "success" : "danger"} now={progressVal} style={{height: '10px', borderRadius: '10px'}} />
                        </div>
                        <div className="text-end border p-1 px-2 rounded bg-light border-2">
                            <h6 className="text-muted mb-0 text-uppercase fw-bold" style={{fontSize: '10px'}}>Đã phân bổ</h6>
                            <h4 className={`mb-0 fw-bold ${!isSumValid ? 'text-danger' : 'text-success'}`}>{currentSum.toLocaleString()} VNĐ</h4>
                        </div>
                    </div>
                    {/* HINT ERRORS IF ANY */}
                    {!isSumValid && (
                        <div className={`mt-1 py-1 px-3 rounded fw-bold text-center border ${diff > 0 || (tab==='item'&&itemsState.some(i=>i.leftQty>0)) ? 'bg-warning bg-opacity-25 border-warning text-warning-emphasis' : 'bg-danger bg-opacity-25 border-danger text-danger'}`} style={{fontSize: '13px'}}>
                            {tab === 'item' && itemsState.some(i => i.leftQty > 0) 
                                ? `⚠️ VẪN CÒN MÓN CHƯA ĐƯỢC CHIA - BẠN CẦN PHÂN BỔ HẾT TỒN KHO!`
                                : diff > 0 
                                    ? `⚠️ CHƯA CHIA ĐỦ TIỀN - CÒN THIẾU ${diff.toLocaleString()} VNĐ` 
                                    : `❌ LỖI VƯỢT QUÁ BILL GỐC - ĐANG DƯ RA ${Math.abs(diff).toLocaleString()} VNĐ`
                            }
                        </div>
                    )}
                    {hasEmptyOrZeroUser && (
                        <div className="mt-1 py-1 px-3 rounded fw-bold text-center border bg-danger bg-opacity-10 border-danger text-danger" style={{fontSize: '13px'}}>
                            ❌ CÓ KHÁCH ĐANG BỊ TRỐNG TÊN HOẶC CHƯA CHIA TIỀN TRONG DANH SÁCH
                        </div>
                    )}
                </div>
            </Modal.Body>
            <Modal.Footer className="bg-light py-2">
                <Button variant="secondary" size="md" className="px-4 fw-bold" onClick={onHide} disabled={isSubmitting}>Hủy Bỏ</Button>
                <Button variant={isSumValid ? "success" : "secondary"} size="md" className="px-5 fw-bold d-flex align-items-center" disabled={!isSumValid || isSubmitting} onClick={handleSplit}>
                    {isSubmitting ? <Spinner size="sm" className="me-2"/> : null} 
                    Xác nhận chia & Thanh toán
                </Button>
            </Modal.Footer>
        </Modal>
    );
}
