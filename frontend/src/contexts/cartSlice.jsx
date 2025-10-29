import { createApi } from "@reduxjs/toolkit/query/react";
import axiosInstance from "../api/axiosinstance";

const axiosBaseQuery =
  ({ baseUrl } = { baseUrl: "" }) =>
  async ({ url, method, data, params }) => {
    try {
      const result = await axiosInstance({ url: baseUrl + url, method, data, params });
      return { data: result.data };
    } catch (axiosError) {
      return {
        error: {
          status: axiosError.response?.status,
          data: axiosError.response?.data || axiosError.message,
        },
      };
    }
  };

export const cartSlice = createApi({
  reducerPath: "cartSlice",
  baseQuery: axiosBaseQuery({ baseUrl: "" }),
  tagTypes: ["Cart"],
  endpoints: (builder) => ({
    getCart: builder.query({
      query: () => ({ url: "cart/", method: "GET" }),
      transformResponse:(response)=>response.results,
      providesTags: ["Cart"],
    }),
    addToCart: builder.mutation({
        query: ({ product_variant, quantity }) => ({
          url: "cart/",
          method: "POST",
          data: { product_variant, quantity },  // ✅ Correct field name
        }),
        invalidatesTags: ["Cart"],
      }),
    updateCartItem: builder.mutation({
      query: ({ id, quantity }) => ({
        url: `cart/${id}/`,
        method: "PATCH",
        data: { quantity },
      }),
      invalidatesTags: ["Cart"],
    }),
    removeCartItem: builder.mutation({
      query: (id) => ({
        url: `cart/${id}/`,
        method: "DELETE",
      }),
      invalidatesTags: ["Cart"],
    }),
    mergeGuestCart:builder.mutation({
      query:(payload)=>({
        url:"cart/merge/",
        method:"POST",
        data:payload
      }),
      invalidatesTags:['Cart']
    }),
  }),
});

export const {
  useGetCartQuery,
  useAddToCartMutation,
  useUpdateCartItemMutation,
  useRemoveCartItemMutation,
  useMergeGuestCartMutation,
} = cartSlice;