#!/bin/bash

# Define the target file
TARGET_FILE="supabase_function.ts"

echo "Applying strict HTML and Prompt Leakage sanitizers to $TARGET_FILE..."

# Create the new TypeScript content for the helper functions
cat << 'EOF' > strict_formatters.ts
// ============================================================================
// ROBUST CLEANING & PARSING UTILITIES
// ============================================================================

/**
 * deeply cleans HTML, Markdown, and System Prompt Leakage from values
 */
function sanitizeResponseContent(obj: any): any {
  if (typeof obj === 'string') {
    let text = obj;

    // 1. Structure Preservation: Convert HTML blocks to Newlines
    text = text
      .replace(/<\/p>\s*<p>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/div>\s*<div/gi, '\n')
      .replace(/<\/li>\s*<li/gi, '\n');

    // 2. Strip HTML Tags completely
    text = text.replace(/<[^>]+>/g, '');

    // 3. Decode HTML Entities
    text = text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&nbsp;/g, ' ');

    // 4. Remove System Prompt Leakage (The "Titled..." instructions)
    const leakagePatterns = [
      /^Titled technical section.*?(?=\w)/i,
      /^Titled accessible section.*?(?=\w)/i,
      /^Titled section.*?(?=\w)/i,
      /^This section contains.*?(?=\w)/i,
      /^JSON output:?/i,
      /^Output format:?/i
    ];
    leakagePatterns.forEach(regex => {
      text = text.replace(regex, '');
    });

    // 5. Clean Markdown (Headers, Bold, Italic)
    text = text
      .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
      .replace(/__(.+?)__/g, '$1')     // Underline
      .replace(/^\s*#+\s*/gm, '')      // Headers
      .replace(/`(.+?)`/g, '$1')       // Inline code
      .replace(/^\s*[-*]\s+/gm, '')    // List bullets (convert to plain text lines)
      .trim();

    // 6. Fix excessive newlines
    text = text.replace(/\n{3,}/g, '\n\n');

    return text;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeResponseContent);
  }
  
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = sanitizeResponseContent(obj[key]);
    }
    return result;
  }
  
  return obj;
}

// Alias for backward compatibility if needed, pointing to the robust version
const stripMarkdownFromValues = sanitizeResponseContent;

function cleanAndParseJSON(text: string, fallbackField?: string): any {
  if (!text) return fallbackField ? { [fallbackField]: "" } : {};

  // 1. Aggressive pre-cleaning of the raw string
  let cleaned = text.trim();
  
  // Remove markdown code block markers
  cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/i, "");
  
  // Find the JSON object
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  } else if (!fallbackField) {
    // Attempt to salvage if it's just a raw string that got passed
    // If it looks like HTML or raw text without braces
    if (text.includes('<div') || text.includes('Titled')) {
       // Run sanitizer on the raw text and return as fallback
       return { 
         error: "Invalid JSON", 
         content: sanitizeResponseContent(text) 
       };
    }
  }

  // 2. Fix Common LLM JSON Errors using Regex
  
  // Fix: Trailing commas
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
  
  // Fix: Unescaped newlines in values (heuristic)
  cleaned = cleaned.replace(/("[\s\S]*?")/g, (match) => {
    return match.replace(/\n/g, "\\n").replace(/\r/g, "");
  });

  // Fix: Comments
  cleaned = cleaned.replace(/^\s*\/\/.*$/gm, "");

  // 3. Attempt Parsing
  const attempts = [
    // Attempt 1: Parsed Cleaned
    () => JSON.parse(cleaned),
    
    // Attempt 2: Fix single quotes -> double quotes
    () => {
      const fixed = cleaned
        .replace(/'\s*:\s*'/g, '": "')
        .replace(/'\s*:\s*"/g, '": "')
        .replace(/"\s*:\s*'/g, '": "')
        .replace(/{\s*'/g, '{"')
        .replace(/'\s*}/g, '"}')
        .replace(/,\s*'/g, ',"');
      return JSON.parse(fixed);
    },
    
    // Attempt 3: Balance Braces (Simple Stack)
    () => {
      let open = 0;
      for (const char of cleaned) if (char === '{') open++; else if (char === '}') open--;
      return JSON.parse(cleaned + '}'.repeat(Math.max(0, open)));
    }
  ];

  for (let i = 0; i < attempts.length; i++) {
    try {
      const result = attempts[i]();
      // CRITICAL: Apply the sanitizer to the parsed object
      return sanitizeResponseContent(result);
    } catch (e) {
      // Continue to next attempt
    }
  }
  
  // Fallback
  if (fallbackField) {
    return { [fallbackField]: sanitizeResponseContent(text) };
  }
  
  return { 
    error: "Parse failed", 
    message: "Could not repair JSON", 
    raw_preview: cleaned.substring(0, 100) 
  };
}

function verifyAndParseJSON(text: string, requiredKeys: string[]): any {
  try {
    const parsed = cleanAndParseJSON(text);

    // If parsing failed (returned error object), throw
    if (parsed.error && parsed.message) {
      throw new Error(parsed.message);
    }

    for (const key of requiredKeys) {
      if (!(key in parsed)) {
        throw new ValidationError(
          `Missing required key '${key}' in response.`,
          { requiredKey: key, availableKeys: Object.keys(parsed) }
        );
      }
    }

    return parsed;
  } catch (error) {
    throw new AppError(
      `Failed to parse or verify API response: ${error.message}`,
      500,
      "PARSE_ERROR",
      { originalText: text.slice(0, 500) }
    );
  }
}
EOF

# Strategy: Replace the entire block of formatting functions in server.ts
# We target the functions: fetchWithRetries (end point for replacement start), verifyAndParseJSON, stripMarkdownFromValues, cleanAndParseJSON
# And stop before createSuccessResponse

# Find Start Line (After fetchWithRetries, start of verifyAndParseJSON)
START_LINE=$(grep -n "function verifyAndParseJSON(text: string" $TARGET_FILE | cut -d: -f1)

# Find End Line (Start of createSuccessResponse)
END_LINE=$(grep -n "function createSuccessResponse" $TARGET_FILE | cut -d: -f1)

if [ -z "$START_LINE" ] || [ -z "$END_LINE" ]; then
    echo "Error: Could not locate function block boundaries."
    exit 1
fi

# Create a temporary file
# 1. Head of file up to START_LINE - 1
head -n $((START_LINE - 1)) $TARGET_FILE > "${TARGET_FILE}.new"

# 2. Insert new formatters
cat strict_formatters.ts >> "${TARGET_FILE}.new"

# 3. Tail of file from END_LINE
tail -n +$END_LINE $TARGET_FILE >> "${TARGET_FILE}.new"

# Move new file to target
mv "${TARGET_FILE}.new" $TARGET_FILE
rm strict_formatters.ts

echo "Formatter update complete. strict_formatters injected."


chmod +x patch_formatter_fix.sh
./patch_formatter_fix.sh