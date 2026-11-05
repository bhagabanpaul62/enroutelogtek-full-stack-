import { ImageResponse } from 'next/og';

// The card shown when a page is shared (Open Graph and Twitter). Generated at build time.
export const alt = 'EnrouteLogtek: put every load out to bid';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Colours mirror the marketing tokens (tokens.css); ImageResponse needs literal values.
const paper = '#141210';
const ink = '#f2eee8';
const ink3 = '#aaa399';
const gold = '#fbbc0e';

export default function OpenGraphImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: 72,
                    background: paper,
                    color: ink,
                    fontFamily: 'sans-serif',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 32 }}>
                    <div style={{ width: 22, height: 22, background: gold }} />
                    EnrouteLogtek
                </div>
                <div style={{ fontSize: 96, lineHeight: 1, letterSpacing: -4, maxWidth: 820 }}>
                    Put every load out to bid.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 28, color: ink3 }}>
                    <span>Freight procurement for shippers, transporters, brokers and fleet owners</span>
                    <span style={{ color: gold }}>enroutelogtek.in</span>
                </div>
            </div>
        ),
        size,
    );
}
