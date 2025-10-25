# C-Style JSON Formatter Integration

## Overview

This React application now integrates your original C code (`formatJson.c`) logic for JSON prettification. You have two formatting options:

1. **C-Style Formatter** (Default) - Uses the exact logic from your `formatJson.c`
2. **JavaScript Standard Formatter** - Uses `JSON.parse()` and `JSON.stringify()`

## How It Works

### C-Style Formatter Logic
The JavaScript implementation (`cJsonFormatter.js`) follows the exact same algorithm as your C code:

- **Indentation**: 4 spaces per level (just like your `INDENT_STEP = 4`)
- **String handling**: Properly handles escaped characters and quotes
- **Bracket formatting**: Adds newlines and indentation for `{`, `}`, `[`, `]`
- **Comma handling**: Adds newlines after commas with proper indentation
- **Colon handling**: Adds a space after colons
- **Whitespace**: Removes unnecessary whitespace

### Key Features

1. **Toggle Switch**: You can switch between C-style and JavaScript formatting
2. **Real-time Processing**: Formats JSON as you type
3. **Error Handling**: Shows clear error messages for invalid JSON
4. **Webpack Integration**: The formatter is bundled with your React app

## Build Process

When you run `npm run build`, the process:

1. Copies your original `formatJson.c` to the `public/` folder
2. Copies the compiled `formatJson` executable to the `public/` folder
3. Bundles the JavaScript version with webpack
4. Creates a production build with all files included

## Files Structure

```
json-make-pretty/
├── src/
│   ├── formatJson.c          # Modified C code (WASM-ready)
│   ├── cJsonFormatter.js     # JavaScript implementation of C logic
│   ├── JsonMakePretty.js     # Main React component
│   └── testFormatter.js      # Test cases
├── public/
│   ├── formatJson.c          # Original C source (copied during build)
│   └── formatJson            # Compiled executable (copied during build)
└── package.json              # Updated with custom build script
```

## Testing the Formatters

You can test both formatters with complex JSON like your original example:

```javascript
const complexJson = {
    "openFormInCaseOfError": false,
    "_creationUser": {
        "_id": "000000000002000000000001",
        "_classId": "000000000000000000000002"
    },
    "readUsers": [
        {"_id": "68c96c80ad21fc0c04feb793"},
        {"_id": "68f66b14f9405e0fb2248466"}
    ]
};
```

## Differences Between Formatters

- **C-Style**: More compact, follows your original algorithm exactly
- **JavaScript Standard**: Uses JSON.stringify with 2-space indentation, more verbose

## Future WebAssembly Integration

The `formatJson.c` in the `src/` folder is prepared for WebAssembly compilation with:
- `EMSCRIPTEN_KEEPALIVE` exports
- Memory management functions
- Browser-compatible interface

To compile to WebAssembly later:
```bash
emcc src/formatJson.c -o src/formatJson.wasm -s EXPORTED_FUNCTIONS="['_format_json','_free_result']"
```