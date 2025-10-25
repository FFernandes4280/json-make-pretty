// JavaScript implementation of the C JSON formatter
// This follows the exact same logic as formatJson.c

const INDENT_STEP = 4;

export function formatJsonWithCLogic(inputJson) {
    if (!inputJson || typeof inputJson !== 'string') {
        return { success: false, error: 'Invalid input' };
    }

    try {
        let out = '';
        let indent = 0;
        let inString = false;
        let escaped = false;

        for (let i = 0; i < inputJson.length; i++) {
            const c = inputJson[i];

            if (inString) {
                out += c;
                if (escaped) {
                    escaped = false;
                } else if (c === '\\') {
                    escaped = true;
                } else if (c === '"') {
                    inString = false;
                }
                continue;
            }

            if (c === '"') {
                inString = true;
                out += c;
            } else if (c === '{' || c === '[') {
                out += c;
                out += '\n';
                indent++;
                out += ' '.repeat(indent * INDENT_STEP);
            } else if (c === '}' || c === ']') {
                out += '\n';
                indent--;
                if (indent < 0) indent = 0;
                out += ' '.repeat(indent * INDENT_STEP);
                out += c;
            } else if (c === ',') {
                out += c;
                out += '\n';
                out += ' '.repeat(indent * INDENT_STEP);
            } else if (c === ':') {
                out += c;
                out += ' ';
            } else if (c === ' ' || c === '\n' || c === '\t' || c === '\r') {
                // Skip whitespace
                continue;
            } else {
                out += c;
            }
        }

        return { success: true, result: out };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Alternative: If you want to validate JSON first, then format
export function formatJsonWithValidation(inputJson) {
    if (!inputJson || typeof inputJson !== 'string') {
        return { success: false, error: 'Invalid input' };
    }

    try {
        // First validate by parsing
        JSON.parse(inputJson);
        
        // Then format using C logic
        return formatJsonWithCLogic(inputJson);
    } catch (error) {
        return { success: false, error: 'Invalid JSON: ' + error.message };
    }
}