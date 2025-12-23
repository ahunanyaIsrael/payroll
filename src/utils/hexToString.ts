export const hexToString = (hex: string): string => {
    try {
        // Remove any spaces or 0x prefix
        const cleanHex = hex.replace(/^0x/, '').replace(/\s/g, '');

        // Check if it's a valid hex string
        if (!/^[0-9a-fA-F]+$/.test(cleanHex) || cleanHex.length % 2 !== 0) {
            console.warn("Invalid hex string:", hex);
            return hex; // Return original if not valid hex
        }

        let str = '';
        for (let i = 0; i < cleanHex.length; i += 2) {
            const byte = parseInt(cleanHex.substr(i, 2), 16);
            if (byte >= 32 && byte <= 126) { // Printable ASCII range
                str += String.fromCharCode(byte);
            } else if (byte === 0) {
                // Null byte - skip or handle as needed
                str += '';
            } else {
                // Non-printable character - show as hex
                str += `\\x${cleanHex.substr(i, 2)}`;
            }
        }
        return str;
    } catch (error) {
        console.error("Error converting hex to string:", error, hex);
        return hex; // Return original on error
    }
};