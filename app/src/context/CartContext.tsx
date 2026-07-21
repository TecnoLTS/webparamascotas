'use client'

// CartContext.tsx
import React, { createContext, useContext, useState, useReducer, useEffect } from 'react';
import { ProductType } from '@/type/ProductType';

interface CartItem extends ProductType {
    quantity: number
    selectedSize: string
    selectedColor: string
    availableStock?: number
}

interface CartState {
    cartArray: CartItem[]
}

type CartAction =
    | { type: 'ADD_TO_CART'; payload: ProductType }
    | { type: 'REMOVE_FROM_CART'; payload: string }
    | {
        type: 'UPDATE_CART'; payload: {
            itemId: string; quantity: number, selectedSize: string, selectedColor: string
        }
    }
    | { type: 'LOAD_CART'; payload: CartItem[] }
    | { type: 'CLEAR_CART' }

interface CartContextProps {
    cartState: CartState;
    isHydrated: boolean;
    addToCart: (item: ProductType) => void;
    removeFromCart: (itemId: string) => void;
    updateCart: (itemId: string, quantity: number, selectedSize: string, selectedColor: string) => void;
    clearCart: () => void;
}

const CartContext = createContext<CartContextProps | undefined>(undefined);
const emptyCartContext: CartContextProps = {
    cartState: { cartArray: [] },
    isHydrated: false,
    addToCart: () => {},
    removeFromCart: () => {},
    updateCart: () => {},
    clearCart: () => {},
}

const resolveAvailableStock = (item: Partial<ProductType> & { availableStock?: number }) => {
    const explicitAvailableStock = Number(item.availableStock ?? NaN)
    if (Number.isFinite(explicitAvailableStock)) {
        return Math.max(0, explicitAvailableStock)
    }

    const inventoryAvailable = Number(item.inventory?.available ?? NaN)
    if (Number.isFinite(inventoryAvailable)) {
        return Math.max(0, inventoryAvailable)
    }

    const quantity = Number(item.quantity ?? NaN)
    if (Number.isFinite(quantity)) {
        return Math.max(0, quantity)
    }

    return 0
}

const clampCartQuantity = (requestedQuantity: number, availableStock: number) => {
    const normalizedQuantity = Math.max(1, Math.floor(Number(requestedQuantity) || 1))
    if (availableStock <= 0) {
        return 0
    }
    return Math.min(normalizedQuantity, availableStock)
}

const cartReducer = (state: CartState, action: CartAction): CartState => {
    switch (action.type) {
        case 'ADD_TO_CART': {
            const availableStock = resolveAvailableStock(action.payload)
            const quantityToAdd = clampCartQuantity(
                Number(action.payload.quantityPurchase ?? action.payload.quantity ?? 1),
                availableStock,
            )
            if (quantityToAdd <= 0) {
                return state
            }
            const existed = state.cartArray.find(item => item.id === action.payload.id)
            if (existed) {
                const nextQuantity = clampCartQuantity(existed.quantity + quantityToAdd, existed.availableStock ?? availableStock)
                return {
                    ...state,
                    cartArray: state.cartArray.map(item =>
                        item.id === action.payload.id
                            ? { ...item, quantity: nextQuantity, availableStock: existed.availableStock ?? availableStock }
                            : item
                    ),
                };
            }
            const newItem: CartItem = {
                ...action.payload,
                quantity: quantityToAdd,
                selectedSize: '',
                selectedColor: '',
                availableStock,
            }
            return {
                ...state,
                cartArray: [...state.cartArray, newItem],
            };
        }
        case 'REMOVE_FROM_CART':
            return {
                ...state,
                cartArray: state.cartArray.filter((item) => item.id !== action.payload),
            };
        case 'UPDATE_CART':
            return {
                ...state,
                cartArray: state.cartArray.map((item) =>
                    item.id === action.payload.itemId
                        ? {
                            ...item,
                            quantity: clampCartQuantity(action.payload.quantity, item.availableStock ?? resolveAvailableStock(item)),
                            selectedSize: action.payload.selectedSize,
                            selectedColor: action.payload.selectedColor
                        }
                        : item
                ),
            };
        case 'LOAD_CART':
            return {
                ...state,
                cartArray: action.payload,
            };
        case 'CLEAR_CART':
            return {
                ...state,
                cartArray: [],
            };
        default:
            return state;
    }
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [cartState, dispatch] = useReducer(cartReducer, { cartArray: [] });
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        try {
            if (typeof window === 'undefined') return;
            const stored = localStorage.getItem('cart');
            if (stored) {
                const parsed = JSON.parse(stored) as CartItem[];
                const normalized = parsed.map((item) => ({
                    ...item,
                    availableStock: resolveAvailableStock(item),
                    quantity: clampCartQuantity(
                        Number(item.quantity ?? item.quantityPurchase ?? 1),
                        resolveAvailableStock(item),
                    ),
                    selectedSize: item.selectedSize ?? '',
                    selectedColor: item.selectedColor ?? '',
                }))
                dispatch({ type: 'LOAD_CART', payload: normalized });
            }
        } catch (error) {
            console.error('Error al cargar carrito', error);
        } finally {
            setHydrated(true);
        }
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        try {
            if (typeof window !== 'undefined') {
                localStorage.setItem('cart', JSON.stringify(cartState.cartArray));
            }
        } catch (error) {
            console.error('Error al guardar carrito', error);
        }
    }, [cartState.cartArray, hydrated]);

    const addToCart = (item: ProductType) => {
        dispatch({ type: 'ADD_TO_CART', payload: item });
    };

    const removeFromCart = (itemId: string) => {
        dispatch({ type: 'REMOVE_FROM_CART', payload: itemId });
    };

    const updateCart = (itemId: string, quantity: number, selectedSize: string, selectedColor: string) => {
        dispatch({ type: 'UPDATE_CART', payload: { itemId, quantity, selectedSize, selectedColor } });
    };

    const clearCart = () => {
        dispatch({ type: 'CLEAR_CART' });
    };

    return (
        <CartContext.Provider value={{ cartState, isHydrated: hydrated, addToCart, removeFromCart, updateCart, clearCart }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        if (typeof window === 'undefined') {
            return emptyCartContext;
        }
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
