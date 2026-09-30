/**
 * The cart, lifted out of the marketplace page.
 *
 * It used to be `useState` inside StudentMarketplace, which meant:
 *   • no cart button anywhere else in the app — you could add something and
 *     then have no way back to it except by finding the marketplace again;
 *   • a guest browsing the PUBLIC marketplace had no cart at all, so the only
 *     way to express interest was to leave and sign up, losing the course they
 *     were looking at.
 *
 * Now it is app-wide and survives a reload, a sign-in and a sign-out, because
 * it is keyed to the browser rather than the session. A guest can fill a cart,
 * register, and find it still there.
 *
 * Storage key follows the project convention of `ayman-academy-*` for
 * persisted browser keys — renaming it would empty every existing cart, which
 * is the same reason `ayman-academy-auth` was never renamed in the rebrand.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const CART_STORAGE_KEY = 'ayman-academy-cart';

function readCart(): string[] {
    try {
        const raw = localStorage.getItem(CART_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        // Defend against a hand-edited or half-written value; a broken cart
        // must not take the whole app down on boot.
        return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
    } catch {
        return [];
    }
}

export interface CartValue {
    items: string[];
    count: number;
    add: (subjectId: string) => void;
    remove: (subjectId: string) => void;
    toggle: (subjectId: string) => void;
    has: (subjectId: string) => boolean;
    clear: () => void;
}

export const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<string[]>(readCart);

    useEffect(() => {
        try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
        } catch {
            // A full or blocked localStorage must not break checkout; the cart
            // simply does not survive the reload.
        }
    }, [items]);

    // Keep two open tabs in step — a student comparing courses in a second tab
    // should not lose what they added in the first.
    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key === CART_STORAGE_KEY) setItems(readCart());
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    const add = useCallback((id: string) => {
        setItems((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }, []);
    const remove = useCallback((id: string) => {
        setItems((prev) => prev.filter((x) => x !== id));
    }, []);
    const toggle = useCallback((id: string) => {
        setItems((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    }, []);
    const has = useCallback((id: string) => items.includes(id), [items]);
    const clear = useCallback(() => setItems([]), []);

    const value = useMemo<CartValue>(
        () => ({ items, count: items.length, add, remove, toggle, has, clear }),
        [items, add, remove, toggle, has, clear]
    );

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
