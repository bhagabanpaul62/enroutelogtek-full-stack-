export const encodeCursor = (item) =>{
    const cursorData ={
        createAt :item.createAt,
        id: item.connectionId,
    }

    return Buffer
        .from(JSON.stringify(cursorData))
        .toString('base64url');
}

export const decodeCursor = (cursor) => {
    try {
        return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    } catch {
        throw new Error('Invalid cursor');
    }
};