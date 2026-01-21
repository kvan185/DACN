const initialState = {
    user:{},
    isCart: false,
    categoryId: '', 
    cart: null,
    cartItems: [],
    isToast: false
};

const userReducer = (state = initialState, action) =>{
    switch (action.type){
        case "SET_USER":
            return {...state, user: action.payload}
        case "VISIBILITY_CART":
            return {...state, isCart: action.payload}
        case "GET_CATEGORY_ID":
            return {...state, categoryId: action.payload}
        case "SET_CART":
            return {...state, cart: action.payload}
        case "SET_CART_ITEMS":
            return {...state, cartItems: action.payload}
        case "SET_DISPLAY_TOAST":
            return {...state, isToast: action.payload}
        default:
            return state;
    }
}

export default userReducer;
