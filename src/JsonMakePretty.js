import React, { useState, useRef } from 'react';
import './JsonMakePretty.css';

const JsonMakePretty = () => {
  const [inputJson, setInputJson] = useState('');
  const [outputJson, setOutputJson] = useState('');
  const [error, setError] = useState('');
  const [selectedPath, setSelectedPath] = useState('');
  const [showPathPopup, setShowPathPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const outputRef = useRef(null);

  const prettifyJson = (jsonString) => {
    try {
      if (!jsonString.trim()) {
        setOutputJson('');
        setError('');
        return;
      }
      
      const parsed = JSON.parse(jsonString);
      const prettified = JSON.stringify(parsed, null, 2);
      setOutputJson(prettified);
      setError('');
    } catch (err) {
      setError('Invalid JSON: ' + err.message);
      setOutputJson('');
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputJson(value);
    prettifyJson(value);
  };

  const clearAll = () => {
    setInputJson('');
    setOutputJson('');
    setError('');
    setShowPathPopup(false);
    setSelectedPath('');
  };

  const copyToClipboard = () => {
    if (outputJson) {
      navigator.clipboard.writeText(outputJson);
    }
  };

  const copyPathToClipboard = () => {
    if (selectedPath) {
      navigator.clipboard.writeText(selectedPath);
    }
  };

  const getJsonPath = (lines, lineIndex) => {
    const stack = [];
    let arrayIndices = {}; // Track array indices by indentation level
    
    for (let i = 0; i <= lineIndex; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Skip completely empty lines
      if (!trimmedLine) {
        continue;
      }

      // Calculate indentation level
      const indent = line.search(/\S/);
      
      // Pop stack when going back to a lower indentation level
      while (stack.length > 0 && indent <= stack[stack.length - 1].indent) {
        const popped = stack.pop();
        // Clean up array indices at this level
        if (popped.arrayIndent !== undefined) {
          delete arrayIndices[popped.arrayIndent];
        }
      }

      // Check if this is a standalone array opener (less common in formatted JSON)
      if (trimmedLine === '[') {
        if (stack.length > 0 && !stack[stack.length - 1].opensArray) {
          stack[stack.length - 1].opensArray = true;
          stack[stack.length - 1].arrayIndent = indent;
          arrayIndices[indent] = -1; // Will be incremented to 0 on first {
        }
        continue;
      }

      // Check if this line starts an object inside an array
      if (trimmedLine === '{') {
        // Find if we're inside an array by checking parent indents
        for (let j = stack.length - 1; j >= 0; j--) {
          if (stack[j].opensArray && stack[j].arrayIndent < indent) {
            // Increment the array index at this level
            arrayIndices[stack[j].arrayIndent]++;
            // Add array element marker with current index
            stack.push({
              type: 'arrayElement',
              indent: indent,
              arrayIndex: arrayIndices[stack[j].arrayIndent],
              parentKey: stack[j].key
            });
            break;
          }
        }
        continue;
      }

      // Check if this is a closing brace
      if (trimmedLine === '}' || trimmedLine === '},' || trimmedLine === '],') {
        continue;
      }

      // Extract key from line (check if it opens an array on same line)
      const keyMatch = trimmedLine.match(/^"([^"]+)"\s*:\s*(.*)$/);
      if (keyMatch) {
        const key = keyMatch[1];
        const valueStart = keyMatch[2].trim();
        
        // Check if this key immediately opens an array
        const opensArrayNow = valueStart === '[' || valueStart.startsWith('[');
        
        stack.push({ 
          key, 
          indent,
          type: 'key',
          opensArray: opensArrayNow,
          arrayIndent: opensArrayNow ? indent : undefined
        });
        
        if (opensArrayNow) {
          arrayIndices[indent] = -1; // Will be incremented to 0 on first {
        }
      }
    }

    // Build the path with array indices
    let path = [];
    
    for (let i = 0; i < stack.length; i++) {
      const item = stack[i];
      
      if (item.type === 'arrayElement') {
        // Add the parent key with array index
        if (item.parentKey) {
          // Remove the last added key if it matches parent (to avoid duplication)
          if (path.length > 0 && path[path.length - 1].startsWith(item.parentKey)) {
            path.pop();
          }
          path.push(`${item.parentKey}[${item.arrayIndex}]`);
        }
      } else if (item.type === 'key') {
        path.push(item.key);
      }
    }
    
    return path.join('.');
  };

  const handleOutputClick = (e) => {
    // Find which line was clicked
    const clickedElement = e.target;
    const allLines = e.currentTarget.querySelectorAll('.json-line');
    
    let lineIndex = -1;
    let clickedLineElement = null;
    allLines.forEach((lineElement, index) => {
      if (lineElement === clickedElement || lineElement.contains(clickedElement)) {
        lineIndex = index;
        clickedLineElement = lineElement;
      }
    });

    if (lineIndex === -1) return;

    const lines = outputJson.split('\n');
    const path = getJsonPath(lines, lineIndex);
    
    if (path) {
      setSelectedPath(path);
      setShowPathPopup(true);
      
      // Position tooltip above the clicked line
      // Calculate the offset of the line within the container without considering scroll
      const lineHeight = 21; // line-height: 1.5 * 14px font-size
      const paddingTop = 15; // padding-top of .json-highlighted
      
      // The y position should be relative to the container's content, accounting for line index
      const yPosition = paddingTop + (lineIndex * lineHeight);
      
      setPopupPosition({
        x: 15, // Fixed at the left edge of the content (matches padding)
        y: yPosition
      });
    }
  };

  const handleScroll = (e) => {
    // Hide tooltip on scroll in output
    if (showPathPopup) {
      setShowPathPopup(false);
    }
  };

  const renderJsonWithLineNumbers = (text, isOutput = false) => {
    return (
      <div className="json-editor">
        <div className="json-content">
          {isOutput ? (
            text ? renderHighlightedJson(text) : <div className="json-highlighted"></div>
          ) : (
            <textarea
              value={text}
              onChange={handleInputChange}
              onScroll={handleScroll}
              placeholder="Paste your JSON here..."
              className="json-textarea-invisible"
              spellCheck="false"
            />
          )}
        </div>
      </div>
    );
  };

  const renderHighlightedJson = (jsonString) => {
    const lines = jsonString.split('\n');
    const highlighted = lines.map((line, index) => {
      const indent = line.search(/\S/);
      const level = Math.floor(indent / 2);
      const colorClass = `level-${level % 6}`;
      
      return (
        <div key={index} className={`json-line ${colorClass}`}>
          {line}
        </div>
      );
    });

    return (
      <div 
        className="json-highlighted" 
        onClick={handleOutputClick}
        onScroll={handleScroll}
        ref={outputRef}
      >
        {highlighted}
        {showPathPopup && (
          <div 
            className="path-tooltip" 
            style={{ 
              left: `${popupPosition.x}px`, 
              top: `${popupPosition.y}px` 
            }}
            onClick={copyPathToClipboard}
            title="Click to copy"
          >
            {selectedPath}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="json-make-pretty">
      <header className="header">
        <h1>JSON Make Pretty</h1>
        <div className="controls">
          <button onClick={clearAll} className="btn btn-clear">
            Clear All
          </button>
          <button 
            onClick={copyToClipboard} 
            className="btn btn-copy"
            disabled={!outputJson}
          >
            Copy Result
          </button>
        </div>
      </header>
      
      <div className="content">
        <div className="input-section">
          <h3>JSON Input</h3>
          {renderJsonWithLineNumbers(inputJson, false)}
        </div>
        
        <div className="output-section">
          <h3>Prettified JSON</h3>
          {error && <div className="error-message">{error}</div>}
          {renderJsonWithLineNumbers(outputJson, true)}
        </div>
      </div>
    </div>
  );
};

export default JsonMakePretty;