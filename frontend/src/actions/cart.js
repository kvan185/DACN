export const fetchInitCart = async (accessToken) =>{
    
    const response = await fetch('/api/cart', {
        method: 'post',
        headers: {
            Authorization: `Bearer ${accessToken}`
        },
    });

    const data = await response.json();
    return data;
}

export const fetchAddProductToCart = async (accessToken, listItem) =>{
    
    const response = await fetch('/api/cart/add', {
        method: 'post',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ listItem: listItem })
    });

    const data = await response.json();
    return data;
}

export const fetchUpdateCartItem = async (accessToken, listItem) =>{

    const response = await fetch('/api/cart/update', {
        method: 'post',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'

        },
        body: JSON.stringify({ listItem: listItem })
    });

    const data = await response.json();
    return data;
}

export const fetchGetCart= (accessToken) =>{
    
    const response = fetch('/api/cart', {
        method: 'get',
        headers: {
            Authorization: `Bearer ${accessToken}`
        },
    });
    return response;
}

export const fetchDeleteCart= async (accessToken, cartItemId) =>{
    
    const response = await fetch(`/api/cart/${cartItemId}`, {
        method: 'delete',
        headers: {
            Authorization: `Bearer ${accessToken}`
        },
    });

    const data = await response.json();
    return data;
}