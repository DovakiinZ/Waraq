/**
 * Access the app-wide cart.
 *
 * Split out of CartContext.tsx so that file exports only a component — React
 * Fast Refresh warns otherwise, the same reason isLessonContentWithheld lives
 * apart from LessonLocked.
 */

import { useContext } from 'react';
import { CartContext, type CartValue } from '@/contexts/CartContext';

export function useCart(): CartValue {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
    return ctx;
}
