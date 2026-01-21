export const setUser = (user) => {
  return {
    type: "SET_USER",
    payload: user
  };
};

export const visibilityCart= (isCart) => {
  return {
    type: "VISIBILITY_CART",
    payload: isCart
  };
};

export const getCategoryId = (categoryId) => {
  return {
    type: "GET_CATEGORY_ID",
    payload: categoryId.toString()
  };
};

export const setCartStore = (cart) => {
  return {
    type: "SET_CART",
    payload: cart
  };
};

export const setCartItems = (cartItems) => {
  return {
    type: "SET_CART_ITEMS",
    payload: cartItems
  };
};

export const setDisplayToast = (isToast) => {
  return {
    type: "SET_DISPLAY_TOAST",
    payload: isToast
  };
};