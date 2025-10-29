import axiosInstance from "../api/axiosinstance";

export async function fetchGuestCartDetails(guestCart) {
  try {
    const response = await axiosInstance.post("/guest-cart/details/", {
      cart: guestCart,
    });
    return response.data; // Array of product variant details with quantity
  } catch (error) {
    console.error("Error fetching guest cart details:", error);
    return [];
  }
}