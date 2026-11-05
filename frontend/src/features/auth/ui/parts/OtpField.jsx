'use client';

import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/shared/ui/primitives/input-otp';

// The six-digit code, one cell per digit. Controlled by react-hook-form's Controller.
export default function OtpField({ id, value, onChange, invalid = false }) {
    return (
        <InputOTP
            id={id}
            maxLength={6}
            value={value}
            onChange={onChange}
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            containerClassName="au-otp"
            aria-invalid={invalid || undefined}
        >
            <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot key={index} index={index} />
                ))}
            </InputOTPGroup>
        </InputOTP>
    );
}
