'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// A password field with a show/hide toggle. `ref` comes from react-hook-form's register().
export default function PasswordInput({ ref, className = '', ...props }) {
    const [shown, setShown] = useState(false);
    return (
        <div className="au-password">
            <input
                ref={ref}
                type={shown ? 'text' : 'password'}
                className={`au-input ${className}`}
                {...props}
            />
            <button
                type="button"
                className="au-password__toggle"
                aria-pressed={shown}
                aria-label={shown ? 'Hide password' : 'Show password'}
                onClick={() => setShown((value) => !value)}
            >
                {shown ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
        </div>
    );
}
