export const fetchOrder = async (cartId, orderSource, tableNumber) => {
    const orderData = {
        cartId: cartId,
        orderSource: orderSource,
        tableNumber: tableNumber
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

export const fetchPayment = async (cartId) =>{
    const response = await fetch('/api/payment', {
        method: 'post',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cartId: cartId, bankCode: "" })
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