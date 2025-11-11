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
  const [indentSpaces, setIndentSpaces] = useState(2);
  const outputEditorRef = useRef(null);

  const prettifyJson = (jsonString, spaces = indentSpaces) => {
    try {
      if (!jsonString.trim()) {
        setOutputJson('');
        setError('');
        return;
      }
      
      const parsed = JSON.parse(jsonString);
      const prettified = JSON.stringify(parsed, null, spaces);
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

  const handleIndentChange = (e) => {
    const value = parseInt(e.target.value);
    setIndentSpaces(value);
    if (inputJson) {
      prettifyJson(inputJson, value);
    }
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
    let arrayIndices = {};
    
    for (let i = 0; i <= lineIndex; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        continue;
      }

      const indent = line.search(/\S/);
      
      while (stack.length > 0 && indent <= stack[stack.length - 1].indent) {
        const popped = stack.pop();
        if (popped.arrayIndent !== undefined) {
          delete arrayIndices[popped.arrayIndent];
        }
      }

      if (trimmedLine === '[') {
        if (stack.length > 0 && !stack[stack.length - 1].opensArray) {
          stack[stack.length - 1].opensArray = true;
          stack[stack.length - 1].arrayIndent = indent;
          arrayIndices[indent] = -1;
        }
        continue;
      }

      if (trimmedLine === '{') {
        for (let j = stack.length - 1; j >= 0; j--) {
          if (stack[j].opensArray && stack[j].arrayIndent < indent) {
            arrayIndices[stack[j].arrayIndent]++;
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

      if (trimmedLine === '}' || trimmedLine === '},' || trimmedLine === '],') {
        continue;
      }

      const keyMatch = trimmedLine.match(/^"([^"]+)"\s*:\s*(.*)$/);
      if (keyMatch) {
        const key = keyMatch[1];
        const valueStart = keyMatch[2].trim();
        
        const opensArrayNow = valueStart === '[' || valueStart.startsWith('[');
        
        stack.push({ 
          key, 
          indent,
          type: 'key',
          opensArray: opensArrayNow,
          arrayIndent: opensArrayNow ? indent : undefined
        });
        
        if (opensArrayNow) {
          arrayIndices[indent] = -1;
        }
      }
    }

    let path = [];
    
    for (let i = 0; i < stack.length; i++) {
      const item = stack[i];
      
      if (item.type === 'arrayElement') {
        if (item.parentKey) {
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
    
    editor.onMouseUp((e) => {
      const position = e.target.position;
      
      if (!position) {
        return;
      }
      
      const lineIndex = position.lineNumber - 1;
      
      const model = editor.getModel();
      if (!model) {
        return;
      }
      
      const content = model.getValue();
      const lines = content.split('\n');
      
      if (lineIndex >= lines.length || lineIndex < 0) {
        return;
      }
      
      const path = getJsonPath(lines, lineIndex);
      
      if (path) {
        setSelectedPath(path);
        setShowPathPopup(true);
        
        const editorDomNode = editor.getDomNode();
        if (!editorDomNode) return;
        
        const editorRect = editorDomNode.getBoundingClientRect();
        
        // const mouseX = e.event.posx || e.event.clientX;
        const mouseY = e.event.posy || e.event.clientY;
        
        const relativeX = 60;
        const relativeY = mouseY - editorRect.top;
        
        setPopupPosition({
          x: relativeX,
          y: relativeY
        });
      }
    });
    
    editor.onDidScrollChange(() => {
      if (showPathPopup) {
        setShowPathPopup(false);
      }
    });
    
    editor.onDidChangeModelContent(() => {
      if (showPathPopup) {
        setShowPathPopup(false);
      }
    });
  };

  return (
    <div className="json-make-pretty">
      <div className="controls-bar">
        <div className="section-label">JSON Input</div>
        <div className="indent-control">
          <label htmlFor="indent-spaces">Indent:</label>
          <select
            id="indent-spaces"
            value={indentSpaces}
            onChange={handleIndentChange}
            className="indent-select"
          >
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
            <option value={6}>6 spaces</option>
            <option value={8}>8 spaces</option>
          </select>
        </div>
        <div className="section-label">Prettified JSON</div>
      </div>
      
      <button onClick={clearAll} className="btn-clear-floating" title="Clear All">
        ×
      </button>
      
      <div className="content">
        <div className="input-section">
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