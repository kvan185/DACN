export const fetchOrder = async (cartId, orderSource, tableNumber, selectedItemIds) => {
    const orderData = {
        cartId: cartId,
        orderSource: orderSource,
        tableNumber: tableNumber,
        selectedItemIds: selectedItemIds
    };
    
    const response = await fetch('/api/order', {
        method: 'post',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
    });

    const data = await response.json();
    return data;
}

export const fetchPayment = async (cartId, selectedItemIds) =>{
    const response = await fetch('/api/payment', {
        method: 'post',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cartId: cartId, bankCode: "", selectedItemIds: selectedItemIds })
    });

    const data = await response.json();
    return data;
}

export const fetchUpdateStatusOrder = async (orderId, accessToken, status)=>{
    const response = await fetch(`/api/order/status`,{
        method: 'post',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderId: orderId, status: status})
    });
    return response;
}

export const fetchGetGuestOrdersByTable = async (tableNumber) => {
    const response = await fetch(`/api/order/guest/table/${tableNumber}`, {
        method: 'get',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    return data;
}

export const fetchPayGuestOrdersByTable = async (tableNumber) => {
    const response = await fetch(`/api/order/guest/table/${tableNumber}/payment`, {
        method: 'put',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    return data;
}

export const fetchGuestOrder = async (items, tableNumber, orderSource) => {
    const orderData = {
        items: items,
        tableNumber: tableNumber,
        typeOrder: "cash", 
        orderSource: orderSource
    };
    
    const response = await fetch('/api/order/guest', {
        method: 'post',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
    });

    const data = await response.json();
    return data;
}

export const fetchGuestPayment = async (items, tableNumber, orderSource) => {
    const response = await fetch('/api/payment/guest', {
        method: 'post',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items, tableNumber, orderSource, bankCode: "" })
    });
    const data = await response.json();
    return data;
}

export const fetchUpdateIsPayment = async (orderId, payment)=>{
    const response = await fetch(`/api/order/status/payment`,{
        method: 'post',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderId: orderId, isPayment: payment})
    });
    return response;
}