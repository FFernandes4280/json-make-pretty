import React, { useState } from 'react';
import './JsonMakePretty.css';
import { formatJsonWithValidation } from './cJsonFormatter';

const JsonMakePretty = () => {
  const [inputJson, setInputJson] = useState('');
  const [outputJson, setOutputJson] = useState('');
  const [error, setError] = useState('');
  const [useCFormatter, setUseCFormatter] = useState(true);

  const prettifyJson = (jsonString) => {
    try {
      if (!jsonString.trim()) {
        setOutputJson('');
        setError('');
        return;
      }
      
      if (useCFormatter) {
        // Use the C-logic based formatter
        const result = formatJsonWithValidation(jsonString);
        
        if (result.success) {
          setOutputJson(result.result);
          setError('');
        } else {
          setError(result.error);
          setOutputJson('');
        }
      } else {
        // Use standard JavaScript formatter
        const parsed = JSON.parse(jsonString);
        const prettified = JSON.stringify(parsed, null, 2);
        setOutputJson(prettified);
        setError('');
      }
    } catch (err) {
      setError('Formatting error: ' + err.message);
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
  };

  const copyToClipboard = () => {
    if (outputJson) {
      navigator.clipboard.writeText(outputJson);
    }
  };

  const toggleFormatter = () => {
    setUseCFormatter(!useCFormatter);
    // Re-format with the new formatter if there's input
    if (inputJson.trim()) {
      prettifyJson(inputJson);
    }
  };

  return (
    <div className="json-make-pretty">
      <header className="header">
        <h1>JSON Make Pretty</h1>
        <div className="controls">
          <label className="formatter-toggle">
            <input
              type="checkbox"
              checked={useCFormatter}
              onChange={toggleFormatter}
            />
            Use C-Style Formatter ({useCFormatter ? 'ON' : 'OFF'})
          </label>
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
          <textarea
            value={inputJson}
            onChange={handleInputChange}
            placeholder="Paste your JSON here..."
            className="json-textarea input-textarea"
          />
        </div>
        
        <div className="output-section">
          <h3>Prettified JSON</h3>
          {error && <div className="error-message">{error}</div>}
          <textarea
            value={outputJson}
            readOnly
            placeholder="Prettified JSON will appear here..."
            className="json-textarea output-textarea"
          />
        </div>
      </div>
    </div>
  );
};

export default JsonMakePretty;