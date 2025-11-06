import React, { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import './JsonMakePretty.css';

const JsonMakePretty = () => {
  const [inputJson, setInputJson] = useState('');
  const [outputJson, setOutputJson] = useState('');
  const [error, setError] = useState('');
  const [selectedPath, setSelectedPath] = useState('');
  const [showPathPopup, setShowPathPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const outputEditorRef = useRef(null);

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

  const handleInputChange = (value) => {
    setInputJson(value || '');
    prettifyJson(value || '');
  };

  const clearAll = () => {
    setInputJson('');
    setOutputJson('');
    setError('');
    setShowPathPopup(false);
    setSelectedPath('');
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

  const handleOutputEditorMount = (editor) => {
    outputEditorRef.current = editor;
    
    // Add click listener to the editor
    editor.onMouseUp((e) => {
      const position = e.target.position;
      
      console.log('Click event:', e);
      console.log('Position:', position);
      console.log('Mouse event:', e.event);
      
      if (!position) {
        console.log('No position found');
        return;
      }
      
      const lineIndex = position.lineNumber - 1;
      
      // Get content directly from the editor model
      const model = editor.getModel();
      if (!model) {
        console.log('No model found');
        return;
      }
      
      const content = model.getValue();
      const lines = content.split('\n');
      
      console.log('Line index:', lineIndex);
      console.log('Total lines:', lines.length);
      
      if (lineIndex >= lines.length || lineIndex < 0) {
        console.log('Line index out of bounds');
        return;
      }
      
      const path = getJsonPath(lines, lineIndex);
      console.log('Generated path:', path);
      console.log('Clicked line content:', lines[lineIndex]);
      
      if (path) {
        setSelectedPath(path);
        setShowPathPopup(true);
        
        // Get the DOM node of the editor to calculate relative position
        const editorDomNode = editor.getDomNode();
        if (!editorDomNode) return;
        
        const editorRect = editorDomNode.getBoundingClientRect();
        
        // Use the actual mouse position relative to the editor
        const mouseX = e.event.posx || e.event.clientX;
        const mouseY = e.event.posy || e.event.clientY;
        
        // Calculate position relative to the editor container
        const relativeX = 60; // Fixed position after line numbers
        const relativeY = mouseY - editorRect.top;
        
        console.log('Editor rect:', editorRect);
        console.log('Mouse position:', { x: mouseX, y: mouseY });
        console.log('Tooltip position:', { x: relativeX, y: relativeY });
        
        setPopupPosition({
          x: relativeX,
          y: relativeY
        });
      } else {
        console.log('No path generated for this line');
        console.log('Line content:', lines[lineIndex]);
      }
    });
    
    // Hide tooltip on scroll
    editor.onDidScrollChange(() => {
      if (showPathPopup) {
        setShowPathPopup(false);
      }
    });
    
    // Hide tooltip on any content change
    editor.onDidChangeModelContent(() => {
      if (showPathPopup) {
        setShowPathPopup(false);
      }
    });
  };

  return (
    <div className="json-make-pretty">
      <header className="header">
        <h1>JSON Make Pretty</h1>
        <div className="controls">
          <button onClick={clearAll} className="btn btn-clear">
            Clear All
          </button>
        </div>
      </header>
      
      <div className="content">
        <div className="input-section">
          <h3>JSON Input</h3>
          <div className="monaco-editor-wrapper">
            <Editor
              height="100%"
              defaultLanguage="json"
              value={inputJson}
              onChange={handleInputChange}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'off',
              }}
            />
          </div>
        </div>
        
        <div className="output-section">
          <h3>Prettified JSON</h3>
          {error && <div className="error-message">{error}</div>}
          <div className="monaco-editor-wrapper" style={{ position: 'relative' }}>
            <Editor
              height="100%"
              defaultLanguage="json"
              value={outputJson}
              theme="vs-dark"
              onMount={handleOutputEditorMount}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'off',
                domReadOnly: true,
              }}
            />
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
        </div>
      </div>
    </div>
  );
};

export default JsonMakePretty;