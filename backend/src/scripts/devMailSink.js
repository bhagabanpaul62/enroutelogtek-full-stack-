/**
 * Dev mail sink: a tiny SMTP server that accepts every message and prints it, so login and
 * registration emails never leave the machine. `pnpm dev:mail`; set MAIL_SINK_PORT to change
 * the port (default 2525) and point EMAIL_HOST=127.0.0.1 / EMAIL_PORT at it.
 * shortcut: plain SMTP only (no TLS, no AUTH extension needed by nodemailer when unsecured).
 */
import net from 'node:net';

const port = Number(process.env.MAIL_SINK_PORT || 2525);

const server = net.createServer((socket) => {
    let inData = false;
    let body = '';
    let buffer = '';
    const reply = (text) => socket.write(`${text}\r\n`);

    reply('220 dev-mail-sink ready');
    socket.on('data', (chunk) => {
        buffer += chunk.toString('utf8');
        let index;
        while ((index = buffer.indexOf('\r\n')) !== -1) {
            const line = buffer.slice(0, index);
            buffer = buffer.slice(index + 2);
            if (inData) {
                if (line === '.') {
                    inData = false;
                    console.log(`\n[MAIL]\n${body}\n[/MAIL]\n`);
                    body = '';
                    reply('250 queued');
                } else {
                    body += `${line.startsWith('..') ? line.slice(1) : line}\n`;
                }
                continue;
            }
            const command = line.slice(0, 4).toUpperCase();
            if (command === 'EHLO') reply('250-dev-mail-sink\r\n250 8BITMIME');
            else if (command === 'DATA') {
                inData = true;
                reply('354 end with <CRLF>.<CRLF>');
            } else if (command === 'QUIT') {
                reply('221 bye');
                socket.end();
            } else reply('250 ok'); // HELO, MAIL, RCPT, RSET, NOOP, AUTH-less anything else
        }
    });
    socket.on('error', () => {});
});

server.listen(port, '127.0.0.1', () => console.log(`Dev mail sink listening on 127.0.0.1:${port}`));
