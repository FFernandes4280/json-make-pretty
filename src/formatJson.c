#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>

#define INDENT_STEP 4

// Export function for WebAssembly
#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#define EXPORT EMSCRIPTEN_KEEPALIVE
#else
#define EXPORT
#endif

/* Append helpers that grow the buffer as needed */
static void append_char(char **out, size_t *len, size_t *cap, char c) {
    if (*len + 1 >= *cap) {
        *cap = (*cap == 0) ? 256 : (*cap * 2);
        *out = realloc(*out, *cap);
        if (!*out) { exit(2); }
    }
    (*out)[(*len)++] = c;
    (*out)[*len] = '\0';
}

static void append_indent(char **out, size_t *len, size_t *cap, int level) {
    int spaces = level * INDENT_STEP;
    for (int i = 0; i < spaces; ++i) append_char(out, len, cap, ' ');
}

// Main formatting function that can be called from JavaScript
EXPORT char* format_json(const char* input_json) {
    if (!input_json) return NULL;
    
    char *out = NULL;
    size_t out_len = 0, out_cap = 0;
    int indent = 0;
    bool in_string = false;
    bool escaped = false;

    for (size_t i = 0; input_json[i] != '\0'; ++i) {
        char c = input_json[i];

        if (in_string) {
            append_char(&out, &out_len, &out_cap, c);
            if (escaped) {
                escaped = false;
            } else if (c == '\\') {
                escaped = true;
            } else if (c == '"') {
                in_string = false;
            }
            continue;
        }

        if (c == '"') {
            in_string = true;
            append_char(&out, &out_len, &out_cap, c);
        } else if (c == '{' || c == '[') {
            append_char(&out, &out_len, &out_cap, c);
            append_char(&out, &out_len, &out_cap, '\n');
            indent++;
            append_indent(&out, &out_len, &out_cap, indent);
        } else if (c == '}' || c == ']') {
            append_char(&out, &out_len, &out_cap, '\n');
            indent--;
            if (indent < 0) indent = 0;
            append_indent(&out, &out_len, &out_cap, indent);
            append_char(&out, &out_len, &out_cap, c);
        } else if (c == ',') {
            append_char(&out, &out_len, &out_cap, c);
            append_char(&out, &out_len, &out_cap, '\n');
            append_indent(&out, &out_len, &out_cap, indent);
        } else if (c == ':') {
            append_char(&out, &out_len, &out_cap, c);
            append_char(&out, &out_len, &out_cap, ' ');
        } else if (c == ' ' || c == '\n' || c == '\t' || c == '\r') {
            continue;
        } else {
            append_char(&out, &out_len, &out_cap, c);
        }
    }

    return out;
}

// Free memory function for WebAssembly
EXPORT void free_result(char* ptr) {
    if (ptr) free(ptr);
}

// Keep the original main function for standalone use
int main(int argc, char *argv[]) {
    const char *input_src = NULL;
    char *owned_input = NULL;

    if (argc > 1) {
        input_src = argv[1];
    } else {
        // Read from stdin (simplified version)
        size_t cap = 0, len = 0;
        char *buf = NULL;
        char tmp[4096];
        size_t r;
        while ((r = fread(tmp, 1, sizeof(tmp), stdin)) > 0) {
            if (len + r + 1 > cap) {
                size_t ncap = cap == 0 ? 4096 : cap * 2;
                while (len + r + 1 > ncap) ncap *= 2;
                char *t = realloc(buf, ncap);
                if (!t) { free(buf); exit(2); }
                buf = t;
                cap = ncap;
            }
            memcpy(buf + len, tmp, r);
            len += r;
        }
        if (!buf) {
            buf = malloc(1);
            buf[0] = '\0';
        } else {
            buf[len] = '\0';
        }
        owned_input = buf;
        input_src = owned_input;
    }

    char *result = format_json(input_src);
    if (result) {
        printf("%s\n", result);
        free(result);
    } else {
        printf("\n");
    }

    free(owned_input);
    return 0;
}