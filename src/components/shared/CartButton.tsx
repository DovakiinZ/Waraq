/**
 * The cart, reachable from anywhere.
 *
 * Previously there was no way to see a cart outside the marketplace page, so
 * "added to cart" was a dead end. This sits in the public header and the
 * student shell.
 *
 * A guest gets the same button: their cart is kept in the browser, so they can
 * fill it, register, and find it intact. Sending them to /login with the cart
 * silently dropped was the behaviour worth removing.
 */

import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';

import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface CartButtonProps {
    className?: string;
    /** The arcade header colours its icon buttons with inline styles because
     *  the tokens are CSS variables; pass them straight through. */
    style?: CSSProperties;
    /** Match the surrounding chrome: the arcade header is square, the student
     *  shell is rounded. */
    square?: boolean;
}

export function CartButton({ className, square = false, style }: CartButtonProps) {
    const { count } = useCart();
    const { isAuthenticated } = useAuth();
    const { t } = useLanguage();

    // Both land on a marketplace, which is where the cart bar is rendered.
    // A guest keeps the public one; their cart travels with them into the
    // student marketplace after they sign in, because it lives in the browser.
    const href = isAuthenticated ? '/student/marketplace' : '/marketplace';

    return (
        <Link
            to={href}
            aria-label={
                count > 0
                    ? t(`السلة، ${count} مادة`, `Cart, ${count} item${count === 1 ? '' : 's'}`)
                    : t('السلة فارغة', 'Cart is empty')
            }
            style={style}
            className={cn(
                'relative inline-flex items-center justify-center w-9 h-9 transition-colors',
                square ? 'border-2' : 'rounded-md hover:bg-muted',
                className
            )}
        >
            <ShoppingCart className="w-[18px] h-[18px]" />
            {count > 0 && (
                <span
                    aria-hidden="true"
                    className={cn(
                        'absolute -top-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center',
                        'text-[10px] font-bold leading-none',
                        'bg-brand-green text-white',
                        square ? '' : 'rounded-full',
                        // Logical property so the badge flips with direction
                        // instead of sitting under the RTL sidebar.
                        '-end-1.5'
                    )}
                >
                    {count > 9 ? '9+' : count}
                </span>
            )}
        </Link>
    );
}
